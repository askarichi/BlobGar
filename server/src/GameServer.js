"use strict";
const QuadNode = require("./modules/QuadNode");
const BotLoader = require("./ai/BotLoader");
const PlayerTracker = require("./PlayerTracker");
const PacketHandler = require("./PacketHandler");
const PlayerCommand = require("./modules/PlayerCommand");
const UserRoleEnum = require("../src/enum/UserRoleEnum");
const ini = require("../src/modules/ini");
const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");
const Packet = require("./packet");
const Entity = require("./entity");
const Log = require("./modules/Logger");
const RankingStore = require("./modules/RankingStore");
const ProfileProgressStore = require("./modules/ProfileProgressStore");
const SupportStore = require("./modules/SupportStore");
const TelegramRelay = require("./modules/TelegramRelay");
const AdminStore = require("./modules/AdminStore");
const AdminAuth = require("./modules/AdminAuth");
const PlayerAuth = require("./modules/PlayerAuth");
const AdminTemplates = require("./modules/AdminTemplates");
const GameMode = require("./gamemodes");

class GameServer {
    constructor() {
        this.running = true;
        this.version = "2.0.0";
        this.httpServer = null;
        this.commands = null;
        this.lastNodeID = 1;
        this.lastPlayerID = 1;
        this.clients = [];
        this.socketCount = 0;
        this.largestClient = null;
        this.nodesAll = [];
        this.nodesPlayer = [];
        this.nodesVirus = [];
        this.nodesFood = [];
        this.nodesEject = [];
        this.nodesMoving = [];
        this.leaderboard = [];
        this.leaderboardType = -1;
        this.bots = new BotLoader(this);
        this.disableSpawn = false;
        this.startTime = Date.now();
        this.stepDateTime = 0;
        this.timeStamp = 0;
        this.updateTime = 0;
        this.updateTimeAvg = 0;
        this.timerLoopBind = null;
        this.mainLoopBind = null;
        this.tickCount = 0;
        this.config = {
            // Logging Configs
            logVerbosity: 4,
            logFileVerbosity: 5,
            // Server Configs
            serverTimeout: 300,
            serverMaxConnect: 100,
            serverPort: 443,
            serverBind: "0.0.0.0",
            serverTracker: 0,
            serverGamemode: 0,
            serverBots: 0,
            serverViewBaseX: 1920,
            serverViewBaseY: 1080,
            serverMinScale: .15,
            serverSpecScale: .4,
            serverStatsPort: 88,
            serverStatsUpdate: 60,
            serverMaxLB: 10,
            serverColorType: 0,
            serverTimeStep: 40,
            serverLBUpdate: 25,
            serverUserRoles: 0,
            // Client Configs
            serverChat: 1,
            serverChatAscii: 1,
            serverName: "NOX Arena",
            serverWelcome1: "Welcome to NOX.",
            serverWelcome2: "",
            clientBind: "",
            filterBadWords: 1,
            serverChatPassword: "change-me-before-launch",
            // Server Minion Configs
            minionDefaultName: "",
            serverMinions: 0,
            minionStartSize: 31.623,
            minionSameColor: 0,
            minionSameName: 0,
            minionTeamCollision: 1,
            // Anti-External Minion Configs
            serverIpLimit: 2,
            minionChecking: 1,
            minionIgnoreTime: 30,
            minionThreshold: 10,
            minionInterval: 1000,
            scrambleLevel: 1,
            playerBotGrow: 0,
            // Border Configs
            borderWidth: 14142,
            borderHeight: 14142,
            borderTransparency: 0,
            // Food Configs
            foodMinSize: 10,
            foodMaxSize: 10,
            foodMinAmount: 1500,
            foodMaxAmount: 3000,
            foodSpawnAmount: 30,
            foodGrowInterval: 4500,
            spawnInterval: 20,
            // Virus Cell Configs
            virusMinSize: 100,
            virusMaxSize: 141.4,
            virusMinAmount: 50,
            virusMaxAmount: 100,
            virusEjectSpeed: 780,
            virusSplitDiv: 36,
            virusRandomColor: 0,
            virusEatMult: 1.1576,
            virusMaxCells: 16,
            virusPush: 0,
            virusBaseFeedShots: 2,
            virusSpawnFeedShots: 1,
            virusSpawnLifetimeMs: 35000,
            motherFoodSpawnRate: 2,
            // Ejected Cell Configs
            ejectMinSize: 36.056,
            ejectMaxSize: 36.056,
            ejectSizeLoss: 41.231,
            ejectCooldown: 2,
            ejectSpawnChance: 50,
            ejectVirus: 0,
            ejectSpeed: 780,
            ejectRandomColor: 0,
            ejectRandomAngle: 1,
            ejectCollisionType: 0,
            // Player Configs
            playerMinDecay: 31.623,
            playerMaxSize: 1500,
            playerMinSplit: 59.161,
            playerMinEject: 59.161,
            playerStartSize: 31.623,
            playerMaxCells: 16,
            playerSpeed: 30,
            playerMergeTime: 30,
            playerDecayRate: .002,
            playerDecayCap: 0,
            playerMassSoftCap1: 1000,
            playerMassSoftCap2: 3000,
            playerMassSoftCap3: 5000,
            playerMassSoftGain1: .9,
            playerMassSoftGain2: .75,
            playerMassSoftGain3: .6,
            playerMassSoftDecay1: 1.3,
            playerMassSoftDecay2: 1.8,
            playerMassSoftDecay3: 2.4,
            playerMaxNick: 30,
            playerDisconnectTime: 60,
            playerSplitSpeed: 780,
            playerSpikedCells: 0,
            playerSizeIncrement: 4,
            playerSplitDiv: 2,
            playerEatMult: 1.15,
            splitRandomColor: 0,
            splitRestoreTicks: 13,
            playerGrayDisconnect: 0,
            // Tournament Configs
            tourneyMaxPlayers: 12,
            tourneyPrepTime: 10,
            tourneyEndTime: 30,
            tourneyTimeLimit: 20,
            tourneyAutoFill: 1,
            tourneyAutoFillTime: 10,
            // Mis-cell-aneous Configs
            mobilePhysics: 0,
            freeRoamSpeed: 25,
            autoSplitMouse: 0,
            botStartSize: 31.623,
            foodBrushLimit: 100,
            gravitationalPushsplits: 0
        };
        this.ipBanList = [];
        this.minionTest = [];
        this.userList = [];
        this.badWords = [];
        this.clientBind = [];
        this.loadConfig();
        this.applyEnvOverrides();
        this.loadBanList();
        this.loadUserList();
        this.loadBadWords();
        this.setBorder(this.config.borderWidth, this.config.borderHeight);
        this.quadTree = new QuadNode(this.border, 64, 32);
        this.gameMode = GameMode.get(this.config.serverGamemode);
        this.rankingStore = new RankingStore(path.join(__dirname, "data", "rankings.json"));
        this.profileProgressStore = new ProfileProgressStore(path.join(__dirname, "data", "profile-progress.json"));
        this.supportStore = new SupportStore(path.join(__dirname, "data"));
        this.telegramRelay = new TelegramRelay();
        this.adminStore = new AdminStore(path.join(__dirname, "data", "admin-store.json"));
        this.adminAuth = new AdminAuth(this);
        this.playerAuth = new PlayerAuth(this, path.join(__dirname, "data", "player-auth-secret.txt"));
    }
    start() {
        this.timerLoopBind = this.timerLoop.bind(this);
        this.mainLoopBind = this.mainLoop.bind(this);
        this.gameMode = GameMode.get(this.config.serverGamemode);
        this.gameMode.onServerInit(this);
        let bind = this.config.clientBind + "";
        this.clientBind = bind.split(" - ");
        this.httpServer = http.createServer(this.handleHttpRequest.bind(this));
        let wsOptions = {
            server: this.httpServer,
            perMessageDeflate: 0,
            maxPayload: 4096
        };
        this.wsServer = new WebSocket.Server(wsOptions);
        this.wsServer.on("error", this.socketError.bind(this));
        this.wsServer.on("connection", this.socketEvent.bind(this));
        this.httpServer.listen(this.config.serverPort, this.config.serverBind, this.onHttpOpen.bind(this));
        if (this.config.serverStatsPort > 0) this.startStatsServer(this.config.serverStatsPort);
    }
    onHttpOpen() {
        setTimeout(this.timerLoopBind, 1);
        Log.info("Listening on port " + this.config.serverPort + ".");
        Log.info("Current game mode is " + this.gameMode.name + ".");
        let botAmount = this.config.serverBots;
        if (botAmount) {
            for (var i = 0; i < botAmount; i++) this.bots.addBot();
            Log.info("Added " + botAmount + " player bots.");
        }
    }
    addNode(node) {
        let x = node.position.x,
            y = node.position.y,
            size = node._size;
        node.quadItem = {
            cell: node,
            bound: {
                minX: x - size,
                minY: y - size,
                maxX: x + size,
                maxY: y + size
            }
        };
        this.quadTree.insert(node.quadItem);
        this.nodesAll.push(node);
        if (node.owner) {
            node.color = this.config.splitRandomColor ? this.randomColor() : node.owner.color;
            node.owner.cells.push(node);
            node.owner.socket.sendPacket(new Packet.AddNode(node.owner, node));
        }
        node.onAdd(this);
    }
    removeNode(node) {
        node.isRemoved = true;
        this.quadTree.remove(node.quadItem);
        node.quadItem = null;
        let index = this.nodesAll.indexOf(node);
        if (index !== -1) this.nodesAll.splice(index, 1);
        index = this.nodesMoving.indexOf(node);
        if (index !== -1) this.nodesMoving.splice(index, 1);
        node.onRemove(this);
    }
    socketError(error) {
        switch (Log.error("WebSocket: " + error.code + " - " + error.message), error.code) {
            case "EADDRINUSE": // ERROR ADDRESS IN USE
                Log.error("Server could not bind to port " + this.config.serverPort + "!");
                Log.error("Please close out of Skype or change 'serverPort' in config.ini to a different number!");
                break;
            case "EACCES": // ERROR ACCESS
                Log.error("Please make sure you are running the server with sufficient privileges.");
        }
        process.exit(1);
    }
    socketEvent(ws) {
        let logIP = ws._socket.remoteAddress + ":" + ws._socket.remotePort;
        ws.on("error", error => {
            Log.writeError("[" + logIP + "] " + error.stack);
        });
        if (this.config.serverMaxConnect && this.socketCount >= this.config.serverMaxConnect) return ws.close(1000, "Connection slots are full!");
        if (this.checkIpBan(ws._socket.remoteAddress)) return ws.close(1000, "Your IP was banned!");
        if (this.config.serverIpLimit) {
            let ipConnections = 0;
            for (let i = 0; i < this.clients.length; i++) {
                let socket = this.clients[i];
                if (socket.isConnected === false || socket.remoteAddress !== ws._socket.remoteAddress) continue;
                ipConnections++;
            }
            if (ipConnections >= this.config.serverIpLimit) return ws.close(1000, "Player per IP limit reached!");
        }
        let wsOrigin = String(ws.upgradeReq.headers.origin || "");
        if (!wsOrigin) return ws.close(1000, "Client origin is required!");
        if (!this.playerAuth.isTrustedOrigin(wsOrigin)) return ws.close(1000, "This client origin is not allowed!");
        ws.isConnected = true;
        ws.remoteAddress = ws._socket.remoteAddress;
        ws.remotePort = ws._socket.remotePort;
        ws.lastAliveTime = Date.now();
        Log.info("A new player has connected to the server.");
        Log.write("CONNECTED " + ws.remoteAddress + ":" + ws.remotePort + ", origin: \"" + ws.upgradeReq.headers.origin + "\"");
        ws.playerTracker = new PlayerTracker(this, ws);
        ws.playerTracker.userAuth = this.playerAuth.getSessionFromHeaders(ws.upgradeReq && ws.upgradeReq.headers ? ws.upgradeReq.headers : {});
        ws.packetHandler = new PacketHandler(this, ws);
        ws.playerCommand = new PlayerCommand(this, ws.playerTracker);
        var self = this;
        ws.on("message", message => {
            if (!message.length) return;
            if (message.length > 256) return ws.close(1009, "Disconnected for spamming!");
            ws.packetHandler.handleMessage(message);
        });
        ws.on("error", () => {
            ws.packetHandler.sendPacket = () => {};
        });
        ws.on("close", () => {
            if (ws._noxCloseHandled) return;
            ws._noxCloseHandled = true;
            self.socketCount--;
            ws.isConnected = false;
            ws.packetHandler.sendPacket = () => {};
            ws.closeReason = {
                reason: ws._closeCode,
                message: ws._closeMessage
            };
            ws.closeTime = Date.now();
            Log.info((ws.playerTracker._name || "An unnamed cell") + " has disconnected from the server.");
            if (!ws.playerTracker.isBot && !ws.playerTracker.isMi && !ws.playerTracker.isMinion && ws.playerTracker._name) self.sendFeedEvent(ws.playerTracker._name, "left the battle", ws.playerTracker.color);
            self.finalizePlayerRun(ws.playerTracker);
            Log.write("DISCONNECTED " + ws.remoteAddress + ":" + ws.remotePort + ", code: " + ws._closeCode + ", reason: \"" + ws._closeMessage + "\", name: \"" + ws.playerTracker._name + "\"");
            if (self.config.playerGrayDisconnect) {
                let gray = Math.min(255, (ws.playerTracker.color.r * .2125 + ws.playerTracker.color.g * .7154 + ws.playerTracker.color.b * .0721)) >>> 0,
                    color = {
                        r: gray,
                        g: gray,
                        b: gray
                    };
                ws.playerTracker.color = color;
                for (let i = 0; i < ws.playerTracker.cells.length; i++) ws.playerTracker.cells[i].color = color;
            }
        });
        this.socketCount++;
        this.clients.push(ws);
        this.adminStore.updatePeakOnline(this.clients.filter(client => client && client.isConnected !== false && client.playerTracker && !client.playerTracker.isBot && !client.playerTracker.isMinion && !client.playerTracker.isMi).length, new Date().toISOString());
        if (this.config.minionChecking) this.checkMinion(ws);
    }
    checkMinion(ws) {
        if (!ws.upgradeReq.headers["user-agent"] || !ws.upgradeReq.headers["cache-control"] || ws.upgradeReq.headers["user-agent"].length < 50) ws.playerTracker.isMinion = true;
        if (this.config.minionThreshold && (ws.lastAliveTime - this.startTime) / 1000 >= this.config.minionIgnoreTime) {
            if (this.minionTest.length >= this.config.minionThreshold) {
                ws.playerTracker.isMinion = true;
                for (let i = 0; i < this.minionTest.length; i++) {
                    let playerTracker = this.minionTest[i];
                    if (!playerTracker.socket.isConnected) continue;
                    playerTracker.isMinion = true;
                }
                this.minionTest.length && this.minionTest.splice(0, 1);
            }
            this.minionTest.push(ws.playerTracker);
        }
        if (this.config.serverMinions && !ws.playerTracker.isMinion)
            for (let i = 0; i < this.config.serverMinions; i++) {
                this.bots.addMinion(ws.playerTracker);
                ws.playerTracker.minion.control = true;
            }
    }
    checkIpBan(ipAddress) {
        if (!this.ipBanList || !this.ipBanList.length || ipAddress === "127.0.0.1") return false;
        if (this.ipBanList.indexOf(ipAddress) >= 0) return true;
        let ipBin = ipAddress.split(".");
        if (ipBin.length != 4) return false;
        let subNet2 = ipBin[0] + "." + ipBin[1] + ".*.*";
        if (this.ipBanList.indexOf(subNet2) >= 0) return true;
        let subNet1 = ipBin[0] + "." + ipBin[1] + "." + ipBin[2] + ".*";
        if (this.ipBanList.indexOf(subNet1) >= 0) return true;
        return false;
    }
    setBorder(width, height) {
        let w = width / 2,
            h = height / 2,
            radius = Math.min(w, h);
        this.border = {
            minX: -w,
            minY: -h,
            maxX: w,
            maxY: h,
            width: width,
            height: height,
            centerX: 0,
            centerY: 0,
            radius: radius,
            isCircle: true
        };
    }
    randomColor() {
        switch (this.config.serverColorType) {
            default:
            case 0: // MultiOgar's original random color system
                {
                    let h = 360 * Math.random(),
                        s = 248 / 255,
                        color = {r: 1, g: 1, b: 1};
                    if (s > 0) {
                        h /= 60;
                        let i = ~~(h) >> 0,
                            f = h - i,
                            p = 1 * (1 - s),
                            q = 1 * (1 - s * f),
                            t = 1 * (1 - s * (1 - f));
                        switch (i) {
                            case 0:
                                color = {r: 1, g: t, b: p};
                                break;
                            case 1:
                                color = {r: q, g: 1, b: p};
                                break;
                            case 2:
                                color = {r: p, g: 1, b: t};
                                break;
                            case 3:
                                color = {r: p, g: q, b: 1};
                                break;
                            case 4:
                                color = {r: t, g: p, b: 1};
                                break;
                            default:
                                color = {r: 1, g: p, b: q};
                        }
                    }
                    color.r = Math.max(color.r, 0);
                    color.g = Math.max(color.g, 0);
                    color.b = Math.max(color.b, 0);
                    color.r = Math.min(color.r, 1);
                    color.g = Math.min(color.g, 1);
                    color.b = Math.min(color.b, 1);
                    return {
                        r: (color.r * 255) >> 0,
                        g: (color.g * 255) >> 0,
                        b: (color.b * 255) >> 0
                    };
                }
            case 1: // Ogar-Unlimited's random color system
                {
                    let color = [255, 7, (Math.random() * 255) >> 0];
                    color.sort(() => .5 - Math.random());
                    return {
                        r: color[0],
                        b: color[1],
                        g: color[2]
                    };
                }
            case 2: // Old Ogar's random color system
                {
                    let choices = [
                            {r: 235, g:  75, b:   0},
                            {r: 225, g: 125, b: 255},
                            {r: 180, g:   7, b:  20},
                            {r:  80, g: 170, b: 240},
                            {r: 180, g:  90, b: 135},
                            {r: 195, g: 240, b:   0},
                            {r: 150, g:  18, b: 255},
                            {r:  80, g: 245, b:   0},
                            {r: 165, g:  25, b:   0},
                            {r:  80, g: 145, b:   0},
                            {r:  80, g: 170, b: 240},
                            {r:  55, g:  92, b: 255}
                        ],
                        color = choices[Math.floor(Math.random() * 12)];
                    return {
                        r: color.r,
                        g: color.g,
                        b: color.b
                    };
                }
            case 3: // Truely randomized color system
                {
                    return {
                        r: Math.floor(255 * Math.random()) + 0,
                        g: Math.floor(255 * Math.random()) + 0,
                        b: Math.floor(255 * Math.random()) + 0
                    };
                }
        }
    }
    updateClient() {
        for (let i = 0; i < this.minionTest.length;) {
            let client = this.minionTest[i];
            if (this.stepDateTime - client.connectedTime < this.config.minionInterval) i++;
            else this.minionTest.splice(i, 1);
        }
        for (let i = 0; i < this.clients.length;) {
            let client = this.clients[i].playerTracker;
            client.checkConnection();
            if (client.isRemoved) this.clients.splice(i, 1);
            else i++;
        }
        for (let i = 0; i < this.clients.length; i++) {
            let client = this.clients[i].playerTracker;
            client.updateTick();
            this.trackPlayerRankingProgress(client);
            client.sendUpdate();
        }
    }
    updateLeaderboard() {
        this.leaderboard = [];
        this.leaderboardType = -1;
        this.gameMode.updateLB(this, this.leaderboard);
        this.largestClient = this.gameMode.rankOne;
        if (this.isRankedPlayer(this.gameMode.rankOne) && this.gameMode.rankOne.noxRunStats && this.gameMode.rankOne.noxRunStats.active) this.gameMode.rankOne.noxRunStats.reachedRankOne = true;
    }
    onChatMSG(from, to, message) { // Rename to onChatMessage later
        if (!message) return;
        message = message.trim();
        if (message === "") return;
        if (from && message.length > 0 && message[0] === "/") {
            message = message.slice(1, message.length);
            from.socket.playerCommand.executeCommandLine(message);
            return;
        }
        if (this.config.serverChat === 0) return;
        if (from && from.isMuted) return this.sendChatMessage(null, from, "You are currently muted!");
        if (message.length > 64) message = message.slice(0, 64);
        if (this.config.serverChatAscii === 0)
            for (let i = 0; i < message.length; i++) {
                let c = message.charCodeAt(i);
                if ((c < 0x20 || c > 0x7F) && from) return this.sendChatMessage(null, from, "You can only use ASCII text!");
            }
        if ((this.config.filterBadWords && this.checkBadWord(message)) && from) return this.sendChatMessage(null, from, "You cannot use bad words in the chat!");
        this.sendChatMessage(from, to, message);
    }
    checkBadWord(value) {
        if (!value) return false;
        value = " " + value.toLowerCase().trim() + " ";
        for (let i = 0; i < this.badWords.length; i++)
            if (value.indexOf(this.badWords[i]) >= 0) return true;
        return false;
    }
    sendChatMessage(from, to, message) {
        for (let i = 0; i < this.clients.length; i++) {
            let client = this.clients[i];
            if (client == null) continue;
            if (client.isConnected === false || client.readyState !== client.OPEN) continue;
            if (!to || to === client.playerTracker) client.sendPacket(new Packet.ChatMessage(from, message));
        }
    }
    sendFeedEvent(name, message, color, to) {
        let sender = {
            _name: (name || "Arena").trim() || "Arena",
            userRole: 0,
            cells: color ? [{color: color}] : []
        };
        for (let i = 0; i < this.clients.length; i++) {
            let client = this.clients[i];
            if (client == null) continue;
            if (client.isConnected === false || client.readyState !== client.OPEN) continue;
            if (!to || to === client.playerTracker) client.sendPacket(new Packet.ChatMessage(sender, "[feed]" + message));
        }
    }
    broadcastMSG(message) { // Rename to broadcastMessage
        for (let i = 0; i < this.clients.length; i++) this.clients[i].sendPacket(new Packet.ChatMessage(null, message));
    }
    timerLoop() {
        let timeStep = this.config.serverTimeStep,
            ts = Date.now(),
            dt = ts - this.timeStamp;
        if (dt < timeStep - 5) return setTimeout(this.timerLoopBind, ((timeStep - 5) - dt) >> 0);
        if (dt > 120) this.timeStamp = ts - timeStep;
        this.updateTimeAvg += .5 * (this.updateTime - this.updateTimeAvg);
        if (this.timeStamp == 0) this.timeStamp = ts;
        this.timeStamp += timeStep;
        setTimeout(this.mainLoopBind, 0);
        setTimeout(this.timerLoopBind, 0);
    }
    mainLoop() {
        this.stepDateTime = Date.now();
        let start = process.hrtime(),
            self = this;
        if (this.running) {
            let now = this.stepDateTime;
            for (let i = 0; i < this.clients.length; i++) {
                let socket = this.clients[i];
                if (!socket || !socket.playerTracker) continue;
                this.updateTimedPlayerStates(socket.playerTracker, now);
            }
            for (let i = 0; i < this.nodesPlayer.length; i++) {
                let cell = this.nodesPlayer[i];
                if (cell.isRemoved || cell == null || cell.owner == null) continue;
                cell.prevPosition = {
                    x: cell.position.x,
                    y: cell.position.y
                };
                this.updateMerge(cell, cell.owner);
                this.moveCell(cell);
                this.movePlayer(cell, cell.owner);
                this.autoSplit(cell, cell.owner);
                this.updateNodeQuad(cell);
                this.quadTree.find(cell.quadItem.bound, item => {
                    if (item.cell === cell) return;
                    let m = self.checkCellCollision(cell, item.cell);
                    if (self.checkRigidCollision(m)) self.resolveRigidCollision(m);
                    else self.resolveCollision(m);
                });
            }
            for (let i = 0; i < this.nodesMoving.length; i++) {
                let cell = this.nodesMoving[i];
                if (!cell || cell.isRemoved) continue;
                this.moveCell(cell);
                this.updateNodeQuad(cell);
                if (!cell.isMoving) this.nodesMoving.splice(i, 1);
                this.quadTree.find(cell.quadItem.bound, item => {
                    if (item.cell == cell) return;
                    let m = self.checkCellCollision(cell, item.cell);
                    if (cell.cellType === 3 && item.cell.cellType === 3 && !self.config.mobilePhysics && self.config.ejectCollisionType !== 2) self.resolveRigidCollision(m);
                    else self.resolveCollision(m);
                });
            }
            /*if (this.config.foodGrowInterval)
                for (let i = 0; i < this.nodesFood.length; i++) {
                    let food = this.nodesFood[i];
                    switch (food.growStage) {
                        case 0:
                            if (food.growStage === 0 && food.getAge() > this.config.foodGrowInterval && food.getAge() < this.config.foodGrowInterval * 2) {
                                food.setSize(this.massToSize(2));
                                food.growStage = 1;
                            }
                            break;
                        case 1:
                            if (food.growStage === 1 && food.getAge() > this.config.foodGrowInterval * 2 && food.getAge() < this.config.foodGrowInterval * 3) {
                                food.setSize(this.massToSize(3));
                                food.growStage = 2;
                            }
                            break;
                        case 2:
                            if (food.growStage === 3 && food.getAge() > this.config.foodGrowInterval * 3 && food.getAge() < this.config.foodGrowInterval * 4) {
                                food.setSize(this.massToSize(4));
                                food.growStage = 3;
                            }
                    }
                }*/
            if ((this.tickCount % this.config.spawnInterval) === 0) this.spawnCells(this.randomPosition());
            this.gameMode.onTick(this);
            if (((this.tickCount + 3) % 25) === 0) this.updateDecay();
            this.updateTimedViruses();
            this.updateTimedFreezeOrbs();
            this.tickCount++;
        }
        this.updateClient();
        if (((this.tickCount + 7) % this.config.serverLBUpdate) === 0) this.updateLeaderboard();
        if (this.config.serverTracker && (this.tickCount % 750) === 0) this.pingServerTracker();
        let end = process.hrtime(start);
        this.updateTime = end[0] * 1000 + end[1] / 1e6;
    }
    massToSize(mass) {
        return Math.sqrt(100 * mass); 
    }
    sizeToMass(size) {
        return Math.pow(size, 2) / 100; 
    }
    getPlayerTotalMass(client) {
        if (!client || !client.cells || !client.cells.length) return 0;
        let total = 0;
        for (let i = 0; i < client.cells.length; i++) {
            let cell = client.cells[i];
            if (!cell || cell.isRemoved) continue;
            total += cell._mass || 0;
        }
        return total;
    }
    getPlayerMassBalance(totalMass) {
        let mass = Math.max(0, totalMass || 0),
            config = this.config;
        if (mass >= config.playerMassSoftCap3) return {
            stage: 3,
            gainMultiplier: config.playerMassSoftGain3,
            decayMultiplier: config.playerMassSoftDecay3
        };
        if (mass >= config.playerMassSoftCap2) return {
            stage: 2,
            gainMultiplier: config.playerMassSoftGain2,
            decayMultiplier: config.playerMassSoftDecay2
        };
        if (mass >= config.playerMassSoftCap1) return {
            stage: 1,
            gainMultiplier: config.playerMassSoftGain1,
            decayMultiplier: config.playerMassSoftDecay1
        };
        return {
            stage: 0,
            gainMultiplier: 1,
            decayMultiplier: 1
        };
    }
    getPlayerMassGainMultiplier(client) {
        return this.getPlayerMassBalance(this.getPlayerTotalMass(client)).gainMultiplier;
    }
    getPlayerMassDecayMultiplier(client) {
        return this.getPlayerMassBalance(this.getPlayerTotalMass(client)).decayMultiplier;
    }
    restoreCellToPreviousPosition(cell) {
        if (!cell || !cell.prevPosition) return false;
        cell.position.x = cell.prevPosition.x;
        cell.position.y = cell.prevPosition.y;
        cell.boostDistance = 0;
        this.updateNodeQuad(cell);
        return true;
    }
    updateMerge(cell, client) {
        let time = Math.max(this.config.playerMergeTime, cell._size * .2);
        if (cell.getAge() < 13) cell.canRemerge = false;
        if (this.config.playerMergeTime <= 0 || client.recMode) return cell.canRemerge = cell.boostDistance < 100;
        time *= 25;
        cell.canRemerge = cell.getAge() >= time;
    }
    updateDecay() {
        for (let i = 0; i < this.clients.length; i++) {
            let client = this.clients[i].playerTracker,
                decayMultiplier = this.getPlayerMassDecayMultiplier(client);
            for (let j = 0; j < client.cells.length; j++) {
                if (client.recMode || this.isFrozen(client)) break;
                let cell = client.cells[j],
                    size = cell._size;
                if (cell == null || cell.isRemoved || size <= this.config.playerMinDecay) break;
                let rate = this.config.playerDecayRate,
                    cap = this.config.playerDecayCap;
                if (cap && cell._mass > cap) rate *= 10;
                rate *= decayMultiplier;
                let decay = 1 - rate * this.gameMode.decayMod;
                size = Math.sqrt(size * size * decay);
                size = Math.max(size, this.config.playerMinDecay);
                cell.setSize(size);
            }
        }
    }
    autoSplit(cell, client) {
        let maxSize = this.config.playerMaxSize;
        if (client.recMode || this.isFrozen(client)) maxSize = Math.pow(this.config.playerMaxSize, 2);
        if (client.mergeOverride || cell._size < maxSize) return;
        if (client.cells.length >= this.config.playerMaxCells || this.config.mobilePhysics) return cell.setSize(maxSize);
        else {
            let angle = this.config.autoSplitMouse ? Math.atan2(client.mouse.x - cell.position.x, client.mouse.y - cell.position.y) : 2 * Math.PI * Math.random();
            this.splitPlayerCell(client, cell, angle, cell._mass / this.config.playerSplitDiv);
        }
    }
    movePlayer(cell, client) {
        if (client.socket.isConnected === false || this.isFrozen(client)) return;
        let dx = ~~(client.mouse.x - cell.position.x),
            dy = ~~(client.mouse.y - cell.position.y),
            squared = dx * dx + dy * dy;
        if (squared < 1 || isNaN(dx) || isNaN(dy)) return;
        let sqrt = Math.sqrt(squared),
            moveX = dx / sqrt,
            moveY = dy / sqrt;
        let speed = cell.getSpeed(sqrt);
        if (speed <= 0) return;
        cell.position.x += moveX * speed;
        cell.position.y += moveY * speed;
    }
    moveCell(cell) {
        if (cell.isMoving)
            if (!cell.boostDistance || cell.isRemoved || (this.gameMode.ID === 2 && cell.fromMother && cell.boostDistance.toFixed(1) == 0)) {
                cell.boostDistance = 0;
                cell.isMoving = false;
                return;
            }
        let speed = cell.boostDistance / 10;
        cell.boostDistance -= speed;
        cell.position.x += cell.boostDirection.x * speed;
        cell.position.y += cell.boostDirection.y * speed;
        let r = cell._size / 2;
        if (this.border.isCircle) {
            let limit = Math.max(0, this.border.radius - r),
                dx = cell.position.x - this.border.centerX,
                dy = cell.position.y - this.border.centerY,
                dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > limit && dist > 0) {
                let nx = dx / dist,
                    ny = dy / dist,
                    dot = cell.boostDirection.x * nx + cell.boostDirection.y * ny;
                cell.boostDirection.x -= 2 * dot * nx;
                cell.boostDirection.y -= 2 * dot * ny;
            }
        } else {
            if (cell.position.x < this.border.minX + r || cell.position.x > this.border.maxX - r) cell.boostDirection.x =- cell.boostDirection.x;
            if (cell.position.y < this.border.minY + r || cell.position.y > this.border.maxY - r) cell.boostDirection.y =- cell.boostDirection.y;
        }
        if (!this.config.borderTransparency) cell.checkBorder(this.border);
    }
    splitPlayerCell(client, parent, angle, mass, max) {
        if (client.cells.length >= max) return;
        let size2 = parent._size / Math.sqrt(this.config.playerSplitDiv),
            size1 = 0;
        if (mass) {
            size1 = Math.sqrt(100 * mass);
            size2 = Math.sqrt(parent.radius - size1 * size1);
        }
        if (isNaN(size2) || size2 < this.config.playerMinDecay) return;
        parent.setSize(size2);
        let pos = {
                x: parent.position.x,
                y: parent.position.y
            },
            size = size1 || size2,
            cell = new Entity.PlayerCell(this, client, pos, size);
        cell.setBoost(this.config.playerSplitSpeed * Math.pow(size, .0122), angle);
        this.addNode(cell);
    }
    updateNodeQuad(node) {
        let item = node.quadItem,
            x = node.position.x,
            y = node.position.y,
            size = node._size;
        if (item.x === x && item.y === y && item.size === size) return;
        item.x = x;
        item.y = y;
        item.size = size;
        item.bound.minX = x - size;
        item.bound.minY = y - size;
        item.bound.maxX = x + size;
        item.bound.maxY = y + size;
        this.quadTree.update(item);
    }
    checkRigidCollision(m) {
        if (!m || !m.cell || !m.check) return false;
        if (m.cell.isFreezeOrb || m.check.isFreezeOrb || m.cell.isSpikeOrb || m.check.isSpikeOrb) return false;
        if (m.cell.cellType === 0 && m.check.cellType === 0) {
            if ((m.cell.owner && this.isProtectedFromPlayerEat(m.cell.owner)) ||
                (m.check.owner && this.isProtectedFromPlayerEat(m.check.owner))) return true;
        }
        if (!m.cell.owner || !m.check.owner) return false;
        if (m.cell.owner !== m.check.owner) return this.gameMode.isTeams && m.cell.owner.team === m.check.owner.team;
        if (m.cell.owner.mergeOverride) return false;
        let r = this.config.mobilePhysics ? 1 : this.config.splitRestoreTicks;
        if (m.cell.getAge() < r || m.check.getAge() < r) return false;
        return !m.cell.canRemerge || !m.check.canRemerge;
    }
    checkCellCollision(cell, check) {
        let r = cell._size + check._size,
            dx = check.position.x - cell.position.x,
            dy = check.position.y - cell.position.y,
            squared = dx * dx + dy * dy,
            sqrt = Math.sqrt(squared);
        return {
            cell: cell,
            check: check,
            r: r,
            dx: dx,
            dy: dy,
            d: sqrt,
            push: Math.min((r - sqrt) / sqrt, r - sqrt),
            squared: squared
        };
    }
    getSafeCollisionNormal(m) {
        let dx = m.dx,
            dy = m.dy,
            dist = m.d;
        if (isFinite(dist) && dist > 0.0001) return {
            x: dx / dist,
            y: dy / dist
        };
        let seed = ((m.cell && m.cell.nodeID) || 1) * 92821 + ((m.check && m.check.nodeID) || 1) * 52361,
            angle = (seed % 360) * Math.PI / 180;
        return {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }
    resolveProtectedPlayerCollision(m, now) {
        if (!m || m.d > m.r) return false;
        let cell = m.cell,
            check = m.check;
        if (!cell || !check || cell.cellType !== 0 || check.cellType !== 0 || !cell.owner || !check.owner || cell.owner === check.owner) return false;
        let cellProtected = this.isProtectedFromPlayerEat(cell.owner, now),
            checkProtected = this.isProtectedFromPlayerEat(check.owner, now);
        if (!cellProtected && !checkProtected) return false;
        this.restoreCellToPreviousPosition(cell);
        this.restoreCellToPreviousPosition(check);
        let dx = check.position.x - cell.position.x,
            dy = check.position.y - cell.position.y,
            dist = Math.sqrt(dx * dx + dy * dy),
            targetDistance = cell._size + check._size;
        if (!isFinite(dist) || dist < targetDistance) {
            let normal = dist > 0.0001 ? {
                    x: dx / dist,
                    y: dy / dist
                } : this.getSafeCollisionNormal(m);
            if (cellProtected && !checkProtected) {
                check.position.x = cell.position.x + normal.x * targetDistance;
                check.position.y = cell.position.y + normal.y * targetDistance;
                this.updateNodeQuad(check);
            } else if (!cellProtected && checkProtected) {
                cell.position.x = check.position.x - normal.x * targetDistance;
                cell.position.y = check.position.y - normal.y * targetDistance;
                this.updateNodeQuad(cell);
            } else {
                let midX = (cell.position.x + check.position.x) * 0.5,
                    midY = (cell.position.y + check.position.y) * 0.5,
                    half = targetDistance * 0.5;
                cell.position.x = midX - normal.x * half;
                cell.position.y = midY - normal.y * half;
                check.position.x = midX + normal.x * half;
                check.position.y = midY + normal.y * half;
                this.updateNodeQuad(cell);
                this.updateNodeQuad(check);
            }
        }
        return true;
    }
    resolveRigidCollision(m) {
        if (m.d > m.r) return;
        if (m.cell.cellType === 3 && this.config.ejectCollisionType === 1) {
            m.cell.position.x -= m.push * m.dx * .41;
            m.cell.position.y -= m.push * m.dy * .41;
        } else {
            let rt = m.cell._mass + m.check._mass,
                r1 = m.cell._mass / rt,
                r2 = m.check._mass / rt,
                fx = ~~m.dx,
                fy = ~~m.dy;
            m.cell.position.x -= m.push * fx * r2;
            m.cell.position.y -= m.push * fy * r2;
            m.check.position.x += m.push * fx * r1;
            m.check.position.y += m.push * fy * r1;
        }
    }
    resolveCollision(m) {
        let cell = m.cell,
            check = m.check,
            now = this.stepDateTime || Date.now();
        if (cell._size > check._size) {
            cell = m.check;
            check = m.cell;
        }
        if (cell.isRemoved || check.isRemoved) return;
        if (cell.isFreezeOrb || check.isFreezeOrb || cell.isSpikeOrb || check.isSpikeOrb) {
            let orb = cell.isFreezeOrb || cell.isSpikeOrb ? cell : check,
                other = orb === cell ? check : cell;
            if (other.cellType !== 0 || !other.owner) return;
            if (orb.sourceOwner && other.owner === orb.sourceOwner) return;
            orb.isRemoved = true;
            if (orb.isFreezeOrb) {
                this.applyFreezeToPlayer(other.owner, orb.sourceOwner);
            } else if (orb.isSpikeOrb) this.applySpikeToCell(other, orb.sourceOwner);
            this.removeNode(orb);
            return;
        }
        let div = this.config.mobilePhysics ? 20 : 3,
            size = check._size - cell._size / div;
        if (m.squared >= size * size) return;
        if (this.config.gravitationalPushsplits && check.cellType === 0 && check.canEat(cell) && cell.getAge() < 1) return;
        if (cell.cellType === 3 && cell.getAge() < 1) return;
        if (cell.isAbilitySpike && cell.placedBy && check.cellType === 0 && check.owner === cell.placedBy) return;
        if (check.isAbilitySpike && check.placedBy && cell.cellType === 0 && cell.owner === check.placedBy) return;
        if (cell.owner && cell.owner === check.owner) {
            if (cell.getAge(this.tickCount) < this.config.splitRestoreTicks || check.getAge(this.tickCount) < this.config.splitRestoreTicks) return;
            if (cell.owner.cells.length <= 2) cell.owner.mergeOverride = false;
        } else {
            if (cell.cellType === 0 && check.cellType === 0 && (this.isProtectedFromPlayerEat(cell.owner, now) || this.isProtectedFromPlayerEat(check.owner, now))) return;
            if (check.cellType === 0 && check.owner) {
                if (this.isShieldActive(check.owner, now) && cell.cellType === 3) return;
                if (this.isFrozen(check.owner, now) && (cell.cellType === 1 || cell.cellType === 3)) return;
            }
            if (cell.isAbilitySpike && cell.armedAt && cell.armedAt > now) return;
            let mult = cell.cellType === 2 ? this.config.virusEatMult : cell.cellType === 1 || cell.cellType === 3 ? 1 : this.config.playerEatMult;
            if (!check.canEat(cell) || check._size < mult * cell._size) return;
        }
        if (cell.cellType === 1 && check.cellType === 0 && check.owner) this.recordPlayerFoodPickup(check.owner);
        if (cell.cellType === 0 && check.cellType === 0 && cell.owner && check.owner && cell.owner !== check.owner && cell.owner.cells.length <= 1) this.recordPlayerKill(check.owner, cell.owner);
        cell.isRemoved = true;
        check.onEat(cell);
        cell.onEaten(check);
        cell.killedBy = check;
        this.updateNodeQuad(check);
        this.removeNode(cell);
    }
    randomPosition() {
        if (this.border.isCircle) {
            let angle = Math.random() * Math.PI * 2,
                radius = Math.sqrt(Math.random()) * this.border.radius;
            return {
                x: this.border.centerX + Math.cos(angle) * radius,
                y: this.border.centerY + Math.sin(angle) * radius
            };
        }
        return {
            x: this.border.minX + this.border.width * Math.random(),
            y: this.border.minY + this.border.height * Math.random()
        };
    }
    spawnCells(player) {
        let foodMaxCount;
        if (this.gameMode.ID === 2) foodMaxCount = this.config.foodMinAmount - this.nodesFood.filter(food => !food.fromMother).length;
        else foodMaxCount = this.config.foodMinAmount - this.nodesFood.length;
        let foodSpawnCount = Math.min(foodMaxCount, this.config.foodSpawnAmount);
        for (let i = 0; i < foodSpawnCount; i++) {
            let size = this.config.foodMinSize;
            if (this.config.foodMaxSize > size) size = Math.random() * (this.config.foodMaxSize - size) + size;
            let food = new Entity.Food(this, null, this.randomPosition(), size);
            food.color = this.randomColor();
            this.addNode(food);
        }
        let virusMaxCount = this.config.virusMinAmount - this.nodesVirus.length,
            virusSpawnCount = Math.min(virusMaxCount, 2);
        for (let i = 0; i < virusSpawnCount; i++)
            if (!this.willCollide(player, this.config.virusMinSize)) {
                let virus = new Entity.Virus(this, null, player, this.config.virusMinSize);
                this.addNode(virus);
            }
    }
    spawnPlayer(client, pos) {
        if (client.isMinion) return client.socket.close(1000, "Marked as a minion!");
        if (this.disableSpawn) return;
        let startSize = this.config.playerStartSize;
        if (client.spawnMass) startSize = client.spawnMass;
        else if (client.isMi) startSize = this.config.minionStartSize;
        else if (client.isBot) startSize = this.config.botStartSize;
        else if (client.profileAbilityEffects && client.profileAbilityEffects.startMassMultiplier > 1) startSize = Math.sqrt(startSize * startSize * client.profileAbilityEffects.startMassMultiplier);
        if (this.config.ejectSpawnChance) {
            let eject = this.nodesEject[Math.floor(Math.random() * this.nodesEject.length)];
            if (eject && eject.boostDistance < 1 && (Math.floor((Math.random() * 100) + 0)) <= this.config.ejectSpawnChance) {
                client.color = eject.color;
                pos = {
                    x: eject.position.x,
                    y: eject.position.y
                };
                startSize = Math.max(eject._size, startSize);
                this.removeNode(eject);
            }
        }
        for (let i = 0; i < 10 && this.willCollide(pos, startSize); i++) pos = this.randomPosition();
        let cell = new Entity.PlayerCell(this, client, pos, startSize);
        this.startPlayerRun(client);
        this.addNode(cell);
        client.mouse = {
            x: pos.x,
            y: pos.y
        };
        if (!client.isBot && !client.isMi && !client.isMinion && client._name) this.sendFeedEvent(client._name, "joined the battle", client.color);
    }
    willCollide(pos, size) {
        if (this.border.isCircle) {
            let dx = pos.x - this.border.centerX,
                dy = pos.y - this.border.centerY,
                limit = Math.max(0, this.border.radius - size);
            if (dx * dx + dy * dy > limit * limit) return true;
        }
        let bound = {
                minX: pos.x - size,
                minY: pos.y - size,
                maxX: pos.x + size,
                maxY: pos.y + size
            },
            dist = bound.minX * bound.minX + bound.minY * bound.minY;
        if (dist + (size * size) <= (size * 2)) return null;
        return this.quadTree.any(bound, item => item.cell.cellType !== 3 && item.cell.cellType !== 1);
    }
    splitCells(client) {
        if (this.isFrozen(client)) return;
        let knownCells = [],
            max = this.config.playerMaxCells;
        for (let i = 0; i < client.cells.length; i++)
            if (client.cells[i]._size > this.config.playerMinSplit) {
                if (client.recMode) max = Math.pow(this.config.playerMaxCells, 2) * 2;
                if (client.cells.length >= max) break;
                knownCells.push(client.cells[i]);
            }
        for (let i = 0; i < knownCells.length; i++) {
            let cell = knownCells[i],
                x = ~~(client.mouse.x - cell.position.x),
                y = ~~(client.mouse.y - cell.position.y);
            if (x * x + y * y < 1) x = y = 0;
            let angle = Math.atan2(x, y);
            this.splitPlayerCell(client, cell, angle, null, max);
        }
    }
    canEject(client) {
        if (this.isFrozen(client)) return false;
        let effectiveCooldown = client && client.profileAbilityEffects && client.profileAbilityEffects.ejectCooldownTicks ? client.profileAbilityEffects.ejectCooldownTicks : this.config.ejectCooldown;
        if (client.lastEject == null) {
            client.lastEject = this.tickCount;
            return true;
        }
        if (this.tickCount - client.lastEject < effectiveCooldown) return false;
        client.lastEject = this.tickCount;
        return true;
    }
    ejectMass(client) {
        if (!this.canEject(client)) return;
        for (let i = 0; i < client.cells.length; i++) {
            let cell = client.cells[i];
            if (!cell || cell._size < this.config.playerMinEject) continue;
            let dx = client.mouse.x - cell.position.x,
                dy = client.mouse.y - cell.position.y,
                squared = dx * dx + dy * dy;
            if (squared > 1) {
                dx /= Math.sqrt(squared);
                dy /= Math.sqrt(squared);
            } else dx = dy = 0;
            let loss = this.config.ejectSizeLoss;
            cell.setSize(Math.sqrt(cell.radius - loss * loss));
            let pos = {
                    x: cell.position.x + dx * cell._size,
                    y: cell.position.y + dy * cell._size
                },
                angle = Math.atan2(dx, dy);
            if (isNaN(angle)) angle = Math.PI / 2;
            else angle += this.config.ejectRandomAngle ? .6 * Math.random() - .3 : 0;
            let size = this.config.ejectMinSize;
            if (this.config.ejectMaxSize > size) size = Math.random() * (this.config.ejectMaxSize - size) + size;
            let eject;
            if (this.config.ejectVirus) eject = new Entity.Virus(this, null, pos, size);
            else eject = new Entity.EjectedMass(this, null, pos, size);
            if (this.config.ejectRandomColor) eject.color = this.randomColor();
            else eject.color = cell.color;
            eject.setBoost(this.config.ejectSpeed, angle);
            this.addNode(eject);
        }
    }
    handleHttpRequest(req, res) {
        let requestURL = new URL(req.url, "http://127.0.0.1");
        this.setHttpCorsHeaders(req, res, requestURL);
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            return res.end();
        }
        if (requestURL.pathname.indexOf("/nox/") === 0 && !this.playerAuth.isTrustedRequest(req)) return this.sendJson(res, 403, {
            ok: false,
            error: "This client origin is not allowed."
        });
        if (req.method === "GET" && requestURL.pathname === "/admin/login") {
            if (this.adminAuth.getSession(req)) return this.redirect(res, "/admin");
            return this.sendHtml(res, 200, AdminTemplates.renderLoginPage());
        }
        if (req.method === "GET" && requestURL.pathname === "/admin") {
            if (!this.adminAuth.getSession(req)) return this.redirect(res, "/admin/login");
            return this.sendHtml(res, 200, AdminTemplates.renderPanelPage());
        }
        if (requestURL.pathname === "/admin/api/session") return this.handleAdminSession(req, res);
        if (req.method === "POST" && requestURL.pathname === "/admin/api/login") return this.handleAdminLogin(req, res);
        if (req.method === "POST" && requestURL.pathname === "/admin/api/logout") return this.handleAdminLogout(req, res);
        if (requestURL.pathname.indexOf("/admin/api/") === 0) return this.handleAdminApi(req, res, requestURL);
        if (req.method === "GET" && requestURL.pathname === "/nox/auth/session") return this.handlePlayerSession(req, res);
        if (req.method === "GET" && requestURL.pathname === "/nox/client-config") return this.handleClientConfig(req, res);
        if (req.method === "POST" && requestURL.pathname === "/nox/auth/guest") return this.handleGuestSession(req, res);
        if (req.method === "POST" && requestURL.pathname === "/nox/auth/telegram") return this.handleTelegramSession(req, res);
        if (req.method === "GET" && requestURL.pathname === "/nox/rankings") return this.sendJson(res, 200, this.rankingStore.buildSnapshot(100));
        if (req.method === "GET" && requestURL.pathname === "/nox/profile-progress") return this.handleProfileProgress(req, res, requestURL);
        if (req.method === "POST" && requestURL.pathname === "/nox/profile-progress/upgrade") return this.handleProfileAbilityUpgrade(req, res);
        if (req.method === "POST" && requestURL.pathname === "/nox/support/report") return this.handleSupportReport(req, res);
        return this.sendJson(res, 404, {
            error: "Not found"
        });
    }
    setHttpCorsHeaders(req, res, requestURL) {
        let origin = String(req.headers.origin || ""),
            isAdminSessionProbe = requestURL.pathname === "/admin/api/session",
            allowAdminCors = isAdminSessionProbe && this.adminAuth.isTrustedOrigin(origin),
            allowPlayerCors = requestURL.pathname.indexOf("/nox/") === 0 && this.playerAuth.isTrustedOrigin(origin);
        if (allowAdminCors || allowPlayerCors) {
            res.setHeader("Access-Control-Allow-Origin", origin);
            res.setHeader("Access-Control-Allow-Credentials", "true");
        } else if (requestURL.pathname === "/nox/rankings") res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-NOX-CSRF, X-NOX-PLAYER-CSRF");
    }
    sendHtml(res, statusCode, html) {
        res.writeHead(statusCode, {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store"
        });
        res.end(html);
    }
    redirect(res, location) {
        res.writeHead(302, {
            Location: location,
            "Cache-Control": "no-store"
        });
        res.end();
    }
    getOnlineHumanTrackers() {
        return this.clients.filter(client => client && client.isConnected !== false && client.playerTracker && !client.playerTracker.isBot && !client.playerTracker.isMi && !client.playerTracker.isMinion).map(client => client.playerTracker);
    }
    findOnlineHumanTracker(lookupValue) {
        let rawLookup = String(lookupValue || "").trim();
        if (!rawLookup) return null;
        let safeLookup = rawLookup.toLowerCase(),
            online = this.getOnlineHumanTrackers();
        return online.find(item => String(item.pID) === rawLookup || item._name && item._name.toLowerCase() === safeLookup || item.userAuth && item.userAuth.accountKey && item.userAuth.accountKey.toLowerCase() === safeLookup) || null;
    }
    resolveAdminPlayerIdentity(lookupValue) {
        let tracker = this.findOnlineHumanTracker(lookupValue);
        if (tracker) return this.getPlayerIdentity(tracker);
        let summary = this.profileProgressStore.buildSummary(lookupValue);
        return {
            accountKey: summary.accountKey || "",
            name: summary.name || "Pilot-07",
            authProvider: summary.authProvider || "guest",
            nameLocked: !!summary.nameLocked,
            telegramUserId: summary.telegramUserId || null
        };
    }
    getOnlineBotCount() {
        return this.clients.filter(client => client && client.isConnected !== false && client.playerTracker && client.playerTracker.isBot).length;
    }
    defaultPlayerResources() {
        return this.profileProgressStore && typeof this.profileProgressStore.getStarterResources === "function" ? this.profileProgressStore.getStarterResources() : {
            freezes: 20,
            shields: 20,
            spikes: 20
        };
    }
    defaultPlayerAbilityEffects() {
        return {
            speedMultiplier: 1,
            startMassMultiplier: 1,
            ejectCooldownTicks: this.config.ejectCooldown,
            shieldCooldownMs: 20000,
            shieldDurationMs: 5000,
            freezeCooldownMs: 12000,
            freezeDurationMs: 3500,
            spikeCooldownMs: 12000
        };
    }
    buildPlayerAbilityEffects(abilities) {
        let safeAbilities = abilities || {},
            speedLevel = Math.max(0, Math.min(50, Math.round(safeAbilities.speed && safeAbilities.speed.level || 0))),
            massLevel = Math.max(0, Math.min(50, Math.round(safeAbilities.mass && safeAbilities.mass.level || 0))),
            shieldCooldownLevel = Math.max(0, Math.min(50, Math.round(safeAbilities.shieldCooldown && safeAbilities.shieldCooldown.level || 0))),
            shieldDurationLevel = Math.max(0, Math.min(50, Math.round(safeAbilities.shieldDuration && safeAbilities.shieldDuration.level || 0))),
            spikeCooldownLevel = Math.max(0, Math.min(50, Math.round(safeAbilities.spikeCooldown && safeAbilities.spikeCooldown.level || 0))),
            freezeCooldownLevel = Math.max(0, Math.min(50, Math.round(safeAbilities.freezeCooldown && safeAbilities.freezeCooldown.level || 0))),
            freezeDurationLevel = Math.max(0, Math.min(50, Math.round(safeAbilities.freezeDuration && safeAbilities.freezeDuration.level || 0))),
            ejectLevel = Math.max(0, Math.min(50, Math.round(safeAbilities.massEjectCooldown && safeAbilities.massEjectCooldown.level || 0)));
        return {
            speedMultiplier: 1 + speedLevel * 0.006,
            startMassMultiplier: 1 + massLevel * 0.005,
            ejectCooldownTicks: Math.max(1, this.config.ejectCooldown - ejectLevel * 0.02),
            shieldCooldownMs: Math.max(10000, Math.round(20000 * (1 - shieldCooldownLevel * 0.012))),
            shieldDurationMs: Math.min(8000, 5000 + shieldDurationLevel * 30),
            freezeCooldownMs: Math.max(6000, Math.round(12000 * (1 - freezeCooldownLevel * 0.012))),
            freezeDurationMs: Math.min(6500, 3500 + freezeDurationLevel * 25),
            spikeCooldownMs: Math.max(5000, Math.round(12000 * (1 - spikeCooldownLevel * 0.012)))
        };
    }
    resolvePlayerAbilityLoadout(identityInput) {
        let summary = this.profileProgressStore.buildSummary(identityInput);
        return {
            abilities: summary.abilities || {},
            effects: this.buildPlayerAbilityEffects(summary.abilities || {}),
            resources: summary.resources || this.defaultPlayerResources()
        };
    }
    getPlayerIdentity(client) {
        if (!client) return "Pilot-07";
        if (client.userAuth) return this.playerAuth.toProfileIdentity(client.userAuth, client.userAuth.nameLocked ? client.userAuth.displayName : client._name);
        return client._name || "Pilot-07";
    }
    getAbilityAnchorCell(client) {
        if (!client || !client.cells || !client.cells.length) return null;
        let mouseX = client.mouse && isFinite(client.mouse.x) ? client.mouse.x : NaN,
            mouseY = client.mouse && isFinite(client.mouse.y) ? client.mouse.y : NaN;
        if (!isFinite(mouseX) || !isFinite(mouseY)) return client.cells.reduce((largest, cell) => !largest || cell && cell._size > largest._size ? cell : largest, null);
        return client.cells.reduce((closest, cell) => {
            if (!cell) return closest;
            if (!closest) return cell;
            let currentDx = mouseX - cell.position.x,
                currentDy = mouseY - cell.position.y,
                bestDx = mouseX - closest.position.x,
                bestDy = mouseY - closest.position.y;
            return currentDx * currentDx + currentDy * currentDy < bestDx * bestDx + bestDy * bestDy ? cell : closest;
        }, null);
    }
    syncPlayerProfileState(client, summary) {
        if (!client || !summary) return summary;
        client.profileResources = Object.assign(this.defaultPlayerResources(), summary.resources || {});
        client.profileAbilities = summary.abilities || {};
        client.profileAbilityEffects = this.buildPlayerAbilityEffects(summary.abilities || {});
        return summary;
    }
    isShieldActive(client, now) {
        let stamp = now || this.stepDateTime || Date.now();
        return !!(client && client.noxAbilityState && client.noxAbilityState.shieldUntil > stamp);
    }
    isFrozen(client, now) {
        let stamp = now || this.stepDateTime || Date.now();
        return !!(client && (client.frozen || (client.noxAbilityState && client.noxAbilityState.frozenUntil > stamp)));
    }
    isProtectedFromPlayerEat(client, now) {
        return this.isShieldActive(client, now) || this.isFrozen(client, now);
    }
    sendPlayerAbilityNotice(client, title, message, color) {
        if (!client || !client._name) return;
        this.sendFeedEvent(title || "NOX", message, color || {
            r: 246,
            g: 196,
            b: 83
        }, client);
    }
    spendPlayerResource(client, resourceKey, amount) {
        let result = this.profileProgressStore.consumeResource(this.getPlayerIdentity(client), resourceKey, amount);
        if (result && result.summary) this.syncPlayerProfileState(client, result.summary);
        return result;
    }
    setPlayerResourceCount(clientOrIdentity, resourceKey, amount) {
        let identity = clientOrIdentity && clientOrIdentity._name != null ? this.getPlayerIdentity(clientOrIdentity) : clientOrIdentity,
            result = this.profileProgressStore.setResourceCount(identity, resourceKey, amount);
        if (clientOrIdentity && clientOrIdentity._name != null && result && result.summary) this.syncPlayerProfileState(clientOrIdentity, result.summary);
        return result;
    }
    updateTimedPlayerStates(client, now) {
        if (!client || !client.noxAbilityState) return;
        let stamp = now || this.stepDateTime || Date.now();
        if (client.noxPlacedSpikes && client.noxPlacedSpikes.length) client.noxPlacedSpikes = client.noxPlacedSpikes.filter(node => node && !node.isRemoved);
        if (client.noxAbilityState.frozenUntil && client.noxAbilityState.frozenUntil <= stamp) client.noxAbilityState.frozenUntil = 0;
        if (client.noxAbilityState.shieldUntil && client.noxAbilityState.shieldUntil <= stamp) client.noxAbilityState.shieldUntil = 0;
    }
    applyFreezeToPlayer(client, sourceOwner) {
        if (!client || !client.cells || !client.cells.length) return false;
        let now = this.stepDateTime || Date.now(),
            effects = sourceOwner && sourceOwner.profileAbilityEffects ? sourceOwner.profileAbilityEffects : this.defaultPlayerAbilityEffects();
        client.noxAbilityState.frozenUntil = Math.max(client.noxAbilityState.frozenUntil || 0, now + Math.max(250, Math.round(effects.freezeDurationMs || 1500)));
        for (let i = 0; i < client.cells.length; i++) {
            let cell = client.cells[i];
            if (!cell) continue;
            cell.isMoving = false;
            cell.boostDistance = 0;
        }
        this.sendPlayerAbilityNotice(client, "Freeze", "You were frozen.", {
            r: 110,
            g: 224,
            b: 255
        });
        if (sourceOwner && sourceOwner !== client && sourceOwner._name) this.sendFeedEvent(sourceOwner._name, "froze " + (client._name || "a pilot"), {
            r: 110,
            g: 224,
            b: 255
        });
        return true;
    }
    applySpikeToCell(cell, sourceOwner) {
        if (!cell || cell.cellType !== 0 || !cell.owner || cell.isRemoved) return false;
        let fauxVirus = new Entity.Virus(this, null, {
            x: cell.position.x,
            y: cell.position.y
        }, this.config.virusMinSize);
        fauxVirus.onEaten(cell);
        this.sendPlayerAbilityNotice(cell.owner, "Spike", "You were spiked.", {
            r: 255,
            g: 118,
            b: 78
        });
        if (sourceOwner && sourceOwner !== cell.owner && sourceOwner._name) this.sendFeedEvent(sourceOwner._name, "spiked " + (cell.owner._name || "a pilot"), {
            r: 255,
            g: 118,
            b: 78
        });
        return true;
    }
    activateShield(client) {
        if (!client || !client.cells || !client.cells.length || client.isSpectating) return false;
        let now = this.stepDateTime || Date.now(),
            state = client.noxAbilityState || (client.noxAbilityState = {});
        if (this.isFrozen(client, now)) return this.sendPlayerAbilityNotice(client, "Shield", "You cannot shield while frozen."), false;
        if (this.isShieldActive(client, now)) return this.sendPlayerAbilityNotice(client, "Shield", "Shield is already active."), false;
        if ((state.shieldCooldownUntil || 0) > now) return this.sendPlayerAbilityNotice(client, "Shield", "Shield is still cooling down."), false;
        let spend = this.spendPlayerResource(client, "shields", 1);
        if (!spend || !spend.ok) return this.sendPlayerAbilityNotice(client, "Shield", "No shield charges left."), false;
        let effects = client.profileAbilityEffects || this.defaultPlayerAbilityEffects();
        state.shieldUntil = now + Math.max(300, Math.round(effects.shieldDurationMs || 2500));
        state.shieldCooldownUntil = now + Math.max(1000, Math.round(effects.shieldCooldownMs || 16000));
        this.sendPlayerAbilityNotice(client, "Shield", "Barrier active.", {
            r: 255,
            g: 214,
            b: 92
        });
        return true;
    }
    launchFreeze(client) {
        if (!client || !client.cells || !client.cells.length || client.isSpectating) return false;
        let now = this.stepDateTime || Date.now(),
            state = client.noxAbilityState || (client.noxAbilityState = {});
        if (this.isFrozen(client, now)) return this.sendPlayerAbilityNotice(client, "Freeze", "You cannot launch freeze while frozen."), false;
        if ((state.freezeCooldownUntil || 0) > now) return this.sendPlayerAbilityNotice(client, "Freeze", "Freeze is still cooling down."), false;
        let spend = this.spendPlayerResource(client, "freezes", 1);
        if (!spend || !spend.ok) return this.sendPlayerAbilityNotice(client, "Freeze", "No freeze charges left."), false;
        let anchor = this.getAbilityAnchorCell(client);
        if (!anchor) return false;
        let dx = client.mouse.x - anchor.position.x,
            dy = client.mouse.y - anchor.position.y,
            squared = dx * dx + dy * dy;
        if (squared > 1) {
            let dist = Math.sqrt(squared);
            dx /= dist;
            dy /= dist;
        } else {
            dx = 0;
            dy = -1;
        }
        let size = 28,
            pos = {
                x: anchor.position.x + dx * (anchor._size + size * 0.7),
                y: anchor.position.y + dy * (anchor._size + size * 0.7)
            },
            angle = Math.atan2(dx, dy),
            orb = new Entity.FreezeOrb(this, client, pos, size),
            effects = client.profileAbilityEffects || this.defaultPlayerAbilityEffects();
        orb.setBoost(980, angle);
        this.addNode(orb);
        state.freezeCooldownUntil = now + Math.max(1000, Math.round(effects.freezeCooldownMs || 12000));
        this.sendPlayerAbilityNotice(client, "Freeze", "Freeze orb launched.", {
            r: 110,
            g: 224,
            b: 255
        });
        return true;
    }
    deploySpike(client) {
        if (!client || !client.cells || !client.cells.length || client.isSpectating) return false;
        let now = this.stepDateTime || Date.now(),
            state = client.noxAbilityState || (client.noxAbilityState = {});
        if (this.isFrozen(client, now)) return this.sendPlayerAbilityNotice(client, "Spike", "You cannot deploy a spike while frozen."), false;
        if ((state.spikeCooldownUntil || 0) > now) return this.sendPlayerAbilityNotice(client, "Spike", "Spike is still cooling down."), false;
        let spend = this.spendPlayerResource(client, "spikes", 1);
        if (!spend || !spend.ok) return this.sendPlayerAbilityNotice(client, "Spike", "No spike charges left."), false;
        let anchor = this.getAbilityAnchorCell(client);
        if (!anchor) return false;
        let dx = client.mouse.x - anchor.position.x,
            dy = client.mouse.y - anchor.position.y,
            squared = dx * dx + dy * dy;
        if (squared > 1) {
            let dist = Math.sqrt(squared);
            dx /= dist;
            dy /= dist;
        } else {
            dx = 0;
            dy = -1;
        }
        let size = 30,
            pos = {
                x: anchor.position.x + dx * (anchor._size + size * 0.85),
                y: anchor.position.y + dy * (anchor._size + size * 0.85)
            };
        let angle = Math.atan2(dx, dy),
            spike = new Entity.SpikeOrb(this, client, pos, size),
            effects = client.profileAbilityEffects || this.defaultPlayerAbilityEffects();
        spike.setBoost(960, angle);
        this.addNode(spike);
        state.spikeCooldownUntil = now + Math.max(1000, Math.round(effects.spikeCooldownMs || 12000));
        this.sendPlayerAbilityNotice(client, "Spike", "Spike orb launched.", {
            r: 255,
            g: 118,
            b: 62
        });
        return true;
    }
    buildAdminPlayerResults(query) {
        let safeQuery = ((query || "").trim()).toLowerCase(),
            rows = [],
            seen = {},
            online = this.getOnlineHumanTrackers(),
            profiles = this.profileProgressStore.findProfiles(query, 25);
        for (let i = 0; i < profiles.length; i++) {
            let profile = profiles[i],
                onlineMatch = online.find(item => profile.accountKey && item.userAuth && item.userAuth.accountKey === profile.accountKey || item._name && item._name.toLowerCase() === profile.name.toLowerCase()),
                key = (profile.accountKey || profile.name).toLowerCase();
            if (seen[key]) continue;
            seen[key] = true;
            rows.push({
                lookupKey: profile.accountKey || profile.name,
                name: profile.name,
                playerId: onlineMatch ? onlineMatch.pID : null,
                online: !!onlineMatch,
                coins: profile.coins || 0,
                authProvider: profile.authProvider || "guest"
            });
        }
        for (let i = 0; i < online.length; i++) {
            let tracker = online[i],
                name = tracker._name || ("Player-" + tracker.pID),
                key = name.toLowerCase();
            if (seen[key]) continue;
            if (safeQuery && key.indexOf(safeQuery) < 0 && String(tracker.pID) !== safeQuery) continue;
            seen[key] = true;
            rows.push({
                lookupKey: name,
                name: name,
                playerId: tracker.pID,
                online: true,
                coins: this.profileProgressStore.buildSummary(name).coins || 0,
                authProvider: tracker.userAuth && tracker.userAuth.provider ? tracker.userAuth.provider : "guest"
            });
        }
        return rows.slice(0, 25);
    }
    buildAdminPlayerDetail(lookupValue) {
        let rawLookup = decodeURIComponent(lookupValue || "").trim(),
            tracker = this.findOnlineHumanTracker(rawLookup),
            identity = tracker ? this.getPlayerIdentity(tracker) : this.resolveAdminPlayerIdentity(rawLookup),
            summary = this.profileProgressStore.buildSummary(identity),
            moderation = this.adminStore.getPlayerModeration(summary.name),
            abilityEffects = this.buildPlayerAbilityEffects(summary.abilities || {});
        return {
            lookupKey: summary.accountKey || summary.name,
            name: summary.name,
            playerId: tracker ? tracker.pID : null,
            online: !!tracker,
            accountKey: summary.accountKey || "",
            authProvider: summary.authProvider || "guest",
            nameLocked: !!summary.nameLocked,
            level: Math.max(1, Math.floor((summary.totalXp || 0) / 1000) + 1),
            totalXp: summary.totalXp || 0,
            coins: summary.coins || 0,
            gamesPlayed: summary.gamesPlayed || 0,
            totalWins: summary.totalWins || 0,
            totalKills: summary.totalKills || 0,
            totalTimePlayedSeconds: summary.totalTimePlayedSeconds || 0,
            lastSeen: summary.lastSeen || null,
            skin: summary.skin || "Base",
            lastRun: summary.lastRun || null,
            abilities: summary.abilities || {},
            abilityEffects: abilityEffects,
            resources: summary.resources || this.defaultPlayerResources(),
            moderation: moderation
        };
    }
    handleAdminSession(req, res) {
        let session = this.adminAuth.getSession(req);
        return this.sendJson(res, 200, session ? {
            authenticated: true,
            username: session.username,
            role: session.role,
            csrfToken: session.csrfToken,
            panelUrl: "/admin"
        } : {
            authenticated: false
        });
    }
    handleAdminLogin(req, res) {
        this.readJsonBody(req, 32 * 1024).then(payload => {
            let result = this.adminAuth.login(req, res, payload && payload.username, payload && payload.password);
            this.sendJson(res, result.ok ? 200 : result.status, result.ok ? {
                ok: true,
                username: result.session.username,
                role: result.session.role,
                csrfToken: result.session.csrfToken
            } : {
                ok: false,
                error: result.error
            });
        }).catch(error => {
            this.sendJson(res, 400, {
                ok: false,
                error: error.message
            });
        });
    }
    handleAdminLogout(req, res) {
        this.adminAuth.logout(req, res);
        this.sendJson(res, 200, {
            ok: true
        });
    }
    handlePlayerSession(req, res) {
        let session = this.playerAuth.getSession(req);
        return this.sendJson(res, 200, this.playerAuth.publicSession(session));
    }
    handleClientConfig(req, res) {
        this.sendJson(res, 200, {
            telegramLaunchUrl: String(process.env.NOX_TELEGRAM_LAUNCH_URL || "").trim(),
            telegramLoginConfigured: !!String(process.env.NOX_TELEGRAM_BOT_TOKEN || "").trim(),
            maintenanceMode: this.adminStore.isMaintenanceEnabled()
        });
    }
    handleGuestSession(req, res) {
        this.readJsonBody(req, 32 * 1024).then(payload => {
            let session = this.playerAuth.createGuestSession(req, res, payload && payload.name);
            this.sendJson(res, 200, session);
        }).catch(error => this.sendJson(res, 400, {
            ok: false,
            error: error.message
        }));
    }
    handleTelegramSession(req, res) {
        this.readJsonBody(req, 64 * 1024).then(payload => {
            let result = this.playerAuth.createTelegramSession(req, res, payload && payload.initData);
            this.sendJson(res, result.ok ? 200 : result.status, result.ok ? result.session : {
                ok: false,
                error: result.error
            });
        }).catch(error => this.sendJson(res, 400, {
            ok: false,
            error: error.message
        }));
    }
    handleProfileProgress(req, res, requestURL) {
        let auth = this.playerAuth.requireSession(req, false);
        if (!auth.ok) return this.sendJson(res, auth.status, {
            ok: false,
            error: auth.error
        });
        let session = auth.session,
            requestedName = requestURL.searchParams.get("name") || "";
        if (requestedName) session = this.playerAuth.updateDisplayName(req, res, session, requestedName);
        let summary = this.profileProgressStore.buildSummary(this.playerAuth.toProfileIdentity(session));
        this.sendJson(res, 200, summary);
    }
    handleAdminApi(req, res, requestURL) {
        let auth = this.adminAuth.requireAdmin(req, req.method !== "GET");
        if (!auth.ok) return this.sendJson(res, auth.status, {
            ok: false,
            error: auth.error
        });
        if (req.method === "GET" && requestURL.pathname === "/admin/api/overview") return this.sendJson(res, 200, this.adminStore.buildOverview(this, this.profileProgressStore, this.supportStore));
        if (req.method === "GET" && requestURL.pathname === "/admin/api/live-ops") return this.sendJson(res, 200, {
            server: {
                name: this.config.serverName,
                players: this.getOnlineHumanTrackers().length,
                bots: this.getOnlineBotCount(),
                updateMsAverage: Number((this.updateTimeAvg || 0).toFixed(2))
            },
            featureFlags: this.adminStore.getFeatureFlags()
        });
        if (req.method === "GET" && requestURL.pathname === "/admin/api/players") return this.sendJson(res, 200, {
            results: this.buildAdminPlayerResults(requestURL.searchParams.get("query") || "")
        });
        if (req.method === "GET" && requestURL.pathname.indexOf("/admin/api/players/") === 0) return this.sendJson(res, 200, this.buildAdminPlayerDetail(requestURL.pathname.split("/").pop()));
        if (req.method === "GET" && requestURL.pathname === "/admin/api/analytics") return this.sendJson(res, 200, this.adminStore.buildAnalytics(30));
        if (req.method === "GET" && requestURL.pathname === "/admin/api/settings") return this.sendJson(res, 200, {
            featureFlags: this.adminStore.getFeatureFlags()
        });
        if (req.method === "GET" && requestURL.pathname === "/admin/api/logs") return this.sendJson(res, 200, {
            logs: this.adminStore.listAudit(Number(requestURL.searchParams.get("limit") || 100))
        });
        if (req.method === "POST" && requestURL.pathname === "/admin/api/live-ops/broadcast") return this.handleAdminBroadcast(req, res, auth.session);
        if (req.method === "POST" && requestURL.pathname === "/admin/api/players/coins") return this.handleAdminPlayerCoins(req, res, auth.session);
        if (req.method === "POST" && requestURL.pathname === "/admin/api/players/resources") return this.handleAdminPlayerResources(req, res, auth.session);
        if (req.method === "POST" && requestURL.pathname === "/admin/api/players/mute") return this.handleAdminPlayerMute(req, res, auth.session);
        if (req.method === "POST" && requestURL.pathname === "/admin/api/players/unmute") return this.handleAdminPlayerUnmute(req, res, auth.session);
        if (req.method === "POST" && requestURL.pathname === "/admin/api/players/ban") return this.handleAdminPlayerBan(req, res, auth.session);
        if (req.method === "POST" && requestURL.pathname === "/admin/api/settings/feature-flags") return this.handleAdminFeatureFlags(req, res, auth.session);
        return this.sendJson(res, 404, {
            ok: false,
            error: "Admin route not found."
        });
    }
    handleAdminBroadcast(req, res, session) {
        this.readJsonBody(req, 32 * 1024).then(payload => {
            let message = ((payload && payload.message) || "").trim().slice(0, 180);
            if (!message) return this.sendJson(res, 400, {
                ok: false,
                error: "Broadcast message is required."
            });
            let broadcastSender = {
                _name: "NOX",
                userRole: 0,
                cells: [{
                    color: {
                        r: 110,
                        g: 231,
                        b: 255
                    }
                }]
            };
            this.sendChatMessage(broadcastSender, null, message);
            this.sendFeedEvent("NOX", message, {
                r: 110,
                g: 231,
                b: 255
            });
            this.adminStore.appendAudit({
                actor: session.username,
                action: "liveops.broadcast",
                targetType: "system",
                target: "arena-feed",
                after: {
                    message: message
                },
                ip: this.adminAuth.getIp(req)
            });
            this.sendJson(res, 200, {
                ok: true
            });
        }).catch(error => this.sendJson(res, 400, {
            ok: false,
            error: error.message
        }));
    }
    handleAdminPlayerCoins(req, res, session) {
        this.readJsonBody(req, 32 * 1024).then(payload => {
            let lookupKey = (payload && (payload.lookupKey || payload.name) || "").trim(),
                nextCoins = Number(payload && payload.coins);
            if (!lookupKey || !isFinite(nextCoins)) return this.sendJson(res, 400, {
                ok: false,
                error: "Valid player lookup and coin value are required."
            });
            let identity = this.resolveAdminPlayerIdentity(lookupKey),
                before = this.profileProgressStore.buildSummary(identity),
                summary = this.profileProgressStore.touchProfile(identity, {
                    coins: nextCoins
                });
            let tracker = this.findOnlineHumanTracker(lookupKey);
            if (tracker) this.syncPlayerProfileState(tracker, summary);
            this.adminStore.appendAudit({
                actor: session.username,
                action: "player.coins.set",
                targetType: "player",
                target: summary.accountKey || summary.name,
                before: {
                    coins: before.coins
                },
                after: {
                    coins: summary.coins
                },
                ip: this.adminAuth.getIp(req)
            });
            this.sendJson(res, 200, {
                ok: true,
                summary: summary
            });
        }).catch(error => this.sendJson(res, 400, {
            ok: false,
            error: error.message
        }));
    }
    handleAdminPlayerResources(req, res, session) {
        this.readJsonBody(req, 32 * 1024).then(payload => {
            let lookupKey = (payload && (payload.lookupKey || payload.name) || "").trim(),
                resourceKey = String(payload && payload.resourceKey || "").trim(),
                mode = String(payload && payload.mode || "set").trim().toLowerCase(),
                amount = Number(payload && payload.amount),
                resourceDefaults = this.defaultPlayerResources();
            if (!lookupKey || !Object.prototype.hasOwnProperty.call(resourceDefaults, resourceKey) || !isFinite(amount)) return this.sendJson(res, 400, {
                ok: false,
                error: "Valid player lookup, resource key, and amount are required."
            });
            let identity = this.resolveAdminPlayerIdentity(lookupKey),
                before = this.profileProgressStore.buildSummary(identity),
                currentValue = Math.max(0, Math.round(before.resources && before.resources[resourceKey] || 0)),
                nextValue = mode === "delta" ? currentValue + Math.round(amount) : Math.round(amount);
            nextValue = Math.max(0, nextValue);
            let tracker = this.findOnlineHumanTracker(lookupKey),
                result = this.setPlayerResourceCount(tracker || identity, resourceKey, nextValue),
                summary = result && result.summary ? result.summary : this.profileProgressStore.buildSummary(identity);
            this.adminStore.appendAudit({
                actor: session.username,
                action: "player.resource.set",
                targetType: "player",
                target: summary.accountKey || summary.name,
                before: {
                    resourceKey: resourceKey,
                    amount: currentValue
                },
                after: {
                    resourceKey: resourceKey,
                    amount: Math.max(0, Math.round(summary.resources && summary.resources[resourceKey] || 0))
                },
                ip: this.adminAuth.getIp(req)
            });
            this.sendJson(res, 200, {
                ok: true,
                summary: summary
            });
        }).catch(error => this.sendJson(res, 400, {
            ok: false,
            error: error.message
        }));
    }
    handleAdminPlayerMute(req, res, session) {
        this.readJsonBody(req, 32 * 1024).then(payload => {
            let name = (payload && payload.name || "").trim(),
                minutes = Number(payload && payload.minutes);
            if (!name || !isFinite(minutes)) return this.sendJson(res, 400, {
                ok: false,
                error: "Valid player name and mute duration are required."
            });
            let moderation = this.adminStore.setPlayerMute(name, minutes, session.username, this.adminAuth.getIp(req));
            this.getOnlineHumanTrackers().forEach(player => {
                if (player._name && player._name.toLowerCase() === name.toLowerCase()) player.isMuted = true;
            });
            this.sendJson(res, 200, {
                ok: true,
                moderation: moderation
            });
        }).catch(error => this.sendJson(res, 400, {
            ok: false,
            error: error.message
        }));
    }
    handleAdminPlayerUnmute(req, res, session) {
        this.readJsonBody(req, 32 * 1024).then(payload => {
            let name = (payload && payload.name || "").trim();
            if (!name) return this.sendJson(res, 400, {
                ok: false,
                error: "Valid player name is required."
            });
            let moderation = this.adminStore.clearPlayerMute(name, session.username, this.adminAuth.getIp(req));
            this.getOnlineHumanTrackers().forEach(player => {
                if (player._name && player._name.toLowerCase() === name.toLowerCase()) player.isMuted = false;
            });
            this.sendJson(res, 200, {
                ok: true,
                moderation: moderation
            });
        }).catch(error => this.sendJson(res, 400, {
            ok: false,
            error: error.message
        }));
    }
    handleAdminPlayerBan(req, res, session) {
        this.readJsonBody(req, 32 * 1024).then(payload => {
            let name = (payload && payload.name || "").trim(),
                banned = !!(payload && payload.banned);
            if (!name) return this.sendJson(res, 400, {
                ok: false,
                error: "Valid player name is required."
            });
            let moderation = this.adminStore.setPlayerBan(name, banned, session.username, this.adminAuth.getIp(req));
            if (banned) this.getOnlineHumanTrackers().forEach(player => {
                if (player._name && player._name.toLowerCase() === name.toLowerCase()) {
                    this.sendChatMessage(null, player, "You have been removed by a NOX admin.");
                    if (player.socket && typeof player.socket.close === "function") player.socket.close(1000, "Banned");
                }
            });
            this.sendJson(res, 200, {
                ok: true,
                moderation: moderation
            });
        }).catch(error => this.sendJson(res, 400, {
            ok: false,
            error: error.message
        }));
    }
    handleAdminFeatureFlags(req, res, session) {
        this.readJsonBody(req, 32 * 1024).then(payload => {
            let input = payload && payload.featureFlags ? payload.featureFlags : {},
                keys = Object.keys(input);
            for (let i = 0; i < keys.length; i++) this.adminStore.setFeatureFlag(keys[i], !!input[keys[i]], session.username, this.adminAuth.getIp(req));
            this.sendJson(res, 200, {
                ok: true,
                featureFlags: this.adminStore.getFeatureFlags()
            });
        }).catch(error => this.sendJson(res, 400, {
            ok: false,
            error: error.message
        }));
    }
    sendJson(res, statusCode, payload) {
        res.writeHead(statusCode, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
        });
        res.end(JSON.stringify(payload));
    }
    readJsonBody(req, limitBytes) {
        return new Promise((resolve, reject) => {
            let chunks = [],
                size = 0;
            req.on("data", chunk => {
                size += chunk.length;
                if (size > limitBytes) {
                    reject(new Error("Payload too large."));
                    req.destroy();
                    return;
                }
                chunks.push(chunk);
            });
            req.on("end", () => {
                try {
                    let body = Buffer.concat(chunks).toString("utf8");
                    resolve(body ? JSON.parse(body) : {});
                } catch (error) {
                    reject(new Error("Invalid JSON body."));
                }
            });
            req.on("error", reject);
        });
    }
    handleSupportReport(req, res) {
        this.readJsonBody(req, 6 * 1024 * 1024).then(payload => {
            let playerSession = this.playerAuth.getSession(req);
            if (playerSession) {
                payload = Object.assign({}, payload || {}, {
                    username: playerSession.displayName,
                    accountKey: playerSession.accountKey,
                    authProvider: playerSession.provider
                });
            }
            let report = this.supportStore.createReport(payload);
            return Promise.resolve(this.telegramRelay.relay(report)).then(relayResult => {
                this.supportStore.markRelay(report.id, relayResult.status, relayResult.message);
                this.sendJson(res, 200, {
                    ok: true,
                    id: report.id,
                    relayStatus: relayResult.status,
                    message: relayResult.message
                });
            }).catch(error => {
                this.supportStore.markRelay(report.id, "queued", "Telegram relay failed: " + error.message);
                this.sendJson(res, 200, {
                    ok: true,
                    id: report.id,
                    relayStatus: "queued",
                    message: "Report saved locally. Telegram relay will work once binding is added."
                });
            });
        }).catch(error => {
            this.sendJson(res, 400, {
                ok: false,
                error: error.message
            });
        });
    }
    handleProfileAbilityUpgrade(req, res) {
        let auth = this.playerAuth.requireSession(req, true);
        if (!auth.ok) return this.sendJson(res, auth.status, {
            ok: false,
            error: auth.error
        });
        this.readJsonBody(req, 64 * 1024).then(payload => {
            let result = this.profileProgressStore.upgradeAbility(this.playerAuth.toProfileIdentity(auth.session), payload && payload.abilityKey);
            this.sendJson(res, result.ok ? 200 : 400, result);
        }).catch(error => {
            this.sendJson(res, 400, {
                ok: false,
                error: error.message
            });
        });
    }
    isRankedPlayer(client) {
        return client && !client.isBot && !client.isMi && !client.isMinion;
    }
    getPlayerRunScore(client) {
        return Math.max(0, Math.round((client._score || 0) / 100));
    }
    startPlayerRun(client) {
        if (!this.isRankedPlayer(client)) return;
        client.noxRunStats = {
            active: true,
            spawnedAt: this.stepDateTime || Date.now(),
            maxScore: 0,
            kills: 0,
            foodCollected: 0,
            reachedRankOne: false,
            finalized: false
        };
    }
    trackPlayerRankingProgress(client) {
        if (!this.isRankedPlayer(client) || !client.noxRunStats || !client.noxRunStats.active || !client.cells.length) return;
        client.noxRunStats.maxScore = Math.max(client.noxRunStats.maxScore, this.getPlayerRunScore(client));
    }
    recordPlayerKill(killer, victim) {
        if (killer && victim && !killer.isMi && !killer.isMinion && !victim.isMi && !victim.isMinion) {
            this.sendFeedEvent(killer._name || "An unnamed cell", "ate " + (victim._name || "An unnamed cell"), killer.color);
        }
        if (!this.isRankedPlayer(killer) || !this.isRankedPlayer(victim)) return;
        if (!killer.noxRunStats || !killer.noxRunStats.active) return;
        killer.noxRunStats.kills += 1;
    }
    recordPlayerFoodPickup(player) {
        if (!this.isRankedPlayer(player) || !player.noxRunStats || !player.noxRunStats.active) return;
        player.noxRunStats.foodCollected += 1;
    }
    calculateRunCoins(run) {
        if (!run) return 0;
        let kills = Math.max(0, Math.round(run.kills || 0)),
            foodCollected = Math.max(0, Math.round(run.foodCollected || 0)),
            timePlayedSeconds = Math.max(0, Math.round(run.timePlayedSeconds || 0)),
            killCoins = kills * 8,
            timeCoins = Math.floor(timePlayedSeconds / 45),
            foodCoins = Math.floor(foodCollected / 30),
            total = killCoins + timeCoins + foodCoins;
        if (!total && (kills > 0 || foodCollected >= 10 || timePlayedSeconds >= 30)) total = 1;
        return Math.max(0, total);
    }
    calculateRunXp(run) {
        if (!run) return 0;
        let kills = Math.max(0, Math.round(run.kills || 0)),
            foodCollected = Math.max(0, Math.round(run.foodCollected || 0)),
            timePlayedSeconds = Math.max(0, Math.round(run.timePlayedSeconds || 0)),
            score = Math.max(0, Math.round(run.score || 0)),
            killXp = kills * 24,
            timeXp = Math.floor(timePlayedSeconds / 15) * 4,
            foodXp = Math.floor(foodCollected / 20) * 2,
            scoreXp = Math.floor(score / 12),
            total = killXp + timeXp + foodXp + scoreXp;
        if (!total && (kills > 0 || foodCollected > 0 || timePlayedSeconds >= 10 || score > 0)) total = 6;
        return Math.max(0, total);
    }
    finalizePlayerRun(client) {
        if (!this.isRankedPlayer(client) || !client.noxRunStats || client.noxRunStats.finalized) return;
        client.noxRunStats.active = false;
        client.noxRunStats.finalized = true;
        client.noxRunStats.maxScore = Math.max(client.noxRunStats.maxScore, this.getPlayerRunScore(client));
        let run = {
            name: client._name || "Anonymous",
            skin: client._skin || "",
            score: client.noxRunStats.maxScore,
            kills: client.noxRunStats.kills,
            foodCollected: client.noxRunStats.foodCollected || 0,
            won: !!client.noxRunStats.reachedRankOne,
            timePlayedSeconds: Math.max(0, Math.round(((this.stepDateTime || Date.now()) - client.noxRunStats.spawnedAt) / 1000)),
            finishedAt: new Date(this.stepDateTime || Date.now()).toISOString()
        };
        if (!run.score && !run.kills && !run.foodCollected && run.timePlayedSeconds < 15) return;
        this.rankingStore.recordRun(run);
        this.profileProgressStore.recordRun(Object.assign({}, run, {
            accountKey: client.userAuth && client.userAuth.accountKey ? client.userAuth.accountKey : "",
            authProvider: client.userAuth && client.userAuth.provider ? client.userAuth.provider : "guest",
            nameLocked: !!(client.userAuth && client.userAuth.nameLocked),
            telegramUserId: client.userAuth && client.userAuth.telegramUserId ? client.userAuth.telegramUserId : null,
            coinsAwarded: this.calculateRunCoins(run),
            xpAwarded: this.calculateRunXp(run)
        }));
        this.adminStore.noteRun(run);
    }
    updateTimedViruses() {
        let now = Date.now();
        for (let i = this.nodesVirus.length - 1; i >= 0; i--) {
            let virus = this.nodesVirus[i];
            if (!virus || virus.isRemoved || !virus.isExpired || !virus.isExpired(now)) continue;
            this.removeNode(virus);
        }
    }
    updateTimedFreezeOrbs() {
        let now = Date.now();
        for (let i = this.nodesEject.length - 1; i >= 0; i--) {
            let orb = this.nodesEject[i];
            if (!orb || orb.isRemoved || (!orb.isFreezeOrb && !orb.isSpikeOrb) || !orb.isExpired || !orb.isExpired(now)) continue;
            this.removeNode(orb);
        }
    }
    shootVirus(parent, angle, options) {
        let pos = {
                x: parent.position.x,
                y: parent.position.y
            },
            virus = new Entity.Virus(this, null, pos, this.config.virusMinSize),
            settings = options || {};
        virus.setFeedProfile(
            settings.feedShotsMax != null ? settings.feedShotsMax : this.config.virusSpawnFeedShots,
            settings.expiresAt != null ? settings.expiresAt : Date.now() + this.config.virusSpawnLifetimeMs
        );
        virus.setBoost(this.config.virusEjectSpeed, angle);
        this.addNode(virus);
        return virus;
    }
    loadConfig() {
        let config = "../src/config.ini";
        try {
            if (fs.existsSync(config)) {
                let i = ini.parse(fs.readFileSync(config, "utf-8"));
                for (let r in i) this.config.hasOwnProperty(r) ? this.config[r] = i[r] : Log.error("Unknown config.ini value: " + r + "!");
            } else Log.warn("Config file not found! Generating new config..."),
            fs.writeFileSync(config, ini.stringify(this.config), "utf-8");
        } catch (ini) {
            Log.error(ini.stack);
            Log.error("Failed to load " + config + ": " + ini.message + "!");
        }
        this.config.playerMinDecay = Math.max(32, this.config.playerMinDecay);
        Log.setVerbosity(this.config.logVerbosity);
        Log.setFileVerbosity(this.config.logFileVerbosity);
    }
    applyEnvOverrides() {
        let env = process.env;
        if (env.NOX_SERVER_PORT && isFinite(Number(env.NOX_SERVER_PORT))) this.config.serverPort = Math.max(1, Number(env.NOX_SERVER_PORT));
        if (env.NOX_SERVER_BIND) this.config.serverBind = String(env.NOX_SERVER_BIND).trim() || this.config.serverBind;
        if (env.NOX_SERVER_NAME) this.config.serverName = String(env.NOX_SERVER_NAME).trim() || this.config.serverName;
        if (env.NOX_CLIENT_BIND) this.config.clientBind = String(env.NOX_CLIENT_BIND).trim();
        if (env.NOX_SERVER_CHAT_PASSWORD) this.config.serverChatPassword = String(env.NOX_SERVER_CHAT_PASSWORD).trim() || this.config.serverChatPassword;
        if (env.NOX_SERVER_STATS_PORT && isFinite(Number(env.NOX_SERVER_STATS_PORT))) this.config.serverStatsPort = Math.max(0, Number(env.NOX_SERVER_STATS_PORT));
    }
    loadBadWords() {
        let badWordFile = "../src/txt/badwords.txt";
        try {
            if (!fs.existsSync(badWordFile)) Log.warn(badWordFile + " not found!");
            else {
                let words = fs.readFileSync(badWordFile, "utf-8");
                words = words.split(/[\r\n]+/).map(arg => " " + arg.trim().toLowerCase() + " ").filter(arg => arg.length > 2);
                this.badWords = words;
                Log.info(this.badWords.length + " bad words loaded.");
            }
        } catch (err) {
            Log.error(err.stack);
            Log.error("Failed to load " + badWordFile + ": " + err.message);
        }
    }
    loadUserList() {
        if (!this.config.serverUserRoles) return Log.info("User roles are disabled.");
        let fileNameUsers = "../src/enum/userRoles.json";
        try {
            this.userList = [];
            if (!fs.existsSync(fileNameUsers)) return Log.warn(fileNameUsers + " is missing.");
            let usersJson = fs.readFileSync(fileNameUsers, "utf-8"),
                list = JSON.parse(usersJson.trim());
            for (let i = 0; i < list.length;) {
                let item = list[i];
                if (!item.hasOwnProperty("ip") || !item.hasOwnProperty("password") || !item.hasOwnProperty("role") || !item.hasOwnProperty("name")) {
                    list.splice(i, 1);
                    continue;
                }
                if (!item.password || !item.password.trim()) {
                    Log.warn("User account \"" + item.name + "\" disabled");
                    list.splice(i, 1);
                    continue;
                }
                if (item.ip) item.ip = item.ip.trim();
                item.password = item.password.trim();
                if (!UserRoleEnum.hasOwnProperty(item.role)) {
                    Log.warn("Unknown user role: " + item.role);
                    item.role = UserRoleEnum.USER;
                } else item.role = UserRoleEnum[item.role];
                item.name = (item.name || "").trim();
                i++;
            }
            this.userList = list;
            Log.info(this.userList.length + " user records loaded.");
        } catch (err) {
            Log.error(err.stack);
            Log.error("Failed to load " + fileNameUsers + ": " + err.message);
        }
    }
    loadBanList() {
        let fileNameIpBan = "../src/txt/ipbanlist.txt";
        try {
            if (fs.existsSync(fileNameIpBan)) {
                this.ipBanList = fs.readFileSync(fileNameIpBan, "utf8").split(/[\r\n]+/).filter(x => x != "");
                Log.info(this.ipBanList.length + " IP ban records loaded.");
            } else Log.warn(fileNameIpBan + " is missing.");
        } catch (err) {
            Log.error(err.stack);
            Log.error("Failed to load " + fileNameIpBan + ": " + err.message);
        }
    }
    startStats(port) {
        this.stats = "Test";
        this.getStats();
        this.statsHttpServer = http.createServer(((req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.writeHead(200);
            res.end(this.stats);
        }).bind(this));
        this.statsHttpServer.on("error", error => {
            Log.error("Stats Server: " + error.message);
        });
        let statsBind = this.getStats.bind(this);
        this.statsHttpServer.listen(port, (() => {
            Log.info("Started stats server on port " + port + ".");
            setInterval(statsBind, this.config.serverStatsUpdate * 1000);
        }).bind(this));
    }
    startStatsServer(port) {
        this.startStats(port);
    }
    getStats() {
        let total = 0,
            alive = 0,
            spectate = 0;
        for (let i = 0; i < this.clients.length; i++) {
            let client = this.clients[i];
            if (!client || !client.isConnected || client.playerTracker.isMi) continue;
            total++;
            if (client.playerTracker.cells.length) alive++;
            else spectate++;
        }
        let data = {
            "server_name": this.config.serverName,
            "server_chat": this.config.serverChat ? "true" : "false",
            "border_width": this.border.width,
            "border_height": this.border.height,
            "gamemode": this.gameMode.name,
            "max_players": this.config.serverMaxConnect,
            "current_players": total,
            "alive": alive,
            "spectators": spectate,
            "update_time": this.updateTimeAvg.toFixed(3),
            "uptime": Math.round((this.stepDateTime - this.startTime) / 1000 / 60),
            "start_time": this.startTime
        };
        this.stats = JSON.stringify(data);
    }
    trackerRequest(options, type, body) {
        if (options.headers == null) options.headers = {};
        options.headers["user-agent"] = "NOX-Arena " + this.version;
        options.headers["content-type"] = type;
        options.headers["content-length"] = body == null ? 0 : Buffer.byteLength(body, "utf8");
        let req = http.request(options, res => {
            if (res.statusCode != 200) return Log.writeError("[Tracker][" + options.host + "]: statusCode = " + res.statusCode);
            res.setEncoding("utf8");
        });
        req.on("error", error => {
            Log.writeError("[Tracker][" + options.host + "]: " + error);
        });
        req.shouldKeepAlive = 0;
        req.on("close", () => {
            req.destroy();
        });
        req.write(body);
        req.end();
    }
    pingServerTracker() {
        let os = require("os"),
            total = 0,
            alive = 0,
            spectate = 0;
            //bots = 0;
        for (let i = 0; i < this.clients.length; i++) {
            let client = this.clients[i];
            if (!client || client.isConnected === false) continue;
            //if (client.isConnected == null) bots++;
            else {
                total++;
                if (client.playerTracker.cells.length > 0) alive++;
                else if (client.playerTracker.isSpectating) spectate++;
            }
        }
        let data = "current_players=" + total +
            "&alive=" + alive +
            "&spectators=" + spectate +
            "&max_players=" + this.config.serverMaxConnect +
            "&sport=" + this.config.serverPort +
            "&gamemode=[**] " + this.gameMode.name +
            "&agario=true" +
            "&name=Unnamed Server" +
            "&opp=" + os.platform() + " " + os.arch() +
            "&uptime=" + process.uptime() +
            "&version=NOX-Arena " + this.version +
            "&start_time=" + this.startTime;
        this.trackerRequest({
            host: "ogar.mivabe.nl",
            port: 80,
            path: "/master",
            method: "POST"
        }, "application/x-www-form-urlencoded", data);
    }
}

WebSocket.prototype.sendPacket = function(packet) {
    let socket = this.playerTracker.socket;
    if (packet == null || socket.isConnected == null || socket.playerTracker.isMi) return;
    if (this.readyState === WebSocket.OPEN) {
        if (this._socket.writable != null && !this._socket.writable) return;
        let buffer = packet.build(socket.packetHandler.protocol);
        if (buffer != null) this.send(buffer, {binary: 1});
    } else this.readyState = WebSocket.CLOSED, this.emit("close");
};

module.exports = GameServer;
