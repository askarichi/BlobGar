"use strict";
const EjectedMass = require("./EjectedMass");

class SpikeOrb extends EjectedMass {
    constructor(gameServer, ownerTracker, position, size) {
        super(gameServer, null, position, size);
        this.sourceOwner = ownerTracker || null;
        this.isSpikeOrb = true;
        this.expiresAt = Date.now() + 1800;
        this.color = { r: 255, g: 118, b: 78 };
    }
    isExpired(now) {
        return !!this.expiresAt && now >= this.expiresAt;
    }
}

module.exports = SpikeOrb;
