"use strict";
const BotPlayer = require("./BotPlayer");
const MinionPlayer = require("./MinionPlayer");
const FakeSocket = require("./FakeSocket");
const PacketHandler = require("../PacketHandler");
const fs = require("fs");
const path = require("path");

class BotLoader {
    constructor(gameServer) {
        this.gameServer = gameServer;
        this.loadNames();
        this.loadSkins();
    }
    getName() {
        let skinName = "Base",
            skin = "",
            name = "";
        if (this.randomSkins.length > 0) {
            let variantSkins = this.randomSkins.filter(x => x && x.toLowerCase() !== "base");
            if (variantSkins.length > 0 && Math.random() < .35) skinName = variantSkins[(variantSkins.length * Math.random()) >>> 0];
            else if (this.randomSkins.indexOf("Base") === -1 && variantSkins.length > 0) skinName = variantSkins[(variantSkins.length * Math.random()) >>> 0];
        }
        skin = "{" + skinName + "}";
        if (this.randomNames.length > 0) name = this.randomNames[(this.randomNames.length * Math.random()) >>> 0];
        else name = "bot" + ++this.nameIndex;
        return skin + name;
    }
    loadNames() {
        this.randomNames = [];
        if (fs.existsSync("../src/txt/botnames.txt")) this.randomNames = fs.readFileSync("../src/txt/botnames.txt", "utf8").split(/[\r\n]+/).filter(x => x !== "");
        this.nameIndex = 0;
    }
    loadSkins() {
        this.randomSkins = [];
        let clientSkinDir = path.join(__dirname, "..", "..", "..", "client", "skins");
        if (fs.existsSync(clientSkinDir)) {
            this.randomSkins = fs.readdirSync(clientSkinDir, {
                withFileTypes: true
            }).filter(item => item.isFile() && path.extname(item.name).toLowerCase() === ".png").map(item => path.basename(item.name, path.extname(item.name))).filter(x => x !== "");
        } else if (fs.existsSync("../src/txt/skins.txt")) {
            this.randomSkins = fs.readFileSync("../src/txt/skins.txt", "utf8").split(/[\r\n]+/).filter(x => x !== "");
        }
        if (this.randomSkins.indexOf("Base") === -1) this.randomSkins.unshift("Base");
        this.gameServer.availableSkins = this.randomSkins.slice();
    }
    addBot() {
        let socket = new FakeSocket(this.gameServer);
        socket.playerTracker = new BotPlayer(this.gameServer, socket);
        socket.packetHandler = new PacketHandler(this.gameServer, socket);
        this.gameServer.clients.push(socket);
        socket.packetHandler.nickName(this.getName());
    }
    addMinion(owner, name) {
        let socket = new FakeSocket(this.gameServer);
        socket.playerTracker = new MinionPlayer(this.gameServer, socket, owner);
        socket.packetHandler = new PacketHandler(this.gameServer, socket);
        socket.playerTracker.owner = owner;
        this.gameServer.clients.push(socket);
        owner.minions.push(socket.playerTracker);
        if (typeof name === "undefined" || name === "") name = this.gameServer.config.minionSameName ? socket.playerTracker.owner._name : this.gameServer.config.minionDefaultName;
        socket.packetHandler.nickName(name);
    }
}

module.exports = BotLoader;
