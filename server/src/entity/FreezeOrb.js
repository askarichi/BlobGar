"use strict";
const EjectedMass = require("./EjectedMass");

class FreezeOrb extends EjectedMass {
    constructor(gameServer, ownerTracker, position, size) {
        super(gameServer, null, position, size);
        this.sourceOwner = ownerTracker || null;
        this.isFreezeOrb = true;
        this.expiresAt = Date.now() + 1800;
        this.color = {
            r: 110,
            g: 224,
            b: 255
        };
    }
    isExpired(now) {
        return !!this.expiresAt && now >= this.expiresAt;
    }
}

module.exports = FreezeOrb;
