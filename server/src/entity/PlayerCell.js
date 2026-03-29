"use strict";
const Cell = require("./Cell");

class PlayerCell extends Cell {
    constructor(gameServer, owner, position, size) {
        super(gameServer, owner, position, size);
        this.spiked = this.gameServer.config.playerSpikedCells;
        this.cellType = 0;
        this._speed = null;
        this.canRemerge = false;
    }
    canEat() {
        return true;
    }
    getSpeed(dist) {
        let speed = 2.2 * Math.pow(this._size, -.439) * 40;
        speed *= (this.owner.customSpeed || this.gameServer.config.playerSpeed) / 30;
        if (this.owner && this.owner.profileAbilityEffects && this.owner.profileAbilityEffects.speedMultiplier) speed *= this.owner.profileAbilityEffects.speedMultiplier;
        return speed * Math.min(dist , 32) / 32;
    }
    onEat(cell) {
        let gainRadius = cell.radius;
        if (!this.gameServer.config.playerBotGrow && this._size >= 250 && cell._size <= 41.23 && cell.cellType === 0) gainRadius = 0;
        if (this.owner && cell.owner !== this.owner && this.gameServer && typeof this.gameServer.getPlayerMassGainMultiplier === "function") gainRadius *= this.gameServer.getPlayerMassGainMultiplier(this.owner);
        this.setSize(Math.sqrt(this.radius + Math.max(0, gainRadius)));
    }
    onAdd(gameServer) {
        if (gameServer.config.gravitationalPushsplits) gameServer.nodesPlayer.unshift(this);
        else gameServer.nodesPlayer.push(this);
        gameServer.gameMode.onCellAdd(this);
    }
    onRemove(gameServer) {
        let index = this.owner.cells.indexOf(this);
        if (index !== -1) this.owner.cells.splice(index, 1);
        if (!this.owner.cells.length) gameServer.finalizePlayerRun(this.owner);
        index = gameServer.nodesPlayer.indexOf(this);
        if (index !== -1) gameServer.nodesPlayer.splice(index, 1);
        gameServer.gameMode.onCellRemove(this);
    }
}

module.exports = PlayerCell;
