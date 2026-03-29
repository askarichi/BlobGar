"use strict";
const BinaryWriter = require("./BinaryWriter");

class UpdateNodes {
    constructor(playerTracker, add, upd, eat, del) {
        this.playerTracker = playerTracker;
        this.addNodes = add;
        this.updNodes = upd;
        this.eatNodes = eat;
        this.delNodes = del;
    }
    build(protocol) {
        if (!protocol) return null;
        let writer = new BinaryWriter();
        writer.writeUInt8(0x10);
        this.writeEatItems(writer);
        if (protocol < 5) this.writeUpdateItems4(writer);
        else if (protocol === 5) this.writeUpdateItems5(writer);
        else if (protocol < 11) this.writeUpdateItems6(writer);
        else this.writeUpdateItems11(writer);
        this.writeRemoveItems(writer, protocol);
        return writer.toBuffer();
    }
    getNodeFlags(node, includeColor, includeSkin, includeName) {
        let flags = 0,
            owner = node && node.owner ? node.owner : null,
            server = owner && owner.gameServer ? owner.gameServer : null,
            now = server && server.stepDateTime ? server.stepDateTime : Date.now(),
            frozen = false,
            shielded = false;
        if (node && node.spiked) flags |= 0x01;
        if (includeColor) flags |= 0x02;
        if (includeSkin) flags |= 0x04;
        if (includeName) flags |= 0x08;
        if (node && node.cellType === 3) flags |= 0x20;
        if (node && node.cellType === 1) flags |= 0x80;
        if (node && node.cellType === 3 && node.isSpikeOrb) flags |= 0x10;
        if (owner && node && node.cellType === 0 && !node.spiked) {
            if (server && typeof server.isFrozen === "function") frozen = server.isFrozen(owner, now);
            if (server && typeof server.isShieldActive === "function") shielded = server.isShieldActive(owner, now);
        } else if (node && node.isAgitated) flags |= 0x10;
        if (node && node.cellType === 3 && node.isFreezeOrb) flags |= 0x40;
        if (frozen) flags |= 0x10;
        if (shielded) flags |= 0x40;
        return flags;
    }
    writeUpdateItems4(writer) {
        for (let i = 0; i < this.updNodes.length; i++) {
            let node = this.updNodes[i];
            if (node.nodeID === 0) continue;
            writer.writeUInt32((node.nodeID ^ this.playerTracker.scrambleID) >>> 0);
            writer.writeUInt16(node.position.x + this.playerTracker.scrambleX >> 0);
            writer.writeUInt16(node.position.y + this.playerTracker.scrambleY >> 0);
            writer.writeUInt16(node._size >>> 0);
            let color = node.color;
            writer.writeUInt8(color.r >>> 0);
            writer.writeUInt8(color.g >>> 0);
            writer.writeUInt8(color.b >>> 0);
            let flags = this.getNodeFlags(node, false, false, false);
            writer.writeUInt8(flags >>> 0);
            writer.writeUInt16(0);
        }
        for (let i = 0; i < this.addNodes.length; i++) {
            let node = this.addNodes[i];
            if (node.nodeID === 0) continue;
            let cellName = null;
            if (node.owner) cellName = node.owner._nameUnicode;
            writer.writeUInt32((node.nodeID ^ this.playerTracker.scrambleID) >>> 0);
            writer.writeUInt16(node.position.x + this.playerTracker.scrambleX >> 0);
            writer.writeUInt16(node.position.y + this.playerTracker.scrambleY >> 0);
            writer.writeUInt16(node._size >>> 0);
            let color = node.color;
            writer.writeUInt8(color.r >>> 0);
            writer.writeUInt8(color.g >>> 0);
            writer.writeUInt8(color.b >>> 0);
            let flags = this.getNodeFlags(node, false, false, cellName != null);
            writer.writeUInt8(flags >>> 0);
            if (cellName != null) writer.writeBytes(cellName);
            else writer.writeUInt16(0);
        }
        writer.writeUInt32(0);
    }
    writeUpdateItems5(writer) {
        for (let i = 0; i < this.updNodes.length; i++) {
            let node = this.updNodes[i];
            if (node.nodeID === 0) continue;
            writer.writeUInt32((node.nodeID ^ this.playerTracker.scrambleID) >>> 0);
            writer.writeUInt32(node.position.x + this.playerTracker.scrambleX >> 0);
            writer.writeUInt32(node.position.y + this.playerTracker.scrambleY >> 0);
            writer.writeUInt16(node._size >>> 0);
            let color = node.color;
            writer.writeUInt8(color.r >>> 0);
            writer.writeUInt8(color.g >>> 0);
            writer.writeUInt8(color.b >>> 0);
            let flags = this.getNodeFlags(node, false, false, false);
            writer.writeUInt8(flags >>> 0);
            writer.writeUInt16(0);
        }
        for (let i = 0; i < this.addNodes.length; i++) {
            let node = this.addNodes[i];
            if (node.nodeID === 0) continue;
            let skinName = null,
                cellName = null;
            if (node.owner) {
                skinName = node.owner._skinUtf8;
                cellName = node.owner._nameUnicode;
            }
            writer.writeUInt32((node.nodeID ^ this.playerTracker.scrambleID) >>> 0);
            writer.writeUInt32(node.position.x + this.playerTracker.scrambleX >> 0);
            writer.writeUInt32(node.position.y + this.playerTracker.scrambleY >> 0);
            writer.writeUInt16(node._size >>> 0);
            let color = node.color;
            writer.writeUInt8(color.r >>> 0);
            writer.writeUInt8(color.g >>> 0);
            writer.writeUInt8(color.b >>> 0);
            let flags = this.getNodeFlags(node, false, skinName != null, false);
            writer.writeUInt8(flags >>> 0);
            if (flags & 0x04) writer.writeBytes(skinName);
            if (cellName != null) writer.writeBytes(cellName);
            else writer.writeUInt16(0);
        }
        writer.writeUInt32(0 >> 0);
    }
    writeUpdateItems6(writer) {
        for (let i = 0; i < this.updNodes.length; i++) {
            let node = this.updNodes[i];
            if (node.nodeID === 0) continue;
            writer.writeUInt32((node.nodeID ^ this.playerTracker.scrambleID) >>> 0);
            writer.writeUInt32(node.position.x + this.playerTracker.scrambleX >> 0);
            writer.writeUInt32(node.position.y + this.playerTracker.scrambleY >> 0);
            writer.writeUInt16(node._size >>> 0);
            let flags = this.getNodeFlags(node, node.cellType === 0, false, false);
            writer.writeUInt8(flags >>> 0);
            if (flags & 0x02) {
                let color = node.color;
                writer.writeUInt8(color.r >>> 0);
                writer.writeUInt8(color.g >>> 0);
                writer.writeUInt8(color.b >>> 0);
            }
        }
        for (let i = 0; i < this.addNodes.length; i++) {
            let node = this.addNodes[i];
            if (node.nodeID === 0) continue;
            let skinName = null,
                cellName = null;
            if (node.owner) {
                skinName = node.owner._skinUtf8;
                cellName = node.owner._nameUtf8;
            }
            writer.writeUInt32((node.nodeID ^ this.playerTracker.scrambleID) >>> 0);
            writer.writeUInt32(node.position.x + this.playerTracker.scrambleX >> 0);
            writer.writeUInt32(node.position.y + this.playerTracker.scrambleY >> 0);
            writer.writeUInt16(node._size >>> 0);
            let flags = this.getNodeFlags(node, true, skinName != null, cellName != null);
            writer.writeUInt8(flags >>> 0);
            if (flags & 0x02) {
                let color = node.color;
                writer.writeUInt8(color.r >>> 0);
                writer.writeUInt8(color.g >>> 0);
                writer.writeUInt8(color.b >>> 0);
            }
            if (flags & 0x04) writer.writeBytes(skinName);
            if (flags & 0x08) writer.writeBytes(cellName);
        }
        writer.writeUInt32(0);
    }
    writeUpdateItems11(writer) {
        for (let i = 0; i < this.updNodes.length; i++) {
            let node = this.updNodes[i];
            if (node.nodeID === 0) continue;
            writer.writeUInt32((node.nodeID ^ this.playerTracker.scrambleID) >>> 0);
            writer.writeUInt32(node.position.x + this.playerTracker.scrambleX >> 0);
            writer.writeUInt32(node.position.y + this.playerTracker.scrambleY >> 0);
            writer.writeUInt16(node._size >>> 0);
            let flags = this.getNodeFlags(node, node.cellType === 0, false, false);
            writer.writeUInt8(flags >>> 0);
            if (flags & 0x80) writer.writeUInt8(0x01);
            if (flags & 0x02) {
                let color = node.color;
                writer.writeUInt8(color.r >>> 0);
                writer.writeUInt8(color.g >>> 0);
                writer.writeUInt8(color.b >>> 0);
            }
        }
        for (let i = 0; i < this.addNodes.length; i++) {
            let node = this.addNodes[i];
            if (node.nodeID === 0) continue;
            let skinName = null,
                cellName = null;
            if (node.owner) {
                skinName = node.owner._skinUtf8protocol11;
                cellName = node.owner._nameUtf8;
            }
            writer.writeUInt32((node.nodeID ^ this.playerTracker.scrambleID) >>> 0);
            writer.writeUInt32(node.position.x + this.playerTracker.scrambleX >> 0);
            writer.writeUInt32(node.position.y + this.playerTracker.scrambleY >> 0);
            writer.writeUInt16(node._size >>> 0);
            let flags = this.getNodeFlags(node, true, skinName != null, cellName != null);
            writer.writeUInt8(flags >>> 0);
            if (flags & 0x80) writer.writeUInt8(0x01);
            if (flags & 0x02) {
                let color = node.color;
                writer.writeUInt8(color.r >>> 0);
                writer.writeUInt8(color.g >>> 0);
                writer.writeUInt8(color.b >>> 0);
            }
            if (flags & 0x04) writer.writeBytes(skinName);
            if (flags & 0x08) writer.writeBytes(cellName);
        }
        writer.writeUInt32(0);
    }
    writeEatItems(writer) {
        writer.writeUInt16(this.eatNodes.length >>> 0);
        for (let i = 0; i < this.eatNodes.length; i++) {
            let node = this.eatNodes[i],
                hunterID = 0;
            if (node.killedBy) hunterID = node.killedBy.nodeID;
            writer.writeUInt32((hunterID ^ this.playerTracker.scrambleID) >>> 0);
            writer.writeUInt32((node.nodeID ^ this.playerTracker.scrambleID) >>> 0); 
        }
    }
    writeRemoveItems(writer, protocol) {
        let length = this.eatNodes.length + this.delNodes.length;
        if (protocol < 6) writer.writeUInt32(length >>> 0);
        else writer.writeUInt16(length >>> 0);
        for (let i = 0; i < this.eatNodes.length; i++) {
            let node = this.eatNodes[i];
            writer.writeUInt32((node.nodeID ^ this.playerTracker.scrambleID) >>> 0);
        }
        for (let i = 0; i < this.delNodes.length; i++) {
            let node = this.delNodes[i];
            writer.writeUInt32((node.nodeID ^ this.playerTracker.scrambleID) >>> 0);
        }
    }
}

module.exports = UpdateNodes;
