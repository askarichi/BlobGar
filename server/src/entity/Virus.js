"use strict";
const Cell = require("./Cell");

class Virus extends Cell {
    constructor(gameServer, owner, position, size) {
        super(gameServer, owner, position, size);
        this.cellType = 2;
        this.spiked = true;
        this.isMotherCell = false;
        this.feedShotsUsed = 0;
        this.feedShotsMax = this.gameServer ? this.gameServer.config.virusBaseFeedShots : 2;
        this.expiresAt = 0;
        this.color = this.gameServer.config.virusRandomColor ? this.gameServer.randomColor() : {
            r: 51,
            g: 255,
            b: 51
        };
    }
    setFeedProfile(maxShots, expiresAt) {
        this.feedShotsMax = Math.max(0, Math.round(maxShots || 0));
        this.expiresAt = Math.max(0, Math.round(expiresAt || 0));
    }
    canFeedShoot() {
        return this.feedShotsUsed < this.feedShotsMax;
    }
    isExpired(now) {
        return !!this.expiresAt && now >= this.expiresAt;
    }
    canEat(cell) {
        return cell.cellType === 3 && this.canFeedShoot();
    }
    onEat(cell) {
        if (!this.canFeedShoot()) return;
        this.feedShotsUsed++;
        this.setSize(this.gameServer.config.virusMinSize);
        if (this.gameServer.config.virusPush || this.gameServer.gameMode.ID === 2) this.setBoost(this.gameServer.config.virusEjectSpeed - 460, Math.atan2(cell.boostDirection.x, cell.boostDirection.y));
        this.gameServer.shootVirus(this, cell.boostDirection.angle, {
            feedShotsMax: this.gameServer.config.virusSpawnFeedShots,
            expiresAt: Date.now() + this.gameServer.config.virusSpawnLifetimeMs
        });
    }
    onEaten(cell) {
        if (!cell.owner) return;
        let config = this.gameServer.config,
            cellsLeft = (config.virusMaxCells || config.playerMaxCells) - cell.owner.cells.length;
        if (cellsLeft <= 0) return;
        let splitCount,
            splitMass,
            splitMin = config.virusSplitDiv,
            cellMass = cell._mass,
            splits = [];
        if (cellMass / cellsLeft < splitMin) {
            splitCount = 2;
            splitMass = cellMass / splitCount;
            while (splitMass > splitMin && 2 * splitCount < cellsLeft) splitMass = cellMass / (splitCount *= 2);
            splitMass = cellMass / (splitCount + 1);
            while (splitCount-- > 0) splits.push(splitMass);
            return this.explode(cell, splits);
        }
        let massLeft = cellMass / 2;
        splitMass = cellMass / 2;
        while (cellsLeft-- > 0) {
            if (massLeft / cellsLeft < splitMin) {
                splitMass = massLeft / cellsLeft;
                while (cellsLeft-- > 0) splits.push(splitMass);
            }
            while (splitMass >= massLeft && cellsLeft > 0) splitMass /= 2;
            splits.push(splitMass);
            massLeft -= splitMass;
        }
        this.explode(cell, splits);
    }
    explode(cell, splits) {
        for (let i = 0; i < splits.length; i++) this.gameServer.splitPlayerCell(cell.owner, cell, Math.PI * 2 * Math.random(), splits[i]);
    }
    onAdd(gameServer) {
        gameServer.nodesVirus.push(this);
    }
    onRemove(gameServer) {
        let index = gameServer.nodesVirus.indexOf(this);
        if (index !== -1) gameServer.nodesVirus.splice(index, 1);
    }
}

module.exports = Virus;
