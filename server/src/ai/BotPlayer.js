"use strict";
const PlayerTracker = require("../PlayerTracker");
const Vector = require("../modules/Vec2");

class BotPlayer extends PlayerTracker {
    constructor(gameServer, socket) {
        super(gameServer, socket);
        this.isBot = true;
        this.splitCooldown = 0;
        this.thinkCooldown = this.randomInt(3, 6);
        this.pursuitTicks = 0;
        this.pursuitTarget = null;
        this.pendingAction = null;
        this.buddyTarget = null;
        this.buddyRefreshCooldown = this.randomInt(22, 48);
        this.abilityDecisionCooldown = this.randomInt(10, 20);
        this.ejectDecisionCooldown = this.randomInt(14, 34);
        this.wanderCooldown = 0;
        this.wanderTarget = null;
        this.sessionTicksLeft = this.randomInt(25 * 90, 25 * 240);
        this.massReliefCooldown = this.randomInt(12, 28);
        this.logoutCooldown = this.randomInt(25 * 12, 25 * 40);
        this.personality = {
            aggression: this.randomRange(0.62, 0.96),
            caution: this.randomRange(0.26, 0.64),
            teamwork: this.randomRange(0.52, 0.96),
            abilityUse: this.randomRange(0.4, 0.88),
            persistence: this.randomRange(0.62, 0.95),
            aimJitter: this.randomRange(0.02, 0.07)
        };
    }
    randomRange(min, max) {
        return min + Math.random() * (max - min);
    }
    randomInt(min, max) {
        return Math.floor(this.randomRange(min, max + 1));
    }
    chance(probability) {
        return Math.random() < Math.max(0, Math.min(1, probability));
    }
    tickDown(key, amount) {
        if (!this[key]) return;
        this[key] -= amount || 1;
        if (this[key] < 0) this[key] = 0;
    }
    getLargest(list) {
        if (!list.length) return null;
        let sorted = list.valueOf();
        sorted.sort((a, b) => b._size - a._size);
        return sorted[0];
    }
    getLargestForOwner(owner) {
        return owner && owner.cells && owner.cells.length ? this.getLargest(owner.cells) : null;
    }
    getTotalMass() {
        let total = 0;
        for (let i = 0; i < this.cells.length; i++) {
            let cell = this.cells[i];
            if (cell && !cell.isRemoved) total += cell._mass || 0;
        }
        return total;
    }
    isNodeUsable(node) {
        return !!(node && !node.isRemoved && node.position);
    }
    isOwnerUsable(owner) {
        return !!(owner && !owner.isRemoved && owner.cells && owner.cells.length);
    }
    getDistance(a, b) {
        let dx = a.x - b.x,
            dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    setMouseTowardPoint(cell, point, jitterScale) {
        if (!cell || !point) return;
        let dx = point.x - cell.position.x,
            dy = point.y - cell.position.y,
            dist = Math.sqrt(dx * dx + dy * dy),
            jitter = Math.max(4, cell._size * (jitterScale != null ? jitterScale : this.personality.aimJitter));
        if (dist > 0) {
            dx /= dist;
            dy /= dist;
        } else {
            dx = 0;
            dy = -1;
        }
        this.mouse = {
            x: point.x + (Math.random() * 2 - 1) * jitter,
            y: point.y + (Math.random() * 2 - 1) * jitter
        };
    }
    setMouseByVector(cell, vector) {
        if (!cell) return;
        let length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (!isFinite(length) || length < 0.001) return this.setWanderTarget(cell);
        let distance = this.viewBox && this.viewBox.halfWidth ? this.viewBox.halfWidth * this.randomRange(0.45, 0.7) : 420;
        this.mouse = {
            x: cell.position.x + vector.x / length * distance,
            y: cell.position.y + vector.y / length * distance
        };
    }
    setWanderTarget(cell) {
        if (!cell) return;
        if (this.wanderTarget && this.wanderCooldown > 0) {
            this.mouse = this.wanderTarget;
            return;
        }
        let angle = Math.random() * Math.PI * 2,
            radius = this.viewBox && this.viewBox.halfWidth ? this.viewBox.halfWidth * this.randomRange(0.18, 0.35) : 180;
        this.wanderTarget = {
            x: cell.position.x + Math.sin(angle) * radius,
            y: cell.position.y + Math.cos(angle) * radius
        };
        this.wanderCooldown = this.randomInt(12, 28);
        this.mouse = this.wanderTarget;
    }
    queueAction(type, target, delay, priority) {
        let executeAt = this.gameServer.tickCount + Math.max(1, delay | 0);
        if (this.pendingAction && this.pendingAction.priority > priority) return false;
        this.pendingAction = {
            type: type,
            target: target || null,
            priority: priority || 1,
            executeAt: executeAt,
            cancelAt: executeAt + 24
        };
        return true;
    }
    refreshBuddyTarget(cell) {
        if (this.personality.teamwork < 0.42) {
            this.buddyTarget = null;
            return;
        }
        if (this.buddyTarget && this.isOwnerUsable(this.buddyTarget) && this.buddyRefreshCooldown > 0) return;
        this.buddyTarget = null;
        this.buddyRefreshCooldown = this.randomInt(22, 54);
        let bestOwner = null,
            bestScore = 0,
            seen = Object.create(null);
        for (let i = 0; i < this.viewNodes.length; i++) {
            let node = this.viewNodes[i],
                owner = node && node.owner;
            if (!node || node.cellType !== 0 || !owner || owner === this || !owner.isBot || !this.isOwnerUsable(owner)) continue;
            if (seen[owner.pID]) continue;
            seen[owner.pID] = true;
            let buddyCell = this.getLargestForOwner(owner);
            if (!buddyCell) continue;
            let dist = this.getDistance(cell.position, buddyCell.position),
                ratio = buddyCell._size / Math.max(cell._size, 1);
            if (dist > (this.viewBox && this.viewBox.halfWidth ? this.viewBox.halfWidth * 0.8 : 520)) continue;
            if (ratio < 0.55 || ratio > 2.2) continue;
            let score = (1.55 - Math.abs(1 - ratio)) + (1 / Math.max(dist / 220, 1)) + owner.cells.length * 0.045;
            if (score > bestScore) {
                bestScore = score;
                bestOwner = owner;
            }
        }
        this.buddyTarget = bestOwner;
    }
    scanEnvironment(cell) {
        let result = new Vector(0, 0),
            bestPrey = null,
            bestThreat = null,
            bestFood = null,
            bestBuddy = null;
        for (let i = 0; i < this.viewNodes.length; i++) {
            let node = this.viewNodes[i];
            if (!node || node.owner === this) continue;
            let dx = node.position.x - cell.position.x,
                dy = node.position.y - cell.position.y,
                dist = Math.sqrt(dx * dx + dy * dy);
            if (!isFinite(dist) || dist < 1) dist = 1;
            let dir = new Vector(dx / dist, dy / dist);
            if (node.cellType === 0) {
                let owner = node.owner,
                    isBuddy = !!(owner && owner === this.buddyTarget && this.isOwnerUsable(owner)),
                    ownerProtected = owner ? this.gameServer.isProtectedFromPlayerEat(owner) : false;
                if (isBuddy) {
                    let buddyScore = 1 / Math.max(dist / 220, 1);
                    if (!bestBuddy || buddyScore > bestBuddy.score) bestBuddy = {
                        owner: owner,
                        node: node,
                        dist: dist,
                        score: buddyScore
                    };
                    result.add2(dir, 0.16 * this.personality.teamwork / Math.max(dist / 170, 1));
                    continue;
                }
                if (this.gameServer.gameMode.isTeams && owner && cell.owner.team === owner.team) continue;
                if (!ownerProtected && cell._size > node._size * 1.32) {
                    let preyScore = node._size / Math.max(dist, 40);
                    if (!bestPrey || preyScore > bestPrey.score) bestPrey = {
                        node: node,
                        dist: dist,
                        score: preyScore
                    };
                    result.add2(dir, 1.18 * node._size / Math.max(dist * 43, 1));
                } else if (node._size > cell._size * (1.15 + this.personality.caution * 0.12)) {
                    let threatScore = node._size / Math.max(dist, 40);
                    if (!bestThreat || threatScore > bestThreat.score) bestThreat = {
                        node: node,
                        dist: dist,
                        score: threatScore
                    };
                    result.add2(dir, -Math.max(0.3, Math.log(node._size / Math.max(cell._size, 1)) * 0.9) / Math.max(dist / 110, 1));
                } else result.add2(dir, -0.02 / Math.max(dist / 120, 1));
                continue;
            }
            if (node.cellType === 1) {
                let foodScore = 1 / Math.max(dist / 90, 1);
                if (!bestFood || foodScore > bestFood.score) bestFood = {
                    node: node,
                    dist: dist,
                    score: foodScore
                };
                result.add2(dir, 0.22 / Math.max(dist / 85, 1));
                continue;
            }
            if (node.cellType === 2) {
                if (cell._size > node._size * 1.18 && this.cells.length < this.gameServer.config.playerMaxCells - 1) result.add2(dir, -0.18 / Math.max(dist / 90, 1));
                else result.add2(dir, 0.02 / Math.max(dist / 130, 1));
                continue;
            }
            if (node.cellType === 3) {
                if ((node.isFreezeOrb || node.isSpikeOrb) && node.owner !== this) result.add2(dir, -0.5 / Math.max(dist / 90, 1));
                else result.add2(dir, 0.12 / Math.max(dist / 95, 1));
            }
        }
        return {
            vector: result,
            prey: bestPrey,
            threat: bestThreat,
            food: bestFood,
            buddy: bestBuddy
        };
    }
    planDefensiveAction(cell, scan) {
        if (!scan.threat || this.abilityDecisionCooldown > 0) return;
        let threat = scan.threat.node,
            threatClose = scan.threat.dist < cell._size * this.randomRange(2.3, 3.3);
        if (!threatClose) return;
        if (!this.gameServer.isShieldActive(this) && !this.gameServer.isFrozen(this) && this.profileResources && this.profileResources.shields > 0 && this.chance(0.42 + this.personality.caution * 0.3)) {
            if (this.queueAction("shield", null, this.randomInt(1, 4), 4)) {
                this.abilityDecisionCooldown = this.randomInt(10, 22);
                return;
            }
        }
        if (this.profileResources && this.profileResources.freezes > 0 && this.chance(0.28 + this.personality.abilityUse * 0.3)) {
            if (this.queueAction("freeze", threat, this.randomInt(2, 5), 3)) {
                this.abilityDecisionCooldown = this.randomInt(10, 22);
                return;
            }
        }
        if (this.profileResources && this.profileResources.spikes > 0 && threat._size > this.gameServer.massToSize(40) && this.chance(0.22 + this.personality.abilityUse * 0.22)) {
            if (this.queueAction("spike", threat, this.randomInt(2, 5), 3)) this.abilityDecisionCooldown = this.randomInt(10, 22);
        }
    }
    planSupportAction(cell, scan) {
        if (!scan.buddy || this.ejectDecisionCooldown > 0 || this.personality.teamwork < 0.48) return;
        if (scan.threat && scan.threat.dist < cell._size * 3.1) return;
        let buddyCell = this.getLargestForOwner(scan.buddy.owner);
        if (!buddyCell || buddyCell._size < cell._size * 0.92 || cell._size < this.gameServer.massToSize(24)) return;
        let supportBias = this.getTotalMass() > 650 ? 0.18 : 0;
        if (this.chance(0.14 + supportBias + this.personality.teamwork * 0.24)) {
            if (this.queueAction("ejectBuddy", buddyCell, this.randomInt(1, 3), 1)) this.ejectDecisionCooldown = this.randomInt(10, 26);
        }
    }
    planMassReliefAction(cell, scan) {
        if (this.massReliefCooldown > 0 || this.ejectDecisionCooldown > 0) return false;
        let totalMass = this.getTotalMass(),
            heavyMass = totalMass > 620,
            overloadedMass = totalMass > 1300;
        if (!heavyMass) return false;
        if (scan.threat && scan.threat.dist < cell._size * 3.8) return false;
        let buddy = scan.buddy ? this.getLargestForOwner(scan.buddy.owner) : this.getLargestForOwner(this.buddyTarget);
        if (!buddy || buddy._size > cell._size * 1.35) return false;
        let shareChance = overloadedMass ? 0.72 : 0.4 + this.personality.teamwork * 0.18;
        if (this.chance(shareChance)) {
            if (this.queueAction("ejectBuddy", buddy, this.randomInt(1, 2), 3)) {
                this.massReliefCooldown = overloadedMass ? this.randomInt(3, 8) : this.randomInt(7, 16);
                this.ejectDecisionCooldown = overloadedMass ? this.randomInt(4, 10) : this.randomInt(8, 18);
                return true;
            }
        }
        return false;
    }
    canSplitAttack(cell, prey, dist) {
        if (!prey || !this.isNodeUsable(prey) || this.splitCooldown > 0 || this.gameServer.isShieldActive(this) || this.gameServer.isFrozen(this)) return false;
        if (this.cells.length >= this.gameServer.config.playerMaxCells) return false;
        if (this.gameServer.isProtectedFromPlayerEat(prey.owner)) return false;
        if (cell._size < this.gameServer.config.playerMinSplit) return false;
        if (cell._size <= prey._size * 1.38) return false;
        return this.splitKill(cell, prey, dist);
    }
    planOffensiveAction(cell, scan) {
        if (!scan.prey) return;
        let totalMass = this.getTotalMass();
        if (totalMass > 750 && scan.buddy && !scan.threat && this.chance(0.38 + this.personality.teamwork * 0.18)) return;
        if (scan.threat && scan.threat.score > scan.prey.score * (0.9 + this.personality.caution * 0.54)) return;
        let splitChance = 0.32 + this.personality.aggression * 0.28;
        if (totalMass > 950) splitChance *= 0.58;
        else if (totalMass > 650) splitChance *= 0.76;
        if (this.canSplitAttack(cell, scan.prey.node, scan.prey.dist) && this.chance(splitChance)) {
            if (this.queueAction("split", scan.prey.node, this.randomInt(4, 10), 2)) return;
        }
        if (this.abilityDecisionCooldown <= 0 && this.profileResources && this.profileResources.spikes > 0) {
            let prey = scan.prey.node;
            if (prey._size > cell._size * 0.76 && scan.prey.dist < cell._size * 4.7 && this.chance(0.16 + this.personality.abilityUse * 0.22)) {
                if (this.queueAction("spike", prey, this.randomInt(2, 5), 3)) this.abilityDecisionCooldown = this.randomInt(12, 24);
            }
        }
    }
    executePendingAction(cell) {
        if (!this.pendingAction) return;
        let action = this.pendingAction;
        if (action.cancelAt <= this.gameServer.tickCount) return void (this.pendingAction = null);
        if (action.target && !this.isNodeUsable(action.target)) return void (this.pendingAction = null);
        this.pendingAction = null;
        switch (action.type) {
            case "shield":
                this.pressE();
                return;
            case "freeze":
                if (action.target) this.setMouseTowardPoint(cell, action.target.position, 0.03);
                this.pressR();
                this.pursuitTarget = action.target || null;
                this.pursuitTicks = this.randomInt(5, 9);
                return;
            case "spike":
                if (action.target) this.setMouseTowardPoint(cell, action.target.position, 0.025);
                this.pressF();
                this.pursuitTarget = action.target || null;
                this.pursuitTicks = this.randomInt(5, 9);
                return;
            case "ejectBuddy":
                if (action.target) this.setMouseTowardPoint(cell, action.target.position, 0.04);
                this.socket.packetHandler.pressW = true;
                if (this.chance(0.34 + this.personality.teamwork * 0.2)) this.ejectDecisionCooldown = Math.max(this.ejectDecisionCooldown, this.randomInt(8, 18));
                return;
            case "split":
                if (!action.target) return;
                let largest = this.getLargest(this.cells);
                if (!largest) return;
                let dist = this.getDistance(largest.position, action.target.position);
                if (!this.canSplitAttack(largest, action.target, dist)) return;
                this.setMouseTowardPoint(largest, action.target.position, 0.02);
                this.pursuitTarget = action.target;
                this.pursuitTicks = Math.max(5, Math.round(11 * this.personality.persistence));
                this.splitCooldown = this.randomInt(10, 20);
                this.socket.packetHandler.pressSpace = true;
        }
    }
    checkConnection() {
        if (this.socket.isCloseReq) {
            for (;this.cells.length;) this.gameServer.removeNode(this.cells[0]);
            return this.isRemoved = true;
        }
        if (!this.cells.length) {
            this.gameServer.gameMode.onPlayerSpawn(this.gameServer, this);
            if (!this.cells.length) this.socket.close();
        }
    }
    sendUpdate() {
        this.tickDown("splitCooldown");
        this.tickDown("thinkCooldown");
        this.tickDown("pursuitTicks");
        this.tickDown("buddyRefreshCooldown");
        this.tickDown("abilityDecisionCooldown");
        this.tickDown("ejectDecisionCooldown");
        this.tickDown("wanderCooldown");
        this.tickDown("sessionTicksLeft");
        this.tickDown("massReliefCooldown");
        this.tickDown("logoutCooldown");
        let cell = this.getLargest(this.cells);
        if (!cell) return;
        this.refreshBuddyTarget(cell);
        if (this.pendingAction && this.pendingAction.executeAt <= this.gameServer.tickCount) this.executePendingAction(cell);
        if (this.pursuitTarget && this.isNodeUsable(this.pursuitTarget) && this.pursuitTicks > 0) this.setMouseTowardPoint(cell, this.pursuitTarget.position, 0.04);
        else if (this.wanderTarget && this.wanderCooldown > 0) this.mouse = this.wanderTarget;
        if (this.thinkCooldown > 0) return;
        this.thinkCooldown = this.randomInt(3, 6);
        this.decide(cell);
    }
    decide(cell) {
        if (!cell) return;
        let scan = this.scanEnvironment(cell);
        if (this.sessionTicksLeft <= 0 && this.logoutCooldown <= 0 && !scan.threat && this.chance(this.getTotalMass() > 900 ? 0.28 : 0.14)) {
            this.socket.close();
            return;
        }
        if (scan.prey && (!scan.threat || scan.prey.score >= scan.threat.score * 0.8)) {
            this.pursuitTarget = scan.prey.node;
            this.pursuitTicks = Math.max(this.pursuitTicks, this.randomInt(7, 15));
            this.setMouseTowardPoint(cell, scan.prey.node.position, 0.05);
        } else if (scan.threat) {
            let away = new Vector(cell.position.x - scan.threat.node.position.x, cell.position.y - scan.threat.node.position.y);
            this.setMouseByVector(cell, away);
        } else if (scan.buddy && this.personality.teamwork > 0.48 && !scan.prey) this.setMouseTowardPoint(cell, scan.buddy.node.position, 0.06);
        else if (scan.food) this.setMouseTowardPoint(cell, scan.food.node.position, 0.1);
        else this.setMouseByVector(cell, scan.vector);
        this.planDefensiveAction(cell, scan);
        this.planMassReliefAction(cell, scan);
        this.planSupportAction(cell, scan);
        this.planOffensiveAction(cell, scan);
    }
    splitKill(cell, prey, dist) {
        if (prey.cellType === 2) return 1.3 * this.gameServer.config.virusShotSpeed - cell._size / 2 - prey._size >= dist;
        let speed = Math.max(1.3 * this.gameServer.config.playerSplitSpeed, cell._size / 1.4142 * 4.5);
        return speed >= dist;
    }
}

module.exports = BotPlayer;
