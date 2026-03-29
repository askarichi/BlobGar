(function(wHandle, wjQuery) {
    "use strict";
    if (!Date.now) Date.now = function() {
        return (+new Date()).getTime();
    }
    let DATE = Date.now();
    Array.prototype.remove = function(a) {
        const i = this.indexOf(a);
        return i !== -1 && this.splice(i, 1);
    }
    function bytesToColor(r, g, b) {
        let r1 = ("00" + (~~r).toString(16)).slice(-2),
            g1 = ("00" + (~~g).toString(16)).slice(-2),
            b1 = ("00" + (~~b).toString(16)).slice(-2);
        return `#${r1}${g1}${b1}`;
    }
    function colorToBytes(color) {
        if (color.length === 4) return {
            r: parseInt(color[1] + color[1], 16),
            g: parseInt(color[2] + color[2], 16),
            b: parseInt(color[3] + color[3], 16)
        };
        else if (color.length === 7) return {
            r: parseInt(color[1] + color[2], 16),
            g: parseInt(color[3] + color[4], 16),
            b: parseInt(color[5] + color[6], 16)
        };
        throw new Error(`Invalid color: ${color}!`);
    }
    function darkenColor(color) {
        let c = colorToBytes(color);
        return bytesToColor(c.r * .9, c.g * .9, c.b * .9);
    }
    function rgbaFromHex(color, alpha) {
        let c = colorToBytes(color);
        return `rgba(${c.r >> 0}, ${c.g >> 0}, ${c.b >> 0}, ${Math.max(0, Math.min(alpha, 1))})`;
    }
    function blendColors(colorA, colorB, ratio) {
        let left = colorToBytes(colorA),
            right = colorToBytes(colorB),
            mix = Math.max(0, Math.min(Number(ratio) || 0, 1));
        return bytesToColor(
            left.r + (right.r - left.r) * mix,
            left.g + (right.g - left.g) * mix,
            left.b + (right.b - left.b) * mix
        );
    }
    function getOptionalFieldValue(id, fallback) {
        let field = document.getElementById(id);
        if (!field || typeof field.value !== "string") return fallback;
        let value = field.value.trim();
        return value || fallback;
    }
    function cleanupObject(object) {
        for (let i in object) delete object[i];
    }
    class Writer {
        constructor(littleEndian) {
            this.writer = true;
            this.tmpBuf = new DataView(new ArrayBuffer(8));
            this._e = littleEndian;
            this.reset();
            return this;
        }
        reset(littleEndian = this._e) {
            this._e = littleEndian;
            this._b = [];
            this._o = 0;
        }
        setUint8(a) {
            if (a >= 0 && a < 256) this._b.push(a);
            return this;
        }
        setInt8(a) {
            if (a >= -128 && a < 128) this._b.push(a);
            return this;
        }
        setUint16(a) {
            this.tmpBuf.setUint16(0, a, this._e);
            this.move(2);
            return this;
        }
        setInt16(a) {
            this.tmpBuf.setInt16(0, a, this._e);
            this.move(2);
            return this;
        }
        setUint32(a) {
            this.tmpBuf.setUint32(0, a, this._e);
            this._move(4);
            return this;
        }
        setInt32(a) {
            this.tmpBuf.setInt32(0, a, this._e);
            this._move(4);
            return this;
        }
        setFloat32(a) {
            this.tmpBuf.setFloat32(0, a, this._e);
            this._move(4);
            return this;
        }
        setFloat64(a) {
            this.tmpBuf.setFloat64(0, a, this._e);
            this._move(8);
            return this;
        }
        _move(b) {
            for (let i = 0; i < b; i++) this._b.push(this.tmpBuf.getUint8(i));
        }
        setStringUTF8(s) {
            const bytesStr = unescape(encodeURIComponent(s));
            for (let i = 0, l = bytesStr.length; i < l; i++) this._b.push(bytesStr.charCodeAt(i));
            this._b.push(0);
            return this;
        }
        build() {
            return new Uint8Array(this._b);
        }
    }
    class Reader {
        constructor(view, offset, littleEndian) {
            this.reader = true;
            this._e = littleEndian;
            if (view) this.repurpose(view, offset);
        }
        repurpose(view, offset) {
            this.view = view;
            this._o = offset || 0;
        }
        getUint8() {
            return this.view.getUint8(this._o++, this._e);
        }
        getInt8() {
            return this.view.getInt8(this._o++, this._e);
        }
        getUint16() {
            return this.view.getUint16((this._o += 2) - 2, this._e);
        }
        getInt16() {
            return this.view.getInt16((this._o += 2) - 2, this._e);
        }
        getUint32() {
            return this.view.getUint32((this._o += 4) - 4, this._e);
        }
        getInt32() {
            return this.view.getInt32((this._o += 4) - 4, this._e);
        }
        getFloat32() {
            return this.view.getFloat32((this._o += 4) - 4, this._e);
        }
        getFloat64() {
            return this.view.getFloat64((this._o += 8) - 8, this._e);
        }
        getStringUTF8() {
            let s = "",
                b;
            while ((b = this.view.getUint8(this._o++)) !== 0) s += String.fromCharCode(b);
            return decodeURIComponent(escape(s));
        }
    }
    class Logger {
        constructor() {
            this.verbosity = 4;
        }
        error(text) {
            if (this.verbosity > 0) console.error(text);
        }
        warn(text) {
            if (this.verbosity > 1) console.warn(text);
        }
        info(text) {
            if (this.verbosity > 2) console.info(text);
        }
        debug(text) {
            if (this.verbosity > 3) console.debug(text);
        }
    }
    class Sound {
        constructor(src, volume, maximum) {
            this.src = src;
            this.volume = typeof volume === "number" ? volume : 0.5;
            this.maximum = typeof maximum === "number" ? maximum : Infinity;
            this.elms = [];
        }
        play(vol) {
            if (typeof vol === "number") this.volume = vol;
            let toPlay = this.elms.find((elm) => elm.paused) ?? this.add();
            toPlay.volume = this.volume;
            toPlay.play();
        }
        add() {
            if (this.elms.length >= this.maximum) return this.elms[0];
            let elm = new Audio(this.src);
            this.elms.push(elm);
            return elm;
        }
    }
    let log = new Logger(),
        SKIN_URL = "./skins/",
        USE_HTTPS = "https:" == wHandle.location.protocol,
        QUADTREE_MAX_POINTS = 32,
        CELL_POINTS_MIN = 5,
        CELL_POINTS_MAX = 120,
        VIRUS_POINTS = 100,
        PI_2 = Math.PI * 2,
        UINT8_254 = new Uint8Array([254, 6, 0, 0, 0]),
        UINT8_255 = new Uint8Array([255, 1, 0, 0, 0]),
        UINT8 = {
            1: new Uint8Array([1]),
            17: new Uint8Array([17]),
            21: new Uint8Array([21]),
            18: new Uint8Array([18]),
            19: new Uint8Array([19]),
            22: new Uint8Array([22]),
            23: new Uint8Array([23]),
            24: new Uint8Array([24]),
            25: new Uint8Array([25]),
            26: new Uint8Array([26]),
            27: new Uint8Array([27]),
            28: new Uint8Array([28]),
            30: new Uint8Array([30]),
            31: new Uint8Array([31]),
            29: new Uint8Array([29]),
            33: new Uint8Array([33]),
            34: new Uint8Array([34]),
            35: new Uint8Array([35]),
            36: new Uint8Array([36]),
            37: new Uint8Array([37]),
            38: new Uint8Array([38]),
            39: new Uint8Array([39]),
            40: new Uint8Array([40]),
            41: new Uint8Array([41]),
            42: new Uint8Array([42]),
            43: new Uint8Array([43]),
            254: new Uint8Array([254])
        },
        cells = Object.create({
            mine: [],
            byId: {},
            list: [],
        }),
        border = Object.create({
            left: -2000,
            right: 2000,
            top: -2000,
            bottom: 2000,
            width: 4000,
            height: 4000,
            centerX: -1,
            centerY: -1,
            radius: 2000
        }),
        leaderboard = Object.create({
            type: NaN,
            items: null,
            canvas: document.createElement("canvas"),
            teams: ["#F33", "#3F3", "#33F"]
        }),
        chat = Object.create({
            messages: [],
            waitUntil: 0,
            canvas: document.createElement("canvas"),
            visible: 0,
        }),
        feed = Object.create({
            messages: [],
            waitUntil: 0,
            canvas: document.createElement("canvas"),
            visible: 0,
        }),
        abilityNotice = Object.create({
            title: "",
            message: "",
            color: "#F6C453",
            waitUntil: 0,
            canvas: document.createElement("canvas"),
            visible: 0
        }),
        stats = Object.create({
            framesPerSecond: 0,
            latency: NaN,
            supports: null,
            info: null,
            pingLoopId: NaN,
            pingLoopStamp: null,
            canvas: document.createElement("canvas"),
            visible: 0,
            score: NaN,
            maxScore: 0,
            cellMass: NaN
        }),
        performanceGuard = Object.create({
            level: 2,
            frameIndex: 0,
            lowFrames: 0,
            severeFrames: 0,
            recoverFrames: 0
        }),
        ws = null,
        WS_URL = null,
        isConnected = 0,
        disconnectDelay = 1000,
        syncUpdStamp = Date.now(),
        syncAppStamp = Date.now(),
        mainCanvas = null,
        mainCtx = null,
        soundsVolume,
        soundsVolumeValue = null,
        soundToggle = null,
        gameLogsToggle = null,
        soundEnabled = true,
        arenaHud = {
            score: null,
            mass: null,
            fps: null,
            ping: null
        },
        arenaLeaderboard = {
            root: null,
            list: null,
            self: null
        },
        arenaAbilityHud = {
            root: null,
            desktopButtons: {},
            mobileButtons: {},
            uiStamp: 0,
            initialized: 0,
            state: {
                shield: {
                    count: 0,
                    cooldownMs: 20000,
                    cooldownUntil: 0
                },
                freeze: {
                    count: 0,
                    cooldownMs: 12000,
                    cooldownUntil: 0
                },
                spike: {
                    count: 0,
                    cooldownMs: 12000,
                    cooldownUntil: 0
                }
            }
        },
        loadedSkins = {},
        overlayShown = 0,
        exitToLobbyRequested = 0,
        pendingArenaAction = null,
        deathTransitionTimer = 0,
        arenaSession = {
            mode: "",
            profileName: "Pilot-07",
            startedAt: 0,
            deathPending: 0,
            resultPending: 0,
            exitPending: 0
        },
        isTyping = 0,
        chatBox = null,
        quadtree = null,
        mapCenterSet = 0,
        camera = {
            x: 0,
            y: 0,
            z: 1,
            zScale: 1,
            viewMult: 1
        },
        target = {
            x: 0,
            y: 0,
            z: 1
        },
        mouse = {
            x: NaN,
            y: NaN,
            z: 1
        },
        settings = {
            mobile: "createTouch" in document || "ontouchstart" in wHandle || (navigator && navigator.maxTouchPoints > 0),
            showSkins: true,
            showNames: true,
            showColor: true,
            hideChat: false,
            hideFeed: false,
            showMinimap: true,
            hideGrid: false,
            hideFood: false,
            hideStats: false,
            showMass: false,
            darkTheme: false,
            cellBorders: true,
            jellyPhysics: false,
            showTextOutline: true,
            infiniteZoom: false,
            transparency: false,
            mapBorders: false,
            sectors: false,
            showPos: false,
            allowGETipSet: true
        },
        mobileControls = {
            enabled: false,
            root: null,
            joystick: null,
            knob: null,
            activePointerId: null,
            vectorX: 0,
            vectorY: 0,
            maxDistance: 38,
            actionTimers: {},
            lastTouchAt: 0
        },
        pressed = {
            space: 0,
            w: 0,
            e: 0,
            r: 0,
            t: 0,
            p: 0,
            q: 0,
            o: 0,
            m: 0,
            i: 0,
            y: 0,
            u: 0,
            k: 0,
            l: 0,
            h: 0,
            z: 0,
            x: 0,
            s: 0,
            c: 0,
            g: 0,
            j: 0,
            b: 0,
            v: 0,
            n: 0,
            doubleSplit: 0,
            tripleSplit: 0,
            maxSplit: 0,
            shield: 0,
            freeze: 0,
            spike: 0,
            esc: 0
        },
        eatSound = new Sound("./assets/sound/eat.mp3", .5, 10),
        pelletSound = new Sound("./assets/sound/pellet.mp3", .5, 10);
    const keyCodeFallback = {
            13: "Enter",
            16: "Shift",
            27: "Escape",
            32: "Space",
            65: "KeyA",
            66: "KeyB",
            67: "KeyC",
            68: "KeyD",
            69: "KeyE",
            70: "KeyF",
            71: "KeyG",
            72: "KeyH",
            73: "KeyI",
            74: "KeyJ",
            75: "KeyK",
            76: "KeyL",
            77: "KeyM",
            78: "KeyN",
            79: "KeyO",
            80: "KeyP",
            81: "KeyQ",
            82: "KeyR",
            83: "KeyS",
            84: "KeyT",
            85: "KeyU",
            86: "KeyV",
            87: "KeyW",
            88: "KeyX",
            89: "KeyY",
            90: "KeyZ"
        },
        keyBindingDefinitions = [{
            id: "chat",
            label: "Chat",
            category: "Core",
            defaultCode: "Enter"
        }, {
            id: "split",
            label: "Split",
            category: "Core",
            defaultCode: "Space"
        }, {
            id: "eject",
            label: "Eject Mass",
            category: "Core",
            defaultCode: "Shift"
        }, {
            id: "shield",
            label: "Shield",
            category: "Abilities",
            defaultCode: "KeyW"
        }, {
            id: "freeze",
            label: "Freeze",
            category: "Abilities",
            defaultCode: "KeyE"
        }, {
            id: "spike",
            label: "Spike",
            category: "Abilities",
            defaultCode: "KeyQ"
        }, {
            id: "doubleSplit",
            label: "Double Split",
            category: "Split Bursts",
            defaultCode: "KeyD"
        }, {
            id: "tripleSplit",
            label: "Triple Split",
            category: "Split Bursts",
            defaultCode: "KeyA"
        }, {
            id: "colorShift",
            label: "Color Shift",
            category: "Core",
            defaultCode: "KeyX"
        }, {
            id: "maxSplit",
            label: "Max Split",
            category: "Split Bursts",
            defaultCode: "KeyC"
        }, {
            id: "toggleMenu",
            label: "Open / Close Menu",
            category: "Core",
            defaultCode: "Escape"
        }];
    let keyBindings = {},
        keyBindingCapture = null;
    function wsCleanup() {
        if (!ws) return;
        log.debug("WS cleanup triggered!");
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
        ws = null;
    }
    function getPreferredServerUrl() {
        if (WS_URL) return WS_URL;
        let serverField = document.getElementById("gamemode");
        if (serverField && typeof serverField.value === "string" && serverField.value.trim()) return serverField.value.trim();
        if (settings.allowGETipSet && wHandle.location.search) {
            let div = /ip=([\w\W]+):([0-9]+)/.exec(wHandle.location.search.slice(1));
            if (div) return `${div[1]}:${div[2]}`;
        }
        if (typeof wHandle.noxGetResolvedServerHost === "function") {
            let resolved = wHandle.noxGetResolvedServerHost();
            if (resolved && typeof resolved === "string" && resolved.trim()) return resolved.trim();
        }
        return null;
    }
    function getCurrentProfileName() {
        if (typeof wHandle.noxCurrentProfileName === "function") return wHandle.noxCurrentProfileName();
        let nick = document.getElementById("nick");
        return nick && nick.value && nick.value.trim() ? nick.value.trim() : "Pilot-07";
    }
    function resetArenaSession(preserveDeathUi) {
        if (deathTransitionTimer) {
            clearTimeout(deathTransitionTimer);
            deathTransitionTimer = 0;
        }
        arenaSession.mode = "";
        arenaSession.profileName = "Pilot-07";
        arenaSession.startedAt = 0;
        arenaSession.deathPending = 0;
        arenaSession.resultPending = 0;
        arenaSession.exitPending = 0;
        resetArenaAbilityHudState();
        if (!preserveDeathUi && typeof wHandle.noxHideArenaDeathNotice === "function") wHandle.noxHideArenaDeathNotice();
    }
    function beginArenaSession(mode) {
        if (deathTransitionTimer) {
            clearTimeout(deathTransitionTimer);
            deathTransitionTimer = 0;
        }
        arenaSession.mode = mode || "play";
        arenaSession.profileName = getCurrentProfileName();
        arenaSession.startedAt = Date.now();
        arenaSession.deathPending = 0;
        arenaSession.resultPending = 0;
        arenaSession.exitPending = 0;
        syncArenaAbilityHudFromProfile(true);
        if (typeof wHandle.noxHideArenaDeathNotice === "function") wHandle.noxHideArenaDeathNotice();
        if (typeof wHandle.noxOnArenaSessionStart === "function") {
            wHandle.noxOnArenaSessionStart({
                mode: arenaSession.mode,
                profileName: arenaSession.profileName,
                startedAt: arenaSession.startedAt
            });
        }
    }
    function completeArenaSession(reason) {
        if (deathTransitionTimer) {
            clearTimeout(deathTransitionTimer);
            deathTransitionTimer = 0;
        }
        if (reason !== "death" && typeof wHandle.noxHideArenaDeathNotice === "function") wHandle.noxHideArenaDeathNotice();
        let sessionInfo = {
            mode: arenaSession.mode,
            profileName: arenaSession.profileName,
            startedAt: arenaSession.startedAt,
            reason: reason
        };
        if (arenaSession.mode === "play" && (reason === "death" || reason === "exit") && typeof wHandle.noxHandleArenaDeath === "function") wHandle.noxHandleArenaDeath(sessionInfo);
        else showOverlay();
        resetArenaSession(reason === "death");
    }
    function beginArenaDeathTransition(killerId) {
        if (arenaSession.mode !== "play" || arenaSession.exitPending || arenaSession.resultPending || arenaSession.deathPending) return;
        arenaSession.deathPending = 1;
        let killerName = "",
            killerCell = killerId ? cells.byId.get(killerId) : null;
        if (killerCell && killerCell.name) killerName = sanitizeLeaderboardName(killerCell.name);
        if (typeof wHandle.noxShowArenaDeathNotice === "function") wHandle.noxShowArenaDeathNotice({
            killerName: killerName
        });
        deathTransitionTimer = setTimeout(() => {
            deathTransitionTimer = 0;
            if (arenaSession.mode !== "play" || arenaSession.exitPending || arenaSession.resultPending) return;
            leaveArena("death");
        }, 950);
    }
    function performPendingArenaAction() {
        if (!pendingArenaAction) return;
        let action = pendingArenaAction;
        pendingArenaAction = null;
        stats.maxScore = 0;
        if (action.type === "spectate") wsSend(UINT8[1]);
        else sendPlay(action.name);
        hideOverlay();
    }
    function queueArenaAction(action) {
        if (!action) return;
        let targetUrl = getPreferredServerUrl();
        if (!targetUrl) {
            showOverlay();
            return;
        }
        pendingArenaAction = action;
        beginArenaSession(action.type === "spectate" ? "spectate" : "play");
        hideOverlay();
        if (ws && ws.readyState === 1) return performPendingArenaAction();
        if (!ws || ws.readyState === 2 || ws.readyState === 3) return wsInit(targetUrl);
    }
    function leaveArena(reason) {
        if (reason === "death") {
            if (!arenaSession.mode || arenaSession.mode !== "play" || arenaSession.resultPending || arenaSession.exitPending) return;
            arenaSession.resultPending = 1;
        } else {
            if (arenaSession.exitPending) return;
            arenaSession.exitPending = 1;
            exitToLobbyRequested = 1;
        }
        pendingArenaAction = null;
        if (!ws) return completeArenaSession(reason);
        try {
            ws.close(1000, reason === "death" ? "Battle finished" : "Exit to lobby");
        } catch (error) {
            wsCleanup();
            gameReset();
            renderArenaLeaderboard();
            completeArenaSession(reason);
        }
    }
    function wsInit(url) {
        if (ws) {
            log.debug("websocket init on existing connection!");
            wsCleanup();
        }
        wjQuery("#connecting").show();
        ws = new WebSocket(`ws${USE_HTTPS && !url.includes("127.0.0.1") ? "s" : ""}://${WS_URL = url}`);
        ws.binaryType = "arraybuffer";
        ws.onopen = wsOpen;
        ws.onmessage = wsMessage;
        ws.onerror = wsError;
        ws.onclose = wsClose;
    }
    function wsOpen() {
        isConnected = 1;
        disconnectDelay = 1000;
        wjQuery("#connecting").hide();
        wsSend(UINT8_254);
        wsSend(UINT8_255);
        setTimeout(() => {
            if (ws && ws.readyState === 1) performPendingArenaAction();
        }, 40);
        log.debug(`WS connected, using https: ${USE_HTTPS}`);
        log.info("Socket open.");
    }
    function wsError(error) {
        log.error(error);
        log.info("Socket error.");
    }
    function wsClose(e) {
        isConnected = 0;
        let exitingToLobby = !!exitToLobbyRequested;
        let showingResults = !!arenaSession.resultPending;
        let arenaWasActive = !overlayShown || !!arenaSession.mode;
        exitToLobbyRequested = 0;
        log.debug(`WS disconnected ${e.code} '${e.reason}'`);
        wjQuery("#connecting").hide();
        wsCleanup();
        gameReset();
        renderArenaLeaderboard();
        if (showingResults) {
            completeArenaSession("death");
            log.info("Battle finished.");
            return;
        }
        if (exitingToLobby) {
            completeArenaSession("exit");
            log.info("Returned to lobby.");
            return;
        }
        if (arenaWasActive) {
            showOverlay();
            if (typeof wHandle.showLobbyNotice === "function") wHandle.showLobbyNotice("Connection Lost", "The arena session closed and returned you to the lobby.");
        } else showOverlay();
        resetArenaSession();
        log.info("Socket closed.");
    }
    function wsSend(data) {
        if (!ws) return;
        if (ws.readyState !== 1) return;
        if (data.build) ws.send(data.build());
        else ws.send(data);
    }
    function wsMessage(data) {
        syncUpdStamp = Date.now();
        let reader = new Reader(new DataView(data.data), 0, 1),
            packetId = reader.getUint8(),
            killer,
            killed,
            id,
            x,
            y,
            s,
            flags,
            cell,
            updColor,
            updName,
            updSkin,
            count,
            color,
            name,
            skin;
        switch (packetId) {
            case 0x10: // Update nodes
                // Consume records
                count = reader.getUint16();
                for (let i = 0; i < count; i++) {
                    killer = reader.getUint32();
                    killed = reader.getUint32();
                    let _cell = cells.byId.get(killed);
                    if (!cells.byId.has(killer) || !cells.byId.has(killed)) continue;
                    let soundVolume = getEffectiveSoundVolume();
                    if (soundVolume && cells.mine.includes(killer) && syncUpdStamp - _cell.born > 100) (_cell.s < 20 ? pelletSound : eatSound).play(soundVolume);
                    _cell.destroy(killer);
                }
                // Update records
                while (true) {
                    id = reader.getUint32();
                    if (id === 0) break;
                    x = reader.getInt32();
                    y = reader.getInt32();
                    s = reader.getUint16();
                    flags = reader.getUint8();
                    updColor = !!(flags & 0x02);
                    updName = !!(flags & 0x08);
                    updSkin = !!(flags & 0x04);
                    color = updColor ? bytesToColor(reader.getUint8(), reader.getUint8(), reader.getUint8()) : null;
                    skin = updSkin ? reader.getStringUTF8() : null;
                    name = updName ? reader.getStringUTF8() : null;
                    if (cells.byId.has(id)) {
                        cell = cells.byId.get(id);
                        cell.update(syncUpdStamp);
                        cell.updated = syncUpdStamp;
                        cell.ox = cell.x;
                        cell.oy = cell.y;
                        cell.os = cell.s;
                        cell.nx = x;
                        cell.ny = y;
                        cell.ns = s;
                        cell.applyFlags(flags);
                        if (color) cell.setColor(color);
                        if (skin) cell.setSkin(skin);
                        if (name) cell.setName(name);
                    } else {
                        cell = new Cell(id, x, y, s, name, color, skin, flags);
                        cells.byId.set(id, cell);
                        cells.list.push(cell);
                    }
                }
                // Disappear records
                count = reader.getUint16();
                for (let i = 0; i < count; i++) {
                    killed = reader.getUint32();
                    if (cells.byId.has(killed) && !cells.byId.get(killed).destroyed) cells.byId.get(killed).destroy(null);
                }
                break;
            case 0x11: // Update position
                target.x = reader.getFloat32();
                target.y = reader.getFloat32();
                target.z = reader.getFloat32();
                break;
            case 0x12: // Clear all
                for (let cell of cells.byId.values()) cell.destroy(null);
            case 0x14: // Clear my cells
                if (cells.mine.length && !overlayShown && !arenaSession.exitPending && !arenaSession.resultPending && !arenaSession.deathPending) beginArenaDeathTransition(null);
                cells.mine = [];
                break;
            case 0x15: // Draw line
                log.warn("Got packet 0x15 (draw line) which is unsupported!");
                break;
            case 0x20: // New cell
                cells.mine.push(reader.getUint32());
                break;
            case 0x30: // Draw just text on a leaderboard
                leaderboard.items = [];
                leaderboard.type = "text";
                count = reader.getUint32();
                for (let i = 0; i < count; ++i) leaderboard.items.push(reader.getStringUTF8());
                drawLeaderboard();
                break;
            case 0x31: // Draw FFA leaderboard
                leaderboard.items = [];
                leaderboard.type = "ffa";
                count = reader.getUint32();
                for (let i = 0; i < count; ++i) leaderboard.items.push({
                    me: !!reader.getUint32(),
                    name: reader.getStringUTF8() || "An unnamed cell",
                    mass: reader.getUint32()
                });
                drawLeaderboard();
                break;
            case 0x32: // Draw Teams leaderboard
                leaderboard.items = [];
                leaderboard.type = "pie";
                count = reader.getUint32();
                for (let i = 0; i < count; ++i) leaderboard.items.push(reader.getFloat32());
                drawLeaderboard();
                break;
            case 0x40: // Set the borders
                border.left = reader.getFloat64();
                border.top = reader.getFloat64();
                border.right = reader.getFloat64();
                border.bottom = reader.getFloat64();
                border.width = border.right - border.left;
                border.height = border.bottom - border.top;
                border.centerX = (border.left + border.right) / 2;
                border.centerY = (border.top + border.bottom) / 2;
                border.radius = Math.min(border.width, border.height) / 2;
                if (data.data.byteLength === 33) break;
                if (!mapCenterSet) {
                    mapCenterSet = 1;
                    camera.x = target.x = border.centerX;
                    camera.y = target.y = border.centerY;
                    camera.z = target.z = 1;
                }
                reader.getUint32(); // game type
                if (!/(MultiOgar|NOX)/.test(reader.getStringUTF8()) || stats.pingLoopId) break;
                stats.pingLoopId = setInterval(() => {
                    wsSend(UINT8[254]);
                    stats.pingLoopStamp = Date.now();
                }, 2000);
                break;
            case 0x63: // chat message
                flags = reader.getUint8();
                color = bytesToColor(reader.getUint8(), reader.getUint8(), reader.getUint8());
                name = reader.getStringUTF8().trim();
                let reg = /\{([\w]+)\}/.exec(name);
                if (reg) name = name.replace(reg[0], "").trim();
                let message = reader.getStringUTF8(),
                    server = !!(flags & 0x80),
                    admin = !!(flags & 0x40),
                    mod = !!(flags & 0x20);
                let isFeedMessage = /^\[feed\]/i.test(message);
                if (server && !isFeedMessage) break;
                if (isFeedMessage) message = message.replace(/^\[feed\]/i, "").trim();
                if (server && name !== "SERVER") name = "[SERVER] " + name;
                if (admin) name = "[ADMIN] " + name;
                if (mod) name = "[MOD] " + name;
                let wait = isFeedMessage ? Math.max(900, 320 + message.length * 24) : Math.max(2400, 900 + message.length * 90);
                let targetLog = isFeedMessage ? feed : chat;
                targetLog.waitUntil = isFeedMessage ? syncUpdStamp + wait : (syncUpdStamp - targetLog.waitUntil > 1000 ? syncUpdStamp + wait : targetLog.waitUntil + wait);
                targetLog.messages.push({
                    server: server,
                    admin: admin,
                    mod: mod,
                    color: color,
                    name: name,
                    message: message,
                    feed: isFeedMessage,
                    time: syncUpdStamp
                });
                targetLog.messages = targetLog.messages.slice(-(isFeedMessage ? 20 : 40));
                if (isFeedMessage) {
                    if (/^(Shield|Freeze|Spike)$/i.test(name)) {
                        handleArenaAbilityNotice(name, message);
                        abilityNotice.title = name;
                        abilityNotice.message = message;
                        abilityNotice.color = color;
                        abilityNotice.waitUntil = syncUpdStamp + Math.max(1800, 1000 + message.length * 70);
                        drawAbilityNotice();
                    }
                    drawFeed();
                }
                else drawChat();
                break;
            case 0xFE: // server stat
                stats.info = JSON.parse(reader.getStringUTF8());
                stats.latency = syncUpdStamp - stats.pingLoopStamp;
                drawStats();
                break;
            default: // invalid packet
                wsCleanup();
                break;
        }
    }
    function sendMouseMove(x, y) {
        let writer = new Writer(1);
        writer.setUint8(0x10);
        writer.setUint32(x);
        writer.setUint32(y);
        writer._b.push(0, 0, 0, 0);
        wsSend(writer);
    }
    function sendPlay(name) {
        let writer = new Writer(1);
        writer.setUint8(0x00);
        writer.setStringUTF8(name);
        wsSend(writer);
    }
    function sendChat(text) {
        let writer = new Writer();
        writer.setUint8(0x63);
        writer.setUint8(0);
        writer.setStringUTF8(text);
        wsSend(writer);
    }
    function gameReset() {
        cleanupObject(cells);
        cleanupObject(border);
        cleanupObject(leaderboard);
        cleanupObject(chat);
        cleanupObject(feed);
        cleanupObject(abilityNotice);
        cleanupObject(stats);
        chat.messages = [];
        feed.messages = [];
        abilityNotice.title = "";
        abilityNotice.message = "";
        abilityNotice.visible = 0;
        abilityNotice.waitUntil = 0;
        leaderboard.items = [];
        cells.mine = [];
        cells.byId = new Map();
        cells.list = [];
        camera.x = camera.y = target.x = target.y = 0;
        camera.z = target.z = 1;
        mapCenterSet = 0;
    }
    if (null !== wHandle.localStorage) wjQuery(window).load(function() {
        wjQuery(".save").each(function() {
            let id = wjQuery(this).data("box-id"),
                value = wHandle.localStorage.getItem("checkbox-" + id);
            if (value && value == "true" && id > 0) {
                wjQuery(this).prop("checked", "true");
                wjQuery(this).trigger("change");
            } else if (id < 1 && value != null) wjQuery(this).val(value);
        });
        wjQuery(".save").change(function() {
            let id = wjQuery(this).data("box-id"),
                value = id < 1 ? wjQuery(this).val() : wjQuery(this).prop("checked");
            wHandle.localStorage.setItem("checkbox-" + id, value);
        });
    });
    function hideOverlay() {
        overlayShown = 0;
        document.body.classList.remove("lobby-mode");
        document.body.classList.add("arena-mode");
        updateMobileClientMode();
        wjQuery("#overlays").fadeOut(200);
    }
    function showOverlay() {
        overlayShown = 1;
        document.body.classList.remove("arena-mode");
        document.body.classList.add("lobby-mode");
        resetMobileJoystick();
        updateMobileClientMode();
        wjQuery("#overlays").fadeIn(300);
        if (typeof wHandle.noxLoadProfileProgress === "function") wHandle.noxLoadProfileProgress(true);
    }
    function updateArenaHud() {
        if (!arenaHud.score) return;
        arenaHud.score.textContent = isNaN(stats.score) ? "-" : stats.score;
        arenaHud.mass.textContent = isNaN(stats.cellMass) ? "-" : stats.cellMass;
        arenaHud.fps.textContent = isFinite(stats.framesPerSecond) ? ~~stats.framesPerSecond : "-";
        arenaHud.ping.textContent = isNaN(stats.latency) ? "-" : Math.max(0, ~~stats.latency) + "ms";
    }
    function getRenderPerformanceLevel() {
        return performanceGuard.level;
    }
    function getJellyUpdateStride() {
        return performanceGuard.level === 2 ? 1 : performanceGuard.level === 1 ? 2 : 3;
    }
    function updateRenderPerformanceGuard() {
        let fps = isFinite(stats.framesPerSecond) && stats.framesPerSecond > 0 ? stats.framesPerSecond : 60;
        performanceGuard.frameIndex++;
        switch (performanceGuard.level) {
            case 2:
                if (fps < 42) performanceGuard.lowFrames++;
                else performanceGuard.lowFrames = Math.max(0, performanceGuard.lowFrames - 2);
                if (performanceGuard.lowFrames >= 18) {
                    performanceGuard.level = 1;
                    performanceGuard.lowFrames = 0;
                    performanceGuard.severeFrames = 0;
                    performanceGuard.recoverFrames = 0;
                }
                break;
            case 1:
                if (fps < 31) performanceGuard.severeFrames++;
                else performanceGuard.severeFrames = Math.max(0, performanceGuard.severeFrames - 2);
                if (fps > 54) performanceGuard.recoverFrames++;
                else performanceGuard.recoverFrames = Math.max(0, performanceGuard.recoverFrames - 1);
                if (performanceGuard.severeFrames >= 10) {
                    performanceGuard.level = 0;
                    performanceGuard.lowFrames = 0;
                    performanceGuard.severeFrames = 0;
                    performanceGuard.recoverFrames = 0;
                } else if (performanceGuard.recoverFrames >= 36) {
                    performanceGuard.level = 2;
                    performanceGuard.lowFrames = 0;
                    performanceGuard.severeFrames = 0;
                    performanceGuard.recoverFrames = 0;
                }
                break;
            default:
                if (fps > 40) performanceGuard.recoverFrames++;
                else performanceGuard.recoverFrames = Math.max(0, performanceGuard.recoverFrames - 1);
                if (performanceGuard.recoverFrames >= 28) {
                    performanceGuard.level = 1;
                    performanceGuard.lowFrames = 0;
                    performanceGuard.severeFrames = 0;
                    performanceGuard.recoverFrames = 0;
                }
                break;
        }
    }
    function sanitizeLeaderboardName(value) {
        let text = String(value || "").trim(),
            reg = /\{([\w\W]+)\}/.exec(text);
        if (reg) text = text.replace(reg[0], "").trim();
        return text || "An unnamed cell";
    }
    function syncArenaLeaderboardUI() {
        if (!arenaLeaderboard.root) return;
        arenaLeaderboard.root.classList.toggle("is-collapsed", !!leaderboard.collapsed);
    }
    function renderArenaLeaderboard() {
        if (!arenaLeaderboard.list || !arenaLeaderboard.self) return;
        if (!isConnected || overlayShown || leaderboard.type !== "ffa") {
            arenaLeaderboard.list.innerHTML = "<div class='nox-arena-leaderboard__empty'>No ranked pilots visible.</div>";
            arenaLeaderboard.self.innerHTML = "<span class='nox-arena-leaderboard__self-rank'>#-</span><span class='nox-arena-leaderboard__self-name'>Unranked</span><span class='nox-arena-leaderboard__mass'>-</span>";
            return;
        }
        let items = Array.isArray(leaderboard.items) ? leaderboard.items : [],
            meIndex = items.findIndex(item => !!item.me),
            visibleItems = items.slice(0, 7);
        if (!items.length) arenaLeaderboard.list.innerHTML = "<div class='nox-arena-leaderboard__empty'>No ranked pilots visible.</div>";
        else arenaLeaderboard.list.innerHTML = visibleItems.map((item, index) => {
            let isMe = !!item.me;
            return "<div class='nox-arena-leaderboard__entry" + (isMe ? " is-me" : "") + "'>" +
                "<span class='nox-arena-leaderboard__rank'>#" + (index + 1) + "</span>" +
                "<div class='nox-arena-leaderboard__meta'>" +
                    "<span class='nox-arena-leaderboard__name'>" + sanitizeLeaderboardName(item.name) + "</span>" +
                "</div>" +
                "<span class='nox-arena-leaderboard__mass'>" + (isNaN(item.mass) ? "-" : item.mass) + "</span>" +
            "</div>";
        }).join("");
        let currentName = sanitizeLeaderboardName(typeof wHandle.noxCurrentProfileName === "function" ? wHandle.noxCurrentProfileName() : ""),
            selfRank = meIndex >= 0 ? "#" + (meIndex + 1) : "#-",
            selfName = meIndex >= 0 && items[meIndex] ? sanitizeLeaderboardName(items[meIndex].name) : currentName || "Unranked",
            selfMass = meIndex >= 0 && items[meIndex] && !isNaN(items[meIndex].mass) ? items[meIndex].mass : (isNaN(stats.score) ? "-" : stats.score);
        arenaLeaderboard.self.innerHTML = "<span class='nox-arena-leaderboard__self-rank'>" + selfRank + "</span><span class='nox-arena-leaderboard__self-name'>" + selfName + "</span><span class='nox-arena-leaderboard__mass'>" + selfMass + "</span>";
    }
    function syncSoundToggleUI() {
        if (!soundToggle) return;
        soundToggle.checked = !!soundEnabled;
    }
    function syncGameLogsToggleUI() {
        if (!gameLogsToggle) return;
        let enabled = !settings.hideFeed;
        gameLogsToggle.classList.toggle("is-active", enabled);
        gameLogsToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
        gameLogsToggle.textContent = enabled ? "On" : "Off";
    }
    function getEffectiveSoundVolume() {
        if (!soundsVolume) return 0;
        let value = parseFloat(soundsVolume.value);
        if (!isFinite(value)) value = 0.5;
        value = Math.max(0, Math.min(1, value));
        return soundEnabled ? value : 0;
    }
    function syncSoundVolumeUI() {
        if (!soundsVolume) return;
        let value = parseFloat(soundsVolume.value);
        if (!isFinite(value)) value = 0.5;
        value = Math.max(0, Math.min(1, value));
        soundsVolume.value = value;
        if (soundsVolumeValue) soundsVolumeValue.textContent = Math.round(value * 100) + "%";
        if (wHandle.localStorage) wHandle.localStorage.setItem("nox-sounds-volume", value);
    }
    wHandle.noxSetSoundEnabled = function(arg) {
        soundEnabled = !!arg;
        syncSoundToggleUI();
        if (wHandle.localStorage) wHandle.localStorage.setItem("nox-sound-enabled", soundEnabled ? "true" : "false");
        syncSoundVolumeUI();
    };
    wHandle.noxToggleSoundEnabled = function() {
        wHandle.noxSetSoundEnabled(!soundEnabled);
    };
    wHandle.noxSetChatHidden = function(arg) {
        settings.hideChat = !!arg;
        settings.hideChat ? wjQuery('#chat_textbox').hide() : wjQuery('#chat_textbox').show();
        drawChat();
    };
    wHandle.noxToggleChatHidden = function() {
        wHandle.noxSetChatHidden(!settings.hideChat);
    };
    wHandle.noxSetGameLogsEnabled = function(arg) {
        settings.hideFeed = !arg;
        if (wHandle.localStorage) wHandle.localStorage.setItem("nox-game-logs-enabled", settings.hideFeed ? "false" : "true");
        syncGameLogsToggleUI();
        drawFeed();
    };
    wHandle.noxToggleGameLogsEnabled = function() {
        wHandle.noxSetGameLogsEnabled(settings.hideFeed);
    };
    function normalizeBindingCode(code) {
        if (!code) return null;
        if (code === "NumpadEnter") return "Enter";
        if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
        if (code === "ControlLeft" || code === "ControlRight") return "Control";
        if (code === "AltLeft" || code === "AltRight") return "Alt";
        if (code === "MetaLeft" || code === "MetaRight") return "Meta";
        return code;
    }
    function getEventBindingCode(event) {
        return normalizeBindingCode(event.code || keyCodeFallback[event.keyCode] || null);
    }
    function isTextEntryActive() {
        let active = document.activeElement;
        return !!(isTyping || active && (active === chatBox || active.tagName === "INPUT" || active.tagName === "TEXTAREA"));
    }
    function detectMobileClient() {
        let coarsePointer = false;
        try {
            coarsePointer = !!(wHandle.matchMedia && (wHandle.matchMedia("(pointer: coarse)").matches || wHandle.matchMedia("(hover: none)").matches));
        } catch (error) {}
        return !!(settings.mobile || coarsePointer);
    }
    function updateMobileClientMode() {
        mobileControls.enabled = detectMobileClient();
        document.body.classList.toggle("nox-mobile-client", mobileControls.enabled);
        if (mobileControls.root) mobileControls.root.setAttribute("aria-hidden", mobileControls.enabled && !overlayShown ? "false" : "true");
        if (!mobileControls.enabled) resetMobileJoystick();
    }
    function updateMobileJoystickVisual() {
        if (!mobileControls.knob) return;
        let offsetX = mobileControls.vectorX * mobileControls.maxDistance,
            offsetY = mobileControls.vectorY * mobileControls.maxDistance;
        mobileControls.knob.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }
    function resetMobileJoystick() {
        mobileControls.activePointerId = null;
        mobileControls.vectorX = 0;
        mobileControls.vectorY = 0;
        updateMobileJoystickVisual();
    }
    function updateMobileJoystickFromPointer(event) {
        if (!mobileControls.joystick) return;
        let rect = mobileControls.joystick.getBoundingClientRect(),
            centerX = rect.left + rect.width / 2,
            centerY = rect.top + rect.height / 2,
            deltaX = event.clientX - centerX,
            deltaY = event.clientY - centerY,
            distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1,
            maxDistance = mobileControls.maxDistance = Math.max(28, rect.width * 0.28),
            ratio = Math.min(1, maxDistance / distance);
        mobileControls.vectorX = deltaX * ratio / maxDistance;
        mobileControls.vectorY = deltaY * ratio / maxDistance;
        updateMobileJoystickVisual();
    }
    function releaseMobileAction(actionId, button) {
        if (mobileControls.actionTimers[actionId]) {
            clearTimeout(mobileControls.actionTimers[actionId]);
            delete mobileControls.actionTimers[actionId];
        }
        handleBoundActionUp(actionId);
        if (button) button.classList.remove("is-pressed");
    }
    function triggerMobileAction(actionId, button, holdable) {
        if (chatBox && document.activeElement === chatBox) chatBox.blur();
        isTyping = 0;
        if (holdable) {
            handleBoundActionDown(actionId);
            if (button) button.classList.add("is-pressed");
            return;
        }
        handleBoundActionDown(actionId);
        if (button) button.classList.add("is-pressed");
        handleBoundActionUp(actionId);
        mobileControls.actionTimers[actionId] = setTimeout(() => {
            if (button) button.classList.remove("is-pressed");
            delete mobileControls.actionTimers[actionId];
        }, 120);
    }
    function bindMobileActionButton(button) {
        if (!button) return;
        let actionId = button.getAttribute("data-action"),
            holdable = button.getAttribute("data-hold") === "true";
        let beginPress = event => {
            if (!mobileControls.enabled || overlayShown || !actionId) return;
            if (event && event.pointerType === "mouse" && !settings.mobile) return;
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            button._noxLastPressAt = Date.now();
            if (holdable && event && typeof event.pointerId !== "undefined") {
                button.setPointerCapture(event.pointerId);
                button.dataset.pointerId = String(event.pointerId);
            }
            triggerMobileAction(actionId, button, holdable);
        };
        button.addEventListener("pointerdown", beginPress, {
            passive: false
        });
        let release = event => {
            if (!actionId || !holdable) return;
            if (button.dataset.pointerId && String(event.pointerId) !== button.dataset.pointerId) return;
            event.preventDefault();
            releaseMobileAction(actionId, button);
            delete button.dataset.pointerId;
        };
        button.addEventListener("pointerup", release, {
            passive: false
        });
        button.addEventListener("pointercancel", release, {
            passive: false
        });
        button.addEventListener("lostpointercapture", () => {
            if (!holdable || !actionId) return;
            releaseMobileAction(actionId, button);
            delete button.dataset.pointerId;
        });
        button.addEventListener("touchstart", event => {
            if (!mobileControls.enabled || overlayShown || !actionId) return;
            mobileControls.lastTouchAt = Date.now();
            if (button._noxLastPressAt && Date.now() - button._noxLastPressAt < 220) return;
            beginPress(event);
        }, {
            passive: false
        });
        let touchRelease = event => {
            mobileControls.lastTouchAt = Date.now();
            if (!holdable || !actionId) return;
            event.preventDefault();
            releaseMobileAction(actionId, button);
            delete button.dataset.pointerId;
        };
        button.addEventListener("touchend", touchRelease, {
            passive: false
        });
        button.addEventListener("touchcancel", touchRelease, {
            passive: false
        });
        button.addEventListener("click", event => {
            if (!mobileControls.enabled || overlayShown || !actionId || holdable) return;
            if (Date.now() - mobileControls.lastTouchAt < 400) {
                event.preventDefault();
                return;
            }
            beginPress(event);
        });
    }
    function initMobileControls() {
        mobileControls.root = document.getElementById("nox-mobile-controls");
        mobileControls.joystick = document.getElementById("nox-mobile-joystick");
        mobileControls.knob = document.getElementById("nox-mobile-joystick-knob");
        if (mobileControls.root) Array.prototype.forEach.call(mobileControls.root.querySelectorAll("[data-action]"), bindMobileActionButton);
        if (mobileControls.joystick) {
            mobileControls.joystick.addEventListener("pointerdown", event => {
                if (!mobileControls.enabled || overlayShown) return;
                if (event.pointerType === "mouse" && !settings.mobile) return;
                event.preventDefault();
                event.stopPropagation();
                mobileControls.activePointerId = event.pointerId;
                mobileControls.joystick.setPointerCapture(event.pointerId);
                updateMobileJoystickFromPointer(event);
            }, {
                passive: false
            });
            mobileControls.joystick.addEventListener("pointermove", event => {
                if (mobileControls.activePointerId !== event.pointerId) return;
                event.preventDefault();
                updateMobileJoystickFromPointer(event);
            }, {
                passive: false
            });
            let endJoystick = event => {
                if (mobileControls.activePointerId !== event.pointerId) return;
                event.preventDefault();
                resetMobileJoystick();
            };
            mobileControls.joystick.addEventListener("pointerup", endJoystick, {
                passive: false
            });
            mobileControls.joystick.addEventListener("pointercancel", endJoystick, {
                passive: false
            });
            mobileControls.joystick.addEventListener("lostpointercapture", resetMobileJoystick);
        }
        updateMobileClientMode();
        updateMobileJoystickVisual();
    }
    function getArenaAbilityProfileSummary() {
        return wHandle.noxProfileState && wHandle.noxProfileState.summary ? wHandle.noxProfileState.summary : null;
    }
    function resolveArenaAbilityCooldownMs(actionId, abilities) {
        let safeAbilities = abilities || {};
        function getLevel(key) {
            return Math.max(0, Math.round(safeAbilities[key] && safeAbilities[key].level || 0));
        }
        switch (actionId) {
            case "shield":
                return Math.max(10000, Math.round(20000 * (1 - getLevel("shieldCooldown") * .012)));
            case "freeze":
                return Math.max(6000, Math.round(12000 * (1 - getLevel("freezeCooldown") * .012)));
            case "spike":
                return Math.max(5000, Math.round(12000 * (1 - getLevel("spikeCooldown") * .012)));
            default:
                return 1000;
        }
    }
    function formatArenaAbilityCooldown(ms) {
        if (ms <= 0) return "";
        let seconds = ms / 1000;
        return seconds >= 10 ? Math.ceil(seconds) + "s" : seconds.toFixed(1) + "s";
    }
    function resetArenaAbilityHudState() {
        let keys = ["shield", "freeze", "spike"];
        arenaAbilityHud.initialized = 0;
        arenaAbilityHud.uiStamp = 0;
        for (let i = 0; i < keys.length; i++) {
            let state = arenaAbilityHud.state[keys[i]];
            if (!state) continue;
            state.count = 0;
            state.cooldownUntil = 0;
            state.cooldownMs = resolveArenaAbilityCooldownMs(keys[i], null);
        }
    }
    function syncArenaAbilityHudFromProfile(force) {
        let summary = getArenaAbilityProfileSummary();
        if (!summary || (!force && arenaAbilityHud.initialized)) return;
        let resources = summary.resources || {},
            abilities = summary.abilities || {},
            mappings = {
                shield: "shields",
                freeze: "freezes",
                spike: "spikes"
            },
            keys = Object.keys(mappings);
        for (let i = 0; i < keys.length; i++) {
            let actionId = keys[i],
                state = arenaAbilityHud.state[actionId];
            if (!state) continue;
            state.count = Math.max(0, Math.round(resources[mappings[actionId]] || 0));
            state.cooldownMs = resolveArenaAbilityCooldownMs(actionId, abilities);
            if (force) state.cooldownUntil = 0;
        }
        arenaAbilityHud.initialized = 1;
        updateArenaAbilityHud(true);
    }
    function pressArenaAbilityAction(actionId, button) {
        if (!actionId || overlayShown) return;
        handleBoundActionDown(actionId);
        if (button) {
            button.classList.add("is-pressed");
            setTimeout(() => {
                button.classList.remove("is-pressed");
            }, 120);
        }
        setTimeout(() => {
            handleBoundActionUp(actionId);
        }, 80);
    }
    function bindArenaAbilityButton(button) {
        let actionId = button && button.getAttribute("data-action");
        if (!button || !actionId) return;
        button.addEventListener("pointerdown", event => {
            if (mobileControls.enabled || overlayShown) return;
            event.preventDefault();
            pressArenaAbilityAction(actionId, button);
        }, {
            passive: false
        });
        button.addEventListener("click", event => {
            if (mobileControls.enabled || overlayShown) return;
            event.preventDefault();
        });
    }
    function initArenaAbilityHud() {
        arenaAbilityHud.root = document.getElementById("nox-arena-abilities");
        arenaAbilityHud.desktopButtons = {};
        arenaAbilityHud.mobileButtons = {};
        if (arenaAbilityHud.root) Array.prototype.forEach.call(arenaAbilityHud.root.querySelectorAll("[data-arena-ability]"), button => {
            let actionId = button.getAttribute("data-action");
            if (!actionId) return;
            arenaAbilityHud.desktopButtons[actionId] = {
                button: button,
                key: button.querySelector(".nox-arena-ability__key"),
                count: button.querySelector(".nox-arena-ability__count"),
                cooldown: button.querySelector(".nox-arena-ability__cooldown")
            };
            bindArenaAbilityButton(button);
        });
        if (mobileControls.root) Array.prototype.forEach.call(mobileControls.root.querySelectorAll(".nox-mobile-action--ability[data-action]"), button => {
            let actionId = button.getAttribute("data-action");
            if (!actionId) return;
            arenaAbilityHud.mobileButtons[actionId] = {
                button: button,
                count: button.querySelector(".nox-mobile-action__count"),
                cooldown: button.querySelector(".nox-mobile-action__cooldown")
            };
        });
        resetArenaAbilityHudState();
        updateArenaAbilityHud(true);
    }
    function markArenaAbilityUsed(actionId) {
        let state = arenaAbilityHud.state[actionId];
        if (!state) return;
        state.count = Math.max(0, state.count - 1);
        state.cooldownUntil = Date.now() + Math.max(1000, Math.round(state.cooldownMs || 1000));
        updateArenaAbilityHud(true);
    }
    function handleArenaAbilityNotice(name, message) {
        let safeName = String(name || "").trim().toLowerCase(),
            safeMessage = String(message || "").trim().toLowerCase();
        if (safeName === "shield" && safeMessage === "barrier active.") return markArenaAbilityUsed("shield");
        if (safeName === "freeze" && safeMessage === "freeze orb launched.") return markArenaAbilityUsed("freeze");
        if (safeName === "spike" && safeMessage === "spike orb launched.") return markArenaAbilityUsed("spike");
    }
    function updateArenaAbilityHud(force) {
        if (!force && syncAppStamp < arenaAbilityHud.uiStamp) return;
        arenaAbilityHud.uiStamp = syncAppStamp + 90;
        let actions = ["shield", "freeze", "spike"],
            bindings = keyBindings || buildDefaultKeyBindings(),
            now = Date.now();
        for (let i = 0; i < actions.length; i++) {
            let actionId = actions[i],
                state = arenaAbilityHud.state[actionId];
            if (!state) continue;
            let remaining = Math.max(0, Math.round((state.cooldownUntil || 0) - now)),
                cooling = remaining > 0,
                angle = Math.max(0, Math.min(360, Math.round((remaining / Math.max(1, state.cooldownMs || 1)) * 360))),
                fill = Math.max(0, Math.min(100, Math.round((remaining / Math.max(1, state.cooldownMs || 1)) * 100))),
                countText = String(Math.max(0, Math.round(state.count || 0))),
                cooldownText = formatArenaAbilityCooldown(remaining),
                keyText = formatBindingCode(bindings[actionId]);
            let desktop = arenaAbilityHud.desktopButtons[actionId];
            if (desktop && desktop.button) {
                desktop.button.style.setProperty("--nox-cooldown-angle", angle + "deg");
                desktop.button.style.setProperty("--nox-cooldown-fill", fill + "%");
                desktop.button.classList.toggle("is-cooling", cooling);
                desktop.button.classList.toggle("is-ready", !cooling);
                desktop.button.classList.toggle("is-empty", Math.max(0, Math.round(state.count || 0)) <= 0);
                if (desktop.key) desktop.key.textContent = keyText;
                if (desktop.count) desktop.count.textContent = countText;
                if (desktop.cooldown) desktop.cooldown.textContent = cooldownText;
            }
            let mobile = arenaAbilityHud.mobileButtons[actionId];
            if (mobile && mobile.button) {
                mobile.button.classList.toggle("is-cooling", cooling);
                mobile.button.classList.toggle("is-ready", !cooling);
                mobile.button.classList.toggle("is-empty", Math.max(0, Math.round(state.count || 0)) <= 0);
                if (mobile.count) mobile.count.textContent = countText;
                if (mobile.cooldown) mobile.cooldown.textContent = cooldownText;
            }
        }
    }
    wHandle.noxSyncArenaAbilityHudFromProfile = function() {
        syncArenaAbilityHudFromProfile(true);
    };
    function resolveInputPointerX() {
        if (mobileControls.enabled && !overlayShown) {
            let virtualRadius = Math.min(mainCanvas.width, mainCanvas.height) * (mainCanvas.width <= 900 ? .24 : .2);
            return mainCanvas.width / 2 + mobileControls.vectorX * virtualRadius;
        }
        return isFinite(mouse.x) ? mouse.x : mainCanvas.width / 2;
    }
    function resolveInputPointerY() {
        if (mobileControls.enabled && !overlayShown) {
            let virtualRadius = Math.min(mainCanvas.width, mainCanvas.height) * (mainCanvas.width <= 900 ? .24 : .2);
            return mainCanvas.height / 2 + mobileControls.vectorY * virtualRadius;
        }
        return isFinite(mouse.y) ? mouse.y : mainCanvas.height / 2;
    }
    function formatBindingCode(code) {
        if (!code) return "Unbound";
        if (code === "Space") return "Space";
        if (code === "Enter") return "Enter";
        if (code === "Escape") return "Esc";
        if (code === "Shift" || code === "Control" || code === "Alt" || code === "Meta") return code;
        if (/^Key[A-Z]$/.test(code)) return code.slice(3);
        if (/^Digit[0-9]$/.test(code)) return code.slice(5);
        return code.replace(/^(Arrow)/, "");
    }
    function buildDefaultKeyBindings() {
        let defaults = {};
        for (let i = 0; i < keyBindingDefinitions.length; i++) defaults[keyBindingDefinitions[i].id] = keyBindingDefinitions[i].defaultCode;
        return defaults;
    }
    function saveKeyBindings() {
        if (!wHandle.localStorage) return;
        wHandle.localStorage.setItem("nox-keybindings", JSON.stringify(keyBindings));
    }
    function loadKeyBindings() {
        keyBindings = buildDefaultKeyBindings();
        let shouldSave = false;
        if (!wHandle.localStorage) return;
        try {
            let raw = wHandle.localStorage.getItem("nox-keybindings");
            if (!raw) return;
            let parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return;
            for (let i = 0; i < keyBindingDefinitions.length; i++) {
                let id = keyBindingDefinitions[i].id;
                if (typeof parsed[id] === "string" && parsed[id]) keyBindings[id] = normalizeBindingCode(parsed[id]);
            }
        } catch (error) {
        }
        try {
            let version = wHandle.localStorage.getItem("nox-keybindings-version");
            if (version !== "4") {
                let oldDefaults = {
                        eject: "KeyW",
                        shield: "KeyE",
                        freeze: "KeyR",
                        spike: "KeyF",
                        maxSplit: "Shift"
                    },
                    newDefaults = {
                        eject: "Shift",
                        shield: "KeyW",
                        freeze: "KeyE",
                        spike: "KeyQ",
                        maxSplit: "KeyC"
                    },
                    moved = {};
                for (let actionId in oldDefaults) {
                    if (!oldDefaults.hasOwnProperty(actionId)) continue;
                    if (keyBindings[actionId] === oldDefaults[actionId]) {
                        keyBindings[actionId] = newDefaults[actionId];
                        moved[actionId] = true;
                        shouldSave = true;
                    }
                }
                if (moved.eject && keyBindings.maxSplit === "Shift") {
                    keyBindings.maxSplit = newDefaults.maxSplit;
                    shouldSave = true;
                }
                if (!keyBindings.colorShift) {
                    keyBindings.colorShift = "KeyX";
                    shouldSave = true;
                }
                if (!keyBindings.doubleSplit || keyBindings.doubleSplit === "KeyX") {
                    keyBindings.doubleSplit = "KeyD";
                    shouldSave = true;
                }
                wHandle.localStorage.setItem("nox-keybindings-version", "4");
            }
        } catch (error) {
        }
        if (shouldSave) saveKeyBindings();
    }
    function findActionByCode(code) {
        if (!code) return null;
        for (let i = 0; i < keyBindingDefinitions.length; i++) {
            let action = keyBindingDefinitions[i];
            if (keyBindings[action.id] === code) return action;
        }
        return null;
    }
    function cancelKeyBindingCapture() {
        keyBindingCapture = null;
        renderKeyBindingList();
    }
    function setKeyBinding(actionId, code) {
        code = normalizeBindingCode(code);
        if (!actionId) return;
        if (code === "Backspace" || code === "Delete") {
            keyBindings[actionId] = null;
            saveKeyBindings();
            cancelKeyBindingCapture();
            return;
        }
        for (let i = 0; i < keyBindingDefinitions.length; i++) {
            let otherId = keyBindingDefinitions[i].id;
            if (otherId !== actionId && keyBindings[otherId] === code) keyBindings[otherId] = null;
        }
        keyBindings[actionId] = code;
        saveKeyBindings();
        cancelKeyBindingCapture();
    }
    function renderKeyBindingList() {
        let container = document.getElementById("nox-keybinding-list");
        if (!container) return;
        let groups = {};
        for (let i = 0; i < keyBindingDefinitions.length; i++) {
            let action = keyBindingDefinitions[i];
            if (!groups[action.category]) groups[action.category] = [];
            groups[action.category].push(action);
        }
        let order = ["Core", "Abilities", "Split Bursts"],
            html = "";
        for (let i = 0; i < order.length; i++) {
            let category = order[i],
                actions = groups[category];
            if (!actions || !actions.length) continue;
            html += "<section class='nox-keybinding-group'><div class='nox-keybinding-group__title'>" + category + "</div>";
            for (let j = 0; j < actions.length; j++) {
                let action = actions[j],
                    active = keyBindingCapture === action.id,
                    code = keyBindings[action.id];
                html += "<div class='nox-keybinding-row'>" +
                    "<span class='nox-keybinding-row__label'>" + action.label + "</span>" +
                    "<button type='button' class='nox-keybinding-button" + (active ? " is-listening" : "") + "' onclick=\"noxStartKeyBindingCapture('" + action.id + "'); return false;\">" +
                    (active ? "Press a key..." : formatBindingCode(code)) +
                    "</button></div>";
            }
            html += "</section>";
        }
        container.innerHTML = html;
    }
    wHandle.noxStartKeyBindingCapture = function(actionId) {
        keyBindingCapture = keyBindingCapture === actionId ? null : actionId;
        renderKeyBindingList();
    };
    wHandle.noxResetKeyBindings = function() {
        keyBindings = buildDefaultKeyBindings();
        saveKeyBindings();
        cancelKeyBindingCapture();
    };
    function toCamera(ctx) {
        ctx.translate(mainCanvas.width / 2, mainCanvas.height / 2);
        scaleForth(ctx);
        ctx.translate(-camera.x, -camera.y);
    }
    function scaleForth(ctx) {
        ctx.scale(camera.z, camera.z);
    }
    function scaleBack(ctx) {
        ctx.scale(camera.zScale, camera.zScale);
    }
    function fromCamera(ctx) {
        ctx.translate(camera.x, camera.y);
        scaleBack(ctx);
        ctx.translate(-mainCanvas.width / 2, -mainCanvas.height / 2);
    }
    function drawChat() {
        if (!chat.messages.length || settings.hideChat) {
            chat.visible = 0;
            chat.canvas.width = 1;
            chat.canvas.height = 1;
            return;
        }
        let canvas = chat.canvas,
            ctx = canvas.getContext("2d"),
            latestMessages = chat.messages.slice(-6),
            lines = [],
            len = latestMessages.length;
        for (let i = 0; i < len; i++) lines.push([
            {text: latestMessages[i].name,
            color: latestMessages[i].color},
            {text: " " + latestMessages[i].message,
            color: settings.darkTheme ? "#E7DEC6" : "#F5EBD7"}
        ]);
        let width = 0,
            height = 22 * len + 8;
        for (let i = 0; i < len; i++) {
            let thisLineWidth = 0,
                complexes = lines[i];
            for (let j = 0; j < complexes.length; j++) {
                ctx.font = "600 16px Ubuntu";
                complexes[j].width = ctx.measureText(complexes[j].text).width;
                thisLineWidth += complexes[j].width;
            }
            width = Math.max(thisLineWidth, width);
        }
        canvas.width = width + 20;
        canvas.height = height;
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
        for (let i = 0; i < len; i++) {
            let complexes = lines[i],
                drawX = 8,
                drawY = 12 + i * 22;
            for (let j = 0; j < complexes.length; j++) {
                ctx.font = "600 16px Ubuntu";
                ctx.fillStyle = complexes[j].color;
                ctx.fillText(complexes[j].text, drawX, drawY);
                drawX += complexes[j].width;
            }
        }
        chat.visible = 1;
    }
    function drawFeed() {
        if (!feed.messages.length || settings.hideFeed) {
            feed.visible = 0;
            feed.canvas.width = 1;
            feed.canvas.height = 1;
            return;
        }
        let canvas = feed.canvas,
            ctx = canvas.getContext("2d"),
            latestMessages = feed.messages.slice(-2),
            lines = [],
            len = latestMessages.length;
        for (let i = 0; i < len; i++) lines.push([
            {text: latestMessages[i].name,
            color: latestMessages[i].color},
            {text: " " + latestMessages[i].message,
            color: settings.darkTheme ? "#E7DEC6" : "#F5EBD7"}
        ]);
        let width = 0,
            lineHeight = 13,
            fontSize = 11,
            height = lineHeight * len + 2;
        for (let i = 0; i < len; i++) {
            let thisLineWidth = 0,
                complexes = lines[i];
            for (let j = 0; j < complexes.length; j++) {
                ctx.font = "600 " + fontSize + "px Ubuntu";
                complexes[j].width = ctx.measureText(complexes[j].text).width;
                thisLineWidth += complexes[j].width;
            }
            width = Math.max(thisLineWidth, width);
        }
        canvas.width = width + 8;
        canvas.height = height;
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 2;
        ctx.shadowColor = "rgba(0, 0, 0, 0.14)";
        for (let i = 0; i < len; i++) {
            let lineWidth = 0,
                complexes = lines[i];
            for (let j = 0; j < complexes.length; j++) lineWidth += complexes[j].width;
            let drawX = Math.max(4, (canvas.width - lineWidth) / 2),
                drawY = 5 + i * lineHeight;
            for (let j = 0; j < complexes.length; j++) {
                ctx.font = "600 " + fontSize + "px Ubuntu";
                ctx.fillStyle = complexes[j].color;
                ctx.fillText(complexes[j].text, drawX, drawY);
                drawX += complexes[j].width;
            }
        }
        feed.visible = 1;
    }
    function drawAbilityNotice() {
        if (!abilityNotice.title || !abilityNotice.message || syncAppStamp > abilityNotice.waitUntil) {
            abilityNotice.visible = 0;
            abilityNotice.canvas.width = 1;
            abilityNotice.canvas.height = 1;
            return;
        }
        let canvas = abilityNotice.canvas,
            ctx = canvas.getContext("2d"),
            title = String(abilityNotice.title || ""),
            message = String(abilityNotice.message || ""),
            padX = 16;
        ctx.font = "700 17px Ubuntu";
        let titleWidth = ctx.measureText(title).width;
        ctx.font = "600 15px Ubuntu";
        let messageWidth = ctx.measureText(message).width;
        canvas.width = Math.max(200, Math.ceil(Math.max(titleWidth, messageWidth) + padX * 2));
        canvas.height = 54;
        ctx = canvas.getContext("2d");
        let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "rgba(17, 18, 22, 0.88)");
        gradient.addColorStop(1, "rgba(10, 11, 14, 0.72)");
        ctx.fillStyle = gradient;
        ctx.strokeStyle = "rgba(246, 196, 83, 0.24)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(0.5, 0.5, canvas.width - 1, canvas.height - 1, 12);
        ctx.fill();
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 14;
        ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
        ctx.font = "700 17px Ubuntu";
        ctx.fillStyle = abilityNotice.color || "#F6C453";
        ctx.fillText(title, canvas.width / 2, 18);
        ctx.shadowBlur = 8;
        ctx.font = "600 15px Ubuntu";
        ctx.fillStyle = settings.darkTheme ? "#F3E9D1" : "#F7EFD9";
        ctx.fillText(message, canvas.width / 2, 37);
        abilityNotice.visible = 1;
    }
    function drawStats() {
        if (!stats.info || settings.hideStats) return stats.visible = 0;
        stats.visible = 1;
        let canvas = stats.canvas,
            ctx = canvas.getContext("2d");
        ctx.font = "14px Ubuntu";
        if (typeof stats.info.botsTotal === "undefined") stats.info.botsTotal = 0;
        if (typeof stats.info.playersDead === "undefined") stats.info.playersDead = 0;
        let rows = [
                `${stats.info.name} (${stats.info.mode})`,
                `${stats.info.playersTotal} / ${stats.info.playersLimit} players`,
                `${stats.info.playersAlive} playing`,
                `${stats.info.playersDead} dead`,
                `${stats.info.playersSpect} spectating`,
                `${stats.info.botsTotal} bots`,
                `${(stats.info.update * 2.5).toFixed(1)}% memory load`,
                `${prettyPrintTime(stats.info.uptime)} uptime`
            ],
            width = 0;
        for (let i = 0; i < rows.length; i++) width = Math.max(width, 2 + ctx.measureText(rows[i]).width + 2);
        canvas.width = width;
        canvas.height = rows.length * (14 + 2);
        ctx.font = "14px Ubuntu";
        ctx.fillStyle = settings.darkTheme ? "#AAA" : "#555";
        ctx.textBaseline = "top";
        for (let i = 0; i < rows.length; i++) ctx.fillText(rows[i], 2, -2 + i * (14 + 2));
    }
    function prettyPrintTime(seconds) {
        seconds = ~~seconds;
        let minutes = ~~(seconds / 60);
        if (minutes < 1) return "<1 min";
        let hours = ~~(minutes / 60);
        if (hours < 1) return minutes + " min";
        let days = ~~(hours / 24);
        if (days < 1) return hours + " hours";
        return days + " days";
    }
    function drawLeaderboard() {
        if (leaderboard.type === NaN) return leaderboard.visible = 0;
        if (!settings.showNames || !leaderboard.items.length) {
            leaderboard.visible = 0;
            renderArenaLeaderboard();
            return;
        }
        leaderboard.visible = 1;
        renderArenaLeaderboard();
        let canvas = leaderboard.canvas,
            ctx = canvas.getContext("2d"),
            len = leaderboard.items.length;
        canvas.width = 250;
        canvas.height = leaderboard.type !== "pie" ? 60 + 24 * len : 240;
        ctx.globalAlpha = .4;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 250, canvas.height);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#FFF";
        ctx.font = "30px Ubuntu";
        ctx.fillText("Leaderboard", 125 - ctx.measureText("Leaderboard").width / 2, 40);
        if (leaderboard.type === "pie") {
            let last = 0;
            for (let i = 0; i < len; i++) {
                ctx.fillStyle = leaderboard.teams[i];
                ctx.beginPath();
                ctx.moveTo(125, 140);
                ctx.arc(125, 140, 80, last, (last += leaderboard.items[i] * PI_2), 0);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            let text,
                isMe = 0;
            ctx.font = "20px Ubuntu";
            for (let i = 0; i < len; i++) {
                if (leaderboard.type === "text") text = leaderboard.items[i];
                else {
                    text = leaderboard.items[i].name;
                    isMe = leaderboard.items[i].me;
                }
                let reg = /\{([\w]+)\}/.exec(text);
                if (reg) text = text.replace(reg[0], "").trim();
                let string = getOptionalFieldValue("lbColor", "FAA");
                ctx.fillStyle = isMe ? "#" + string : "#FFF";
                if (leaderboard.type === "ffa") text = (i + 1) + ". " + (text || "An unnamed cell");
                ctx.textAlign = "left";
                ctx.fillText(text, 15, 70 + 24 * i);
            }
        }
    }
    function drawGrid() {
        mainCtx.save();
        let step = 50,
            i,
            cW = mainCanvas.width / camera.z,
            cH = mainCanvas.height / camera.z,
            viewLeft = camera.x - cW / 2,
            viewTop = camera.y - cH / 2,
            startLeft = (-camera.x + cW / 2) % step,
            startTop = (-camera.y + cH / 2) % step,
            baseColor = settings.darkTheme ? "#1F1F1F" : "#000",
            centerColor = settings.darkTheme ? "#7A5730" : "#4B3A20",
            centerX = border.centerX || 0,
            centerY = border.centerY || 0,
            centerDrawX = centerX - viewLeft,
            centerDrawY = centerY - viewTop,
            markerRadius = 12 / camera.z,
            markerCross = 7 / camera.z,
            glowRadius = 60 / camera.z,
            centerTolerance = step * .25 / Math.max(camera.z, .001);
        scaleForth(mainCtx);

        mainCtx.lineWidth = 1;
        mainCtx.strokeStyle = baseColor;
        mainCtx.globalAlpha = settings.darkTheme ? .26 : .12;
        mainCtx.beginPath();
        for (i = startLeft; i < cW; i += step) {
            let worldX = viewLeft + i;
            if (Math.abs(worldX - centerX) <= centerTolerance) continue;
            mainCtx.moveTo(i, 0);
            mainCtx.lineTo(i, cH);
        }
        for (i = startTop; i < cH; i += step) {
            let worldY = viewTop + i;
            if (Math.abs(worldY - centerY) <= centerTolerance) continue;
            mainCtx.moveTo(0, i);
            mainCtx.lineTo(cW, i);
        }
        mainCtx.closePath();
        mainCtx.stroke();

        mainCtx.lineWidth = 1.45;
        mainCtx.strokeStyle = centerColor;
        mainCtx.globalAlpha = settings.darkTheme ? .52 : .24;
        mainCtx.beginPath();
        mainCtx.moveTo(centerDrawX, 0);
        mainCtx.lineTo(centerDrawX, cH);
        mainCtx.moveTo(0, centerDrawY);
        mainCtx.lineTo(cW, centerDrawY);
        mainCtx.stroke();

        if (centerDrawX > -glowRadius && centerDrawX < cW + glowRadius && centerDrawY > -glowRadius && centerDrawY < cH + glowRadius) {
            let glow = mainCtx.createRadialGradient(centerDrawX, centerDrawY, 0, centerDrawX, centerDrawY, glowRadius);
            glow.addColorStop(0, settings.darkTheme ? "rgba(255, 188, 92, 0.16)" : "rgba(90, 70, 40, 0.08)");
            glow.addColorStop(1, "rgba(0, 0, 0, 0)");
            mainCtx.globalAlpha = 1;
            mainCtx.fillStyle = glow;
            mainCtx.beginPath();
            mainCtx.arc(centerDrawX, centerDrawY, glowRadius, 0, PI_2);
            mainCtx.fill();

            mainCtx.strokeStyle = settings.darkTheme ? "rgba(255, 216, 168, 0.44)" : "rgba(92, 72, 36, 0.24)";
            mainCtx.lineWidth = 1.2;
            mainCtx.beginPath();
            mainCtx.moveTo(centerDrawX - markerCross, centerDrawY);
            mainCtx.lineTo(centerDrawX + markerCross, centerDrawY);
            mainCtx.moveTo(centerDrawX, centerDrawY - markerCross);
            mainCtx.lineTo(centerDrawX, centerDrawY + markerCross);
            mainCtx.stroke();

            mainCtx.fillStyle = settings.darkTheme ? "rgba(255, 210, 150, 0.78)" : "rgba(92, 72, 36, 0.42)";
            mainCtx.beginPath();
            mainCtx.arc(centerDrawX, centerDrawY, markerRadius * .2, 0, PI_2);
            mainCtx.fill();
        }
        mainCtx.restore();
    }
    function drawBorders() { // Rendered unusable when a server has coordinate scrambling enabled
        if (!isConnected || !settings.mapBorders || !border.width || !border.height) return;
        mainCtx.save();
        let pulse = 0.5 + 0.5 * Math.sin(syncAppStamp / 260),
            radius = Math.max(0, border.radius - 10);
        mainCtx.lineCap = "round";
        mainCtx.lineJoin = "round";

        mainCtx.shadowBlur = 36;
        mainCtx.shadowColor = "rgba(255, 70, 24, 0.5)";
        mainCtx.strokeStyle = "rgba(185, 28, 28, 0.42)";
        mainCtx.lineWidth = 26 + pulse * 3;
        mainCtx.beginPath();
        mainCtx.arc(border.centerX, border.centerY, radius, 0, PI_2);
        mainCtx.stroke();

        mainCtx.shadowBlur = 18;
        mainCtx.shadowColor = "rgba(255, 115, 38, 0.52)";
        mainCtx.strokeStyle = "rgba(255, 106, 0, 0.78)";
        mainCtx.lineWidth = 11;
        mainCtx.beginPath();
        mainCtx.arc(border.centerX, border.centerY, radius, 0, PI_2);
        mainCtx.stroke();

        mainCtx.shadowBlur = 0;
        mainCtx.setLineDash([18, 24]);
        mainCtx.lineDashOffset = -(syncAppStamp / 28) % 42;
        mainCtx.strokeStyle = "rgba(255, 146, 64, 0.9)";
        mainCtx.lineWidth = 5;
        mainCtx.beginPath();
        mainCtx.arc(border.centerX, border.centerY, radius, 0, PI_2);
        mainCtx.stroke();

        mainCtx.setLineDash([]);
        mainCtx.strokeStyle = "rgba(255, 224, 173, 0.72)";
        mainCtx.lineWidth = 2.5;
        mainCtx.beginPath();
        mainCtx.arc(border.centerX, border.centerY, radius - 1.5, 0, PI_2);
        mainCtx.stroke();
        mainCtx.restore();
    }
    function drawSectors() { // Rendered unusable when a server has coordinate scrambling enabled
        if (!isConnected || border.centerX !== 0 || border.centerY !== 0 || !settings.sectors) return;
        let x = border.left + 65,
            y = border.bottom - 65,
            letter = "ABCDE".split(""),
            w = (border.right - 65 - x) / 5,
            h = (border.top + 65 - y) / 5;
        mainCtx.save();
        mainCtx.beginPath();
        mainCtx.lineWidth = .05;
        mainCtx.textAlign = "center";
        mainCtx.textBaseline = "middle";
        mainCtx.font = w * .6 + "px Russo One";
        mainCtx.fillStyle = "#1A1A1A";
        for (let j = 0; 5 > j; j++)
            for (let i = 0; 5 > i; i++) mainCtx.fillText(letter[j] + (i + 1), x + w * j + w / 2, (-y - h) + h * -i + h / 2);
        mainCtx.lineWidth = 100;
        mainCtx.strokeStyle = "#1A1A1A";
        for (let j = 0; 5 > j; j++)
            for (let i = 0; 5 > i; i++) mainCtx.strokeRect(x + w * i, y + h * j, w, h);
        mainCtx.restore();
        mainCtx.stroke();
    }
    function drawMinimap() { // Rendered unusable when a server has coordinate scrambling enabled
        if (!isConnected || !settings.showMinimap || !border.width || !border.height) return;
        mainCtx.save();
        let size = 180,
            beginX = mainCanvas.width / camera.viewMult - size - 16,
            beginY = mainCanvas.height / camera.viewMult - size - 16,
            centerX = beginX + size / 2,
            centerY = beginY + size / 2,
            miniRadius = size / 2,
            mapRadius = Math.max(1, border.radius),
            scale = miniRadius / mapRadius;
        mainCtx.globalAlpha = .38;
        mainCtx.fillStyle = "#000";
        mainCtx.beginPath();
        mainCtx.arc(centerX, centerY, miniRadius, 0, PI_2);
        mainCtx.fill();
        mainCtx.globalAlpha = 1;
        mainCtx.strokeStyle = settings.darkTheme ? "rgba(255,255,255,0.22)" : "rgba(32,32,32,0.26)";
        mainCtx.lineWidth = 2;
        mainCtx.beginPath();
        mainCtx.arc(centerX, centerY, miniRadius - 1, 0, PI_2);
        mainCtx.stroke();
        mainCtx.save();
        mainCtx.beginPath();
        mainCtx.arc(centerX, centerY, miniRadius - 2, 0, PI_2);
        mainCtx.clip();
        let posX = centerX + (camera.x - border.centerX) * scale,
            posY = centerY + (camera.y - border.centerY) * scale;
        mainCtx.beginPath();
        if (cells.mine.length) {
            for (let i = 0; i < cells.mine.length; i++) {
                let cell = cells.byId.get(cells.mine[i]);
                if (cell) {
                    mainCtx.fillStyle = settings.showColor ? cell.color : "#FFF";
                    let x = centerX + (cell.x - border.centerX) * scale,
                        y = centerY + (cell.y - border.centerY) * scale,
                        dotRadius = Math.max(2, cell.s * scale);
                    mainCtx.moveTo(x + dotRadius, y);
                    mainCtx.arc(x, y, dotRadius, 0, PI_2);
                }
            }
        } else {
            mainCtx.fillStyle = "#FFF";
            mainCtx.arc(posX, posY, 5, 0, PI_2);
        }
        mainCtx.fill();
        mainCtx.restore();
        let cell = cells.byId.get(cells.mine.find(id => cells.byId.has(id)));
        if (cell) {
            mainCtx.fillStyle = settings.darkTheme ? "#DDD" : "#222";
            mainCtx.textAlign = "center";
            mainCtx.font = `${Math.max(11, size / 12)}px Ubuntu`;
            mainCtx.fillText(cell.name, centerX, beginY - 10);
        }
        mainCtx.restore();
    }
    function drawGame() {
        stats.framesPerSecond += (1000 / Math.max(Date.now() - syncAppStamp, 1) - stats.framesPerSecond) / 10;
        syncAppStamp = Date.now();
        updateRenderPerformanceGuard();
        let drawList = cells.list.slice(0).sort(cellSort);
        for (let i = 0; i < drawList.length; i++) drawList[i].update(syncAppStamp);
        cameraUpdate();
        updateArenaHud();
        if (settings.jellyPhysics && performanceGuard.frameIndex % getJellyUpdateStride() === 0) {
            updateQuadtree();
            for (let i = 0; i < drawList.length; i++) {
                let cell = drawList[i];
                if (cell.usesJellyPhysics()) {
                    cell.updateNumPoints();
                    cell.movePoints();
                } else if (cell.points.length) {
                    cell.points.length = 0;
                    cell.pointsVel.length = 0;
                }
            }
        } else quadtree = null;
        mainCtx.save();
        mainCtx.fillStyle = settings.darkTheme ? "#000" : "#F2FBFF";
        mainCtx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
        if (!settings.hideGrid) drawGrid();
        toCamera(mainCtx);
        drawBorders();
        drawSectors();
        for (let i = 0; i < drawList.length; i++) drawList[i].draw(mainCtx);
        fromCamera(mainCtx);
        quadtree = null;
        mainCtx.scale(camera.viewMult, camera.viewMult);
        if (!settings.hideChat && chat.visible) {
            mainCtx.globalAlpha = isTyping ? 1 : Math.max(1000 - syncAppStamp + chat.waitUntil, 0) / 1000;
            let chatX = 18,
                chatY = Math.max(0, (mainCanvas.height - 132) / camera.viewMult - chat.canvas.height);
            mainCtx.drawImage(chat.canvas, chatX, chatY);
            mainCtx.globalAlpha = 1;
        }
        if (!settings.hideFeed && feed.visible) {
            let feedFade = isTyping ? .56 : (Math.max(520 - syncAppStamp + feed.waitUntil, 0) / 520) * .54;
            mainCtx.globalAlpha = Math.max(0, Math.min(feedFade, .56));
            let feedX = Math.max(0, ((mainCanvas.width / camera.viewMult) - feed.canvas.width) / 2),
                feedY = Math.max(0, (mainCanvas.height - 12) / camera.viewMult - feed.canvas.height);
            mainCtx.drawImage(feed.canvas, feedX, feedY);
            mainCtx.globalAlpha = 1;
        }
        drawAbilityNotice();
        if (abilityNotice.visible) {
            mainCtx.globalAlpha = Math.max(1400 - syncAppStamp + abilityNotice.waitUntil, 0) / 1400;
            let noticeX = Math.max(0, ((mainCanvas.width / camera.viewMult) - abilityNotice.canvas.width) / 2),
                noticeY = 78;
            mainCtx.drawImage(abilityNotice.canvas, noticeX, noticeY);
            mainCtx.globalAlpha = 1;
        }
        drawMinimap();
        updateArenaAbilityHud();
        mainCtx.restore();
        cacheCleanup();
        wHandle.requestAnimationFrame(drawGame);
    }
    function cellSort(a, b) {
        return a.s === b.s ? a.id - b.id : a.s - b.s;
    }
    function sqDist(a, b) {
        return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
    }
    function cameraUpdate() {
        let myCells = [];
        for (let i = 0; i < cells.mine.length; i++) {
            let cell = cells.byId.get(cells.mine[i]);
            if (cell) myCells.push(cell);
        }
        if (myCells.length > 0) {
            let x = 0,
                y = 0,
                s = 0,
                score = 0,
                maxMass = 0,
                len = myCells.length;
            for (let i = 0; i < len; i++) {
                let cell = myCells[i];
                let cellMass = ~~(cell.ns * cell.ns / 100);
                score += cellMass;
                maxMass = Math.max(maxMass, cellMass);
                x += cell.x;
                y += cell.y;
                s += cell.s;
            }
            target.x = x / len;
            target.y = y / len;
            target.z = Math.min(1, Math.pow(Math.min(64 / s, 1), .4) * 1.22);
            camera.x = (target.x + camera.x) / 2;
            camera.y = (target.y + camera.y) / 2;
            stats.score = score;
            stats.maxScore = Math.max(stats.maxScore, score);
            stats.cellMass = maxMass;
        } else {
            stats.score = NaN;
            stats.maxScore = 0;
            stats.cellMass = NaN;
            camera.x += (target.x - camera.x) / 20;
            camera.y += (target.y - camera.y) / 20;
        }
        camera.z += (target.z * camera.viewMult * mouse.z - camera.z) / 9;
        camera.zScale = 1 / camera.z;
    }
    function updateQuadtree() {
        if (!window.PointQuadTree) {
            quadtree = null;
            return;
        }
        let w = mainCanvas.width / camera.z,
            h = mainCanvas.height / camera.z,
            x = camera.x - w / 2,
            y = camera.y - h / 2;
        quadtree = new window.PointQuadTree(x, y, w, h, QUADTREE_MAX_POINTS);
        for (let i = 0; i < cells.list.length; i++) {
            let cell = cells.list[i];
            if (!cell || !cell.points || !cell.points.length || !cell.usesJellyPhysics()) continue;
            for (let j = 0; j < cell.points.length; j++) quadtree.insert(cell.points[j]);
        }
    }
    class Cell {
        constructor(id, x, y, s, name, color, skin, flags) {
            this.destroyed = 0;
            this.diedBy = 0;
            this.deathLingerMs = 220;
            this.nameSize = 0;
            this.drawNameSize = 0;
            this.updated = null;
            this.dead = null; // timestamps
            this.id = id;
            this.x = this.nx = this.ox = x;
            this.y = this.ny = this.oy = y;
            this.s = this.ns = this.os = s;
            this.setColor(color);
            this.setName(name);
            this.setSkin(skin);
            this.applyFlags(flags);
            this.born = syncUpdStamp;
            this.points = [];
            this.pointsVel = [];
        }
        applyFlags(flags) {
            this.spiked = !!(flags & 0x01);
            this.ejected = !!(flags & 0x20);
            this.food = !!(flags & 0x80);
            this.freezeOrb = !!(flags & 0x40) && this.ejected;
            this.spikeOrb = !!(flags & 0x10) && this.ejected;
            this.shielded = !!(flags & 0x40) && !this.spiked && !this.ejected && !this.food;
            this.frozen = !!(flags & 0x10) && !this.spiked && !this.ejected && !this.food;
            this.agitated = !!(flags & 0x10) && !this.frozen && !this.spikeOrb;
            this.jagged = this.spiked || this.agitated;
        }
        destroy(killerId) {
            cells.byId.delete(this.id);
            let removedMine = cells.mine.remove(this.id),
                finalOwnedCell = removedMine && !cells.mine.length && !overlayShown && !arenaSession.exitPending && !arenaSession.resultPending;
            if (finalOwnedCell) {
                this.deathLingerMs = 960;
                beginArenaDeathTransition(killerId);
            }
            this.destroyed = 1;
            this.dead = syncUpdStamp;
            if (killerId && !this.diedBy) this.diedBy = killerId;
        }
        update(relativeTime) {
            let dt = (relativeTime - this.updated) / 120,
                prevFrameSize = this.s,
                diedBy;
            dt = Math.max(Math.min(dt, 1), 0);
            if (this.destroyed && Date.now() > this.dead + this.deathLingerMs) cells.list.remove(this);
            else if (this.diedBy && (diedBy = cells.byId.get(this.diedBy))) {
                this.nx = diedBy.x;
                this.ny = diedBy.y;
            }
            this.x = this.ox + (this.nx - this.ox) * dt;
            this.y = this.oy + (this.ny - this.oy) * dt;
            this.s = this.os + (this.ns - this.os) * dt;
            this.nameSize = ~~(~~(Math.max(~~(.3 * this.ns), 24)) / 3) * 3;
            this.drawNameSize = ~~(~~(Math.max(~~(.3 * this.s), 24)) / 3) * 3;
            if (this.usesJellyPhysics() && this.points.length) {
                let ratio = this.s / prevFrameSize;
                if (this.ns != this.os && ratio != 1)
                    for (let i = 0; i < this.points.length; i++) this.points[i].rl *= ratio;
            }
        }
        usesJellyPhysics() {
            if (!settings.jellyPhysics) return false;
            if (this.food || this.ejected) return false;
            let perfLevel = getRenderPerformanceLevel(),
                isMine = cells.mine.indexOf(this.id) !== -1;
            if (perfLevel === 0) return !!(isMine || this.spiked || this.jagged || this.shielded || this.frozen);
            if (perfLevel === 1) return !!(isMine || this.spiked || this.jagged || this.shielded || this.frozen);
            return this.jagged || !this.food;
        }
        getJellyContacts() {
            if (!this.usesJellyPhysics()) return [];
            let contacts = [];
            for (let i = 0; i < cells.list.length; i++) {
                let other = cells.list[i];
                if (!other || other === this || other.destroyed || !other.usesJellyPhysics()) continue;
                let dx = this.x - other.x,
                    dy = this.y - other.y,
                    limit = this.s + other.s + 18;
                if (dx * dx + dy * dy <= limit * limit) contacts.push(other);
            }
            return contacts;
        }
        updateNumPoints() {
            let numPoints = Math.min(Math.max(this.s * camera.z | 0, CELL_POINTS_MIN), CELL_POINTS_MAX);
            if (this.jagged) numPoints = VIRUS_POINTS;
            while (this.points.length > numPoints) {
                let i = Math.random() * this.points.length | 0;
                this.points.splice(i, 1);
                this.pointsVel.splice(i, 1);
            }
            if (this.points.length === 0 && numPoints !== 0) {
                this.points.push({
                    x: this.x,
                    y: this.y,
                    rl: this.s,
                    parent: this,
                });
                this.pointsVel.push(Math.random() - .5);
            }
            while (this.points.length < numPoints) {
                let i = Math.random() * this.points.length | 0,
                    point = this.points[i],
                    vel = this.pointsVel[i];
                this.points.splice(i, 0, {
                    x: point.x,
                    y: point.y,
                    rl: point.rl,
                    parent: this
                });
                this.pointsVel.splice(i, 0, vel);
            }
        }
        movePoints() {
            let pointsVel = this.pointsVel.slice();
            for (let i = 0; i < this.points.length; ++i) {
                let prevVel = pointsVel[(i - 1 + this.points.length) % this.points.length],
                    nextVel = pointsVel[(i + 1) % this.points.length],
                    newVel = Math.max(Math.min((this.pointsVel[i] + Math.random() - .5) * .7, 10), -10);
                this.pointsVel[i] = (prevVel + nextVel + 8 * newVel) / 10;
            }
            for (let i = 0; i < this.points.length; ++i) {
                let curP = this.points[i],
                    prevRl = this.points[(i - 1 + this.points.length) % this.points.length].rl,
                    nextRl = this.points[(i + 1) % this.points.length].rl,
                    curRl = curP.rl,
                    affected = false;
                if (!affected && border.isCircle) {
                    let dx = curP.x - border.centerX,
                        dy = curP.y - border.centerY;
                    if (dx * dx + dy * dy > border.radius * border.radius) affected = true;
                } else if (!affected) {
                    affected = curP.x < border.left || curP.y < border.top || curP.x > border.right || curP.y > border.bottom;
                }
                if (!affected && quadtree) {
                    affected = quadtree.some({
                        x: curP.x - 5,
                        y: curP.y - 5,
                        w: 10,
                        h: 10
                    }, item => item.parent !== this && sqDist(item, curP) <= 25);
                }
                if (affected) this.pointsVel[i] = Math.min(this.pointsVel[i], 0) - 1;
                curRl += this.pointsVel[i];
                curRl = Math.max(curRl, 0);
                curRl = (9 * curRl + this.s) / 10;
                curP.rl = (prevRl + nextRl + 8 * curRl) / 10;
                let angle = 2 * Math.PI * i / this.points.length,
                    rl = curP.rl;
                if (this.jagged && i % 2 === 0) rl += 5;
                curP.x = this.x + Math.cos(angle) * rl;
                curP.y = this.y + Math.sin(angle) * rl;
            }
        }
        setName(value) {
            let nameSkin = /\{([\w\W]+)\}/.exec(value);
            if (this.skin == null && nameSkin != null) {
                this.name = value.replace(nameSkin[0], "").trim();
                this.setSkin(nameSkin[1]);
            } else this.name = value;
        }
        setSkin(value) {
            this.skin = (value && value[0] === "%" ? value.slice(1) : value) || this.skin;
            if (this.skin == null || loadedSkins[this.skin]) return;
            loadedSkins[this.skin] = new Image();
            loadedSkins[this.skin].src = `${SKIN_URL}${this.skin}.png`;
        }
        setColor(value) {
            if (!value) return log.warn("Returned no color!");
            this.color = value;
            this.sColor = darkenColor(value);
        }
        draw(ctx) {
            ctx.save();
            this.drawShape(ctx);
            this.drawText(ctx);
            ctx.restore();
        }
        traceShapePath(ctx) {
            ctx.beginPath();
            if (this.jagged) ctx.lineJoin = "miter";
            if (this.usesJellyPhysics() && this.points.length) {
                let point = this.points[0];
                ctx.moveTo(point.x, point.y);
                for (let i = 0; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
            } else if (this.jagged) {
                let points = Math.floor(this.s),
                    increment = PI_2 / points;
                ctx.moveTo(this.x, this.y + this.s + 3);
                for (let i = 1; i < points; i++) {
                    let angle = i * increment,
                        dist = this.s - 3 + (i % 2 === 0) * 6;
                    ctx.lineTo(this.x + dist * Math.sin(angle), this.y + dist * Math.cos(angle));
                }
                ctx.lineTo(this.x, this.y + this.s + 3);
            } else ctx.arc(this.x, this.y, this.s, 0, PI_2, false);
            ctx.closePath();
        }
        drawSpikeHazard(ctx, alpha) {
            let ringColor = settings.showColor ? this.color : "#74ff64",
                rimColor = blendColors(ringColor, "#fff1c9", .28),
                shellColor = blendColors(ringColor, "#0e1218", .72),
                coreColor = blendColors(ringColor, "#040507", .92),
                coreHighlight = blendColors(ringColor, "#293548", .55),
                pulse = .78 + .22 * Math.sin(syncAppStamp / 420 + this.id * .19),
                shimmer = (syncAppStamp / 1100 + this.id * .13) % PI_2,
                outerGlow = this.s * (1.15 + pulse * .04),
                innerRadius = this.s * .62,
                innerRing = this.s * .74;

            ctx.globalAlpha = alpha;
            let aura = ctx.createRadialGradient(this.x, this.y, this.s * .25, this.x, this.y, outerGlow);
            aura.addColorStop(0, rgbaFromHex(ringColor, .04 * pulse));
            aura.addColorStop(.55, rgbaFromHex(ringColor, .08 * pulse));
            aura.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = aura;
            ctx.beginPath();
            ctx.arc(this.x, this.y, outerGlow, 0, PI_2);
            ctx.fill();

            this.traceShapePath(ctx);
            let shell = ctx.createRadialGradient(this.x - this.s * .18, this.y - this.s * .24, this.s * .1, this.x, this.y, this.s * 1.08);
            shell.addColorStop(0, blendColors(shellColor, "#253041", .42));
            shell.addColorStop(.38, shellColor);
            shell.addColorStop(.82, blendColors(shellColor, "#05070a", .46));
            shell.addColorStop(1, blendColors(ringColor, "#07090d", .84));
            ctx.shadowBlur = 12 + this.s * .12 * pulse;
            ctx.shadowColor = rgbaFromHex(ringColor, .26 + pulse * .08);
            ctx.fillStyle = shell;
            ctx.fill();

            ctx.shadowBlur = 10 + this.s * .08 * pulse;
            ctx.shadowColor = rgbaFromHex(ringColor, .3);
            ctx.strokeStyle = rgbaFromHex(rimColor, .92);
            ctx.lineWidth = Math.max(3, this.s * .1);
            ctx.stroke();

            ctx.shadowBlur = 0;
            let core = ctx.createRadialGradient(this.x - this.s * .12, this.y - this.s * .18, this.s * .06, this.x, this.y, innerRadius);
            core.addColorStop(0, coreHighlight);
            core.addColorStop(.22, blendColors(coreHighlight, "#121824", .45));
            core.addColorStop(.6, coreColor);
            core.addColorStop(1, "#050608");
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(this.x, this.y, innerRadius, 0, PI_2);
            ctx.fill();

            ctx.strokeStyle = rgbaFromHex(rimColor, .42 + pulse * .12);
            ctx.lineWidth = Math.max(2, this.s * .038);
            ctx.beginPath();
            ctx.arc(this.x, this.y, innerRing, shimmer, shimmer + 1.2);
            ctx.stroke();

            ctx.strokeStyle = rgbaFromHex(ringColor, .2 + pulse * .08);
            ctx.lineWidth = Math.max(1.6, this.s * .024);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.s * .48, 0, PI_2);
            ctx.stroke();

            ctx.fillStyle = rgbaFromHex("#ffe9b8", .55 * pulse);
            ctx.beginPath();
            ctx.arc(this.x - this.s * .2, this.y - this.s * .24, Math.max(2, this.s * .075), 0, PI_2);
            ctx.fill();
        }
        drawShieldAura(ctx, alpha) {
            let pulse = .72 + .28 * Math.sin(syncAppStamp / 170 + this.id * .11),
                ringColor = "#ff5c52",
                hotColor = "#ff9a62",
                glowRadius = this.s * (1.12 + pulse * .05),
                arcStart = (syncAppStamp / 560 + this.id * .07) % PI_2,
                perfLevel = getRenderPerformanceLevel(),
                shapeCount = perfLevel === 2 ? 4 : perfLevel === 1 ? 2 : 0,
                orbitArcCount = perfLevel === 2 ? 3 : perfLevel === 1 ? 1 : 0;
            ctx.save();
            ctx.globalAlpha = alpha;
            if (perfLevel > 0) {
                let aura = ctx.createRadialGradient(this.x, this.y, this.s * .6, this.x, this.y, glowRadius);
                aura.addColorStop(0, "rgba(255,92,82,0)");
                aura.addColorStop(.72, "rgba(255,92,82," + (0.12 + pulse * .08) + ")");
                aura.addColorStop(1, "rgba(255,92,82,0)");
                ctx.fillStyle = aura;
                ctx.beginPath();
                ctx.arc(this.x, this.y, glowRadius, 0, PI_2);
                ctx.fill();
            }

            this.traceShapePath(ctx);
            ctx.strokeStyle = "rgba(255,110,96," + (0.7 + pulse * .18) + ")";
            ctx.lineWidth = Math.max(3, this.s * .045);
            ctx.shadowBlur = perfLevel === 2 ? 16 + this.s * .08 : perfLevel === 1 ? 8 + this.s * .04 : 0;
            ctx.shadowColor = "rgba(255,82,72,0.42)";
            ctx.stroke();

            ctx.shadowBlur = 0;
            for (let i = 0; i < shapeCount; i++) {
                let shapeAngle = arcStart + i * (PI_2 / 4),
                    shapeRadius = this.s * (1.16 + pulse * 0.02),
                    shapeX = this.x + Math.cos(shapeAngle) * shapeRadius,
                    shapeY = this.y + Math.sin(shapeAngle) * shapeRadius,
                    shapeSize = Math.max(4, this.s * 0.09);
                ctx.save();
                ctx.translate(shapeX, shapeY);
                ctx.rotate(shapeAngle + Math.PI / 4);
                ctx.fillStyle = "rgba(255,152,112," + (0.34 + pulse * .14) + ")";
                ctx.beginPath();
                ctx.moveTo(0, -shapeSize);
                ctx.lineTo(shapeSize * .72, 0);
                ctx.lineTo(0, shapeSize);
                ctx.lineTo(-shapeSize * .72, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            if (orbitArcCount > 0) {
                ctx.strokeStyle = "rgba(255,132,112," + (0.4 + pulse * .12) + ")";
                ctx.lineWidth = Math.max(1.2, this.s * .014);
                ctx.beginPath();
                for (let i = 0; i < orbitArcCount; i++) {
                    let start = arcStart + i * (PI_2 / Math.max(orbitArcCount, 1));
                    ctx.arc(this.x, this.y, this.s * 1.11, start, start + .55);
                }
                ctx.stroke();
            }
            ctx.strokeStyle = "rgba(255,196,164," + (0.58 + pulse * .12) + ")";
            ctx.lineWidth = Math.max(1.4, this.s * .018);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.s * 1.015, arcStart, arcStart + 1.35);
            ctx.stroke();
            ctx.restore();
        }
        drawFrozenOverlay(ctx, alpha) {
            let pulse = .82 + .18 * Math.sin(syncAppStamp / 220 + this.id * .09),
                sweep = (syncAppStamp / 680 + this.id * .05) % PI_2,
                shardRot = (syncAppStamp / 900 + this.id * .03) % PI_2,
                outerGlowRadius = this.s * (1.22 + pulse * .05),
                perfLevel = getRenderPerformanceLevel(),
                shardCount = perfLevel === 2 ? 6 : perfLevel === 1 ? 3 : 0,
                frostLineCount = perfLevel === 2 ? 3 : perfLevel === 1 ? 1 : 0;

            ctx.save();
            ctx.globalAlpha = alpha;
            if (perfLevel > 0) {
                let aura = ctx.createRadialGradient(this.x, this.y, this.s * .58, this.x, this.y, outerGlowRadius);
                aura.addColorStop(0, "rgba(112,214,255,0)");
                aura.addColorStop(.58, "rgba(96,206,255," + (0.14 + pulse * .08) + ")");
                aura.addColorStop(.82, "rgba(150,236,255," + (0.16 + pulse * .08) + ")");
                aura.addColorStop(1, "rgba(150,236,255,0)");
                ctx.fillStyle = aura;
                ctx.beginPath();
                ctx.arc(this.x, this.y, outerGlowRadius, 0, PI_2);
                ctx.fill();
            }

            for (let i = 0; i < shardCount; i++) {
                let angle = shardRot + i * (PI_2 / 6),
                    radius = this.s * (1.03 + ((i % 2) ? .04 : .08) + pulse * .015),
                    shardX = this.x + Math.cos(angle) * radius,
                    shardY = this.y + Math.sin(angle) * radius,
                    shardSize = Math.max(4, this.s * .11);
                ctx.save();
                ctx.translate(shardX, shardY);
                ctx.rotate(angle + Math.PI / 2);
                ctx.fillStyle = "rgba(206,248,255," + (0.24 + pulse * .12) + ")";
                ctx.beginPath();
                ctx.moveTo(0, -shardSize);
                ctx.lineTo(shardSize * .48, 0);
                ctx.lineTo(0, shardSize * .7);
                ctx.lineTo(-shardSize * .48, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();

            ctx.save();
            this.traceShapePath(ctx);
            ctx.clip();
            ctx.globalAlpha = alpha;

            let frost = ctx.createRadialGradient(this.x - this.s * .24, this.y - this.s * .3, this.s * .08, this.x, this.y, this.s * 1.05);
            frost.addColorStop(0, "rgba(250,254,255," + (0.34 + pulse * .1) + ")");
            frost.addColorStop(.28, "rgba(188,236,255," + (0.28 + pulse * .08) + ")");
            frost.addColorStop(.64, "rgba(112,198,255," + (0.24 + pulse * .06) + ")");
            frost.addColorStop(1, "rgba(62,120,220,0.14)");
            ctx.fillStyle = frost;
            ctx.fillRect(this.x - this.s - 14, this.y - this.s - 14, this.s * 2 + 28, this.s * 2 + 28);

            let chillBand = ctx.createLinearGradient(this.x - this.s * .9, this.y - this.s * .8, this.x + this.s, this.y + this.s * .9);
            chillBand.addColorStop(0, "rgba(255,255,255,0)");
            chillBand.addColorStop(.22, "rgba(232,250,255,0.18)");
            chillBand.addColorStop(.5, "rgba(146,222,255,0.24)");
            chillBand.addColorStop(.76, "rgba(228,250,255,0.16)");
            chillBand.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = chillBand;
            ctx.fillRect(this.x - this.s - 10, this.y - this.s - 10, this.s * 2 + 20, this.s * 2 + 20);

            ctx.strokeStyle = "rgba(238,251,255,0.34)";
            ctx.lineWidth = Math.max(1.2, this.s * .02);
            for (let i = 0; i < frostLineCount; i++) {
                let mapped = frostLineCount === 1 ? 0 : i - 1;
                let offset = mapped * this.s * .23;
                ctx.beginPath();
                ctx.moveTo(this.x - this.s * .74, this.y - this.s * .1 + offset);
                ctx.lineTo(this.x - this.s * .18, this.y - this.s * .36 + offset * .65);
                ctx.lineTo(this.x + this.s * .08, this.y - this.s * .18 + offset * .35);
                ctx.lineTo(this.x + this.s * .58, this.y - this.s * .44 + offset * .2);
                ctx.stroke();
            }
            if (perfLevel === 2) {
                ctx.strokeStyle = "rgba(176,230,255,0.42)";
                ctx.lineWidth = Math.max(1.1, this.s * .016);
                for (let i = 0; i < 3; i++) {
                    let angle = sweep + i * 1.45,
                        startX = this.x + Math.cos(angle) * this.s * .2,
                        startY = this.y + Math.sin(angle) * this.s * .18;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(startX + Math.cos(angle + .2) * this.s * .22, startY + Math.sin(angle + .2) * this.s * .22);
                    ctx.lineTo(startX + Math.cos(angle - .28) * this.s * .36, startY + Math.sin(angle - .28) * this.s * .36);
                    ctx.stroke();
                }
            }
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = alpha;
            this.traceShapePath(ctx);
            ctx.strokeStyle = "rgba(196,242,255," + (0.86 + pulse * .08) + ")";
            ctx.lineWidth = Math.max(4, this.s * .05);
            ctx.shadowBlur = perfLevel === 2 ? 18 + this.s * .08 : perfLevel === 1 ? 8 + this.s * .04 : 0;
            ctx.shadowColor = "rgba(114,224,255,0.48)";
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(248,253,255," + (0.58 + pulse * .12) + ")";
            ctx.lineWidth = Math.max(1.4, this.s * .018);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.s * 1.01, sweep, sweep + 1.38);
            ctx.stroke();

            ctx.strokeStyle = "rgba(118,208,255," + (0.46 + pulse * .14) + ")";
            ctx.lineWidth = Math.max(1.6, this.s * .02);
            ctx.beginPath();
            for (let i = 0; i < 2; i++) {
                let start = sweep + i * Math.PI;
                ctx.arc(this.x, this.y, this.s * 1.1, start, start + .72);
            }
            ctx.stroke();
            ctx.restore();
        }
        drawFreezeOrbProjectile(ctx, alpha) {
            let pulse = .76 + .24 * Math.sin(syncAppStamp / 160 + this.id * .13),
                outer = this.s * (1.2 + pulse * .05),
                aura = ctx.createRadialGradient(this.x, this.y, this.s * .2, this.x, this.y, outer),
                perfLevel = getRenderPerformanceLevel();
            ctx.save();
            ctx.globalAlpha = alpha;
            if (perfLevel > 0) {
                aura.addColorStop(0, "rgba(235,248,255,0.92)");
                aura.addColorStop(.18, "rgba(162,231,255,0.85)");
                aura.addColorStop(.46, "rgba(130,182,255,0.42)");
                aura.addColorStop(.58, "rgba(82,196,255,0.32)");
                aura.addColorStop(1, "rgba(82,196,255,0)");
                ctx.fillStyle = aura;
                ctx.beginPath();
                ctx.arc(this.x, this.y, outer, 0, PI_2);
                ctx.fill();
            }

            let core = ctx.createRadialGradient(this.x - this.s * .18, this.y - this.s * .22, this.s * .08, this.x, this.y, this.s);
            core.addColorStop(0, "rgba(255,255,255,0.98)");
            core.addColorStop(.32, "rgba(189,239,255,0.96)");
            core.addColorStop(.74, "rgba(89,190,255,0.82)");
            core.addColorStop(1, "rgba(33,112,188,0.86)");
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.s, 0, PI_2);
            ctx.fill();

            ctx.strokeStyle = "rgba(232,250,255," + (0.78 + pulse * .12) + ")";
            ctx.lineWidth = Math.max(1.8, this.s * .12);
            ctx.shadowBlur = perfLevel === 2 ? 18 : perfLevel === 1 ? 8 : 0;
            ctx.shadowColor = "rgba(92,210,255,0.55)";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.s * .88, syncAppStamp / 420, syncAppStamp / 420 + 1.6);
            ctx.stroke();

            if (perfLevel > 0) {
                ctx.strokeStyle = "rgba(182,168,255," + (0.54 + pulse * .16) + ")";
                ctx.lineWidth = Math.max(1.2, this.s * .08);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.s * .62, -syncAppStamp / 360, -syncAppStamp / 360 + 1.2);
                ctx.stroke();
            }

            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.beginPath();
            ctx.arc(this.x - this.s * .26, this.y - this.s * .24, Math.max(1.5, this.s * .16), 0, PI_2);
            ctx.fill();
            ctx.restore();
        }
        drawSpikeOrbProjectile(ctx, alpha) {
            let pulse = .74 + .26 * Math.sin(syncAppStamp / 150 + this.id * .17),
                outer = this.s * (1.22 + pulse * .04),
                glow = ctx.createRadialGradient(this.x, this.y, this.s * .18, this.x, this.y, outer),
                perfLevel = getRenderPerformanceLevel();
            ctx.save();
            ctx.globalAlpha = alpha;
            if (perfLevel > 0) {
                glow.addColorStop(0, "rgba(255,236,214,0.95)");
                glow.addColorStop(.22, "rgba(255,162,108,0.88)");
                glow.addColorStop(.58, "rgba(255,104,62,0.34)");
                glow.addColorStop(1, "rgba(255,104,62,0)");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(this.x, this.y, outer, 0, PI_2);
                ctx.fill();
            }

            let core = ctx.createRadialGradient(this.x - this.s * .15, this.y - this.s * .16, this.s * .08, this.x, this.y, this.s);
            core.addColorStop(0, "rgba(255,255,255,0.96)");
            core.addColorStop(.28, "rgba(255,204,152,0.94)");
            core.addColorStop(.68, "rgba(255,120,64,0.88)");
            core.addColorStop(1, "rgba(121,28,18,0.88)");
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.s, 0, PI_2);
            ctx.fill();

            ctx.strokeStyle = "rgba(255,235,205," + (0.76 + pulse * .12) + ")";
            ctx.lineWidth = Math.max(1.8, this.s * .12);
            ctx.shadowBlur = perfLevel === 2 ? 18 : perfLevel === 1 ? 8 : 0;
            ctx.shadowColor = "rgba(255,118,78,0.52)";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.s * .9, syncAppStamp / 360, syncAppStamp / 360 + 1.35);
            ctx.stroke();

            if (perfLevel > 0) {
                ctx.strokeStyle = "rgba(255,164,118," + (0.46 + pulse * .18) + ")";
                ctx.lineWidth = Math.max(1.2, this.s * .075);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.s * .58, -syncAppStamp / 300, -syncAppStamp / 300 + 1.1);
                ctx.stroke();
            }

            ctx.fillStyle = "rgba(255,244,224,0.82)";
            ctx.beginPath();
            ctx.arc(this.x - this.s * .24, this.y - this.s * .22, Math.max(1.5, this.s * .14), 0, PI_2);
            ctx.fill();
            ctx.restore();
        }
        drawShape(ctx) {
            if (settings.hideFood && this.food) return;
            let alpha = 1;
            if (settings.transparency) alpha = .75;
            else if (this.destroyed) alpha = Math.max(200 - Date.now() + this.dead, 0) / 100;
            else alpha = Math.min(Date.now() - this.born, 200) / 100;
            if (this.spiked) {
                this.drawSpikeHazard(ctx, alpha);
                return;
            }
            if (this.freezeOrb) {
                this.drawFreezeOrbProjectile(ctx, alpha);
                return;
            }
            if (this.spikeOrb) {
                this.drawSpikeOrbProjectile(ctx, alpha);
                return;
            }
            ctx.fillStyle = settings.showColor ? this.color : Cell.prototype.color;
            let color = getOptionalFieldValue("cellBorderColor", "");
            ctx.strokeStyle = color.length === 3 || color.length === 6 ? "#" + color : settings.showColor ? this.sColor : Cell.prototype.sColor;
            ctx.lineWidth = this.jagged ? 12 : Math.max(~~(this.s / 50), 10);
            let showCellBorder = settings.cellBorders && !this.food && !this.ejected && !this.spiked && 20 < this.s;
            if (showCellBorder) this.s -= ctx.lineWidth / 2 - 2;
            this.traceShapePath(ctx);
            ctx.globalAlpha = alpha;
            if (showCellBorder) ctx.stroke();
            ctx.fill();
            if (settings.showSkins && this.skin) {
                let skin = loadedSkins[this.skin];
                if (skin && skin.complete && skin.width && skin.height) {
                    ctx.save();
                    ctx.clip();
                    scaleBack(ctx);
                    let sScaled = this.s * camera.z;
                    if (this.usesJellyPhysics()) sScaled += 3;
                    ctx.drawImage(skin, this.x * camera.z - sScaled, this.y * camera.z - sScaled, sScaled *= 2, sScaled);
                    scaleForth(ctx);
                    ctx.restore();
                }
            }
            if (this.frozen) this.drawFrozenOverlay(ctx, alpha);
            if (this.shielded) this.drawShieldAura(ctx, alpha);
            if (showCellBorder) this.s += ctx.lineWidth / 2 - 2;
        }
        drawText(ctx) {
            if (this.s < 20 || this.jagged) return;
            let perfLevel = getRenderPerformanceLevel(),
                curvedThreshold = perfLevel === 2 ? 44 : perfLevel === 1 ? 56 : 72,
                curvedNameVisible = this.name && settings.showNames && this.s >= curvedThreshold,
                useCurvedName = curvedNameVisible && perfLevel > 0,
                curvedNameSize = Math.max(12, Math.min(12 + Math.pow(this.s, .92) * .16, perfLevel === 2 ? 82 : perfLevel === 1 ? 74 : 66)),
                fallbackNameY = this.y + this.s - Math.max(curvedNameSize * .95, this.s * .12);
            if (settings.showMass && (cells.mine.indexOf(this.id) !== -1 || !cells.mine.length) && !this.food/* && !this.ejected*/) {
                let mass = (~~(this.s * this.s / 100)).toString();
                if (useCurvedName) {
                    drawCurvedName(ctx, this.x, this.y, this.s, curvedNameSize, curvedNameSize, this.name);
                    drawText(ctx, 1, this.x, this.y - Math.max(this.s * .28, curvedNameSize * 1.48), this.nameSize / 2, this.drawNameSize / 2, mass);
                } else {
                    drawText(ctx, 1, this.x, curvedNameVisible ? this.y - Math.max(this.s * .22, curvedNameSize * 1.18) : this.y, this.nameSize / 2, this.drawNameSize / 2, mass);
                    if (curvedNameVisible) drawText(ctx, 0, this.x, fallbackNameY, curvedNameSize, curvedNameSize, this.name);
                }
            } else if (useCurvedName) drawCurvedName(ctx, this.x, this.y, this.s, curvedNameSize, curvedNameSize, this.name);
            else if (curvedNameVisible) drawText(ctx, 0, this.x, fallbackNameY, curvedNameSize, curvedNameSize, this.name);
        }
    }
    // 2-var draw-stay cache
    let cachedCurvedNames = {},
        cachedMass  = {};
    function cacheCleanup() {
        let curvedTtl = performanceGuard.level === 0 ? 1600 : performanceGuard.level === 1 ? 2800 : 5000;
        for (let i in cachedCurvedNames) {
            for (let j in cachedCurvedNames[i])
                if (syncAppStamp - cachedCurvedNames[i][j].accessTime >= curvedTtl) delete cachedCurvedNames[i][j];
            if (!Object.keys(cachedCurvedNames[i]).length) delete cachedCurvedNames[i];
        }
        for (let i in cachedMass)
            if (syncAppStamp - cachedMass[i].accessTime >= 5000) delete cachedMass[i];
    }
    function drawTextOnto(canvas, ctx, text, size) {
        ctx.font = `${size}px Ubuntu`;
        ctx.lineWidth = settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2;
        canvas.width = ctx.measureText(text).width + 2 * ctx.lineWidth;
        canvas.height = 4 * size;
        ctx.font = `${size}px Ubuntu`;
        ctx.lineWidth = settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        let string = getOptionalFieldValue("nameColor", "FFF");
        ctx.fillStyle = "#" + string;
        ctx.strokeStyle = "#000";
        ctx.translate(canvas.width / 2, 2 * size);
        (ctx.lineWidth !== 1) && ctx.strokeText(text, 0, 0);
        ctx.fillText(text, 0, 0);
    }
    function drawRaw(ctx, x, y, text, size) {
        ctx.font = `${size}px Ubuntu`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.lineWidth = settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2;
        ctx.fillStyle = "#FFF";
        ctx.strokeStyle = "#000";
        if (ctx.lineWidth !== 1) ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
    }
    function runSplitBurst(count) {
        for (let i = 0; i < count; i++) setTimeout(() => wsSend(UINT8[17]), 50 * i);
    }
    function triggerDoubleSplitBurst() {
        if (isTyping || overlayShown || pressed.doubleSplit) return;
        pressed.doubleSplit = 1;
        runSplitBurst(2);
        setTimeout(() => {
            pressed.doubleSplit = 0;
        }, 140);
    }
    function triggerColorShift() {
        if (isTyping || overlayShown || pressed.colorShift) return;
        wsSend(UINT8[36]);
        pressed.colorShift = 1;
    }
    function handleBoundActionDown(actionId) {
        switch (actionId) {
            case "chat":
                if (overlayShown || settings.hideChat) return;
                if (isTyping) {
                    chatBox.blur();
                    let chatText = chatBox.value;
                    if (chatText.length > 0) sendChat(chatText);
                    chatBox.value = "";
                } else chatBox.focus();
                break;
            case "split":
                if (isTyping || overlayShown || pressed.space) return;
                wsSend(UINT8[17]);
                pressed.space = 1;
                break;
            case "eject":
                if (isTyping || overlayShown) return;
                wsSend(UINT8[21]);
                pressed.w = 1;
                break;
            case "shield":
                if (isTyping || overlayShown || pressed.shield) return;
                wsSend(UINT8[22]);
                pressed.shield = 1;
                break;
            case "freeze":
                if (isTyping || overlayShown || pressed.freeze) return;
                wsSend(UINT8[23]);
                pressed.freeze = 1;
                break;
            case "spike":
                if (isTyping || overlayShown || pressed.spike) return;
                wsSend(UINT8[37]);
                pressed.spike = 1;
                break;
            case "colorShift":
                triggerColorShift();
                break;
            case "doubleSplit":
                triggerDoubleSplitBurst();
                break;
            case "tripleSplit":
                if (isTyping || overlayShown || pressed.tripleSplit) return;
                pressed.tripleSplit = 1;
                runSplitBurst(3);
                break;
            case "maxSplit":
                if (isTyping || overlayShown || pressed.maxSplit) return;
                pressed.maxSplit = 1;
                runSplitBurst(16);
                break;
            case "toggleMenu":
                if (pressed.esc) return;
                if (overlayShown) {
                    pressed.esc = 1;
                    return;
                }
                if (typeof wHandle.noxCloseArenaModal === "function" && wHandle.noxCloseArenaModal()) {
                    pressed.esc = 1;
                    return;
                }
                if (typeof wHandle.noxOpenArenaExitPrompt === "function") wHandle.noxOpenArenaExitPrompt();
                else wHandle.noxExitArena();
                pressed.esc = 1;
                break;
        }
    }
    function handleBoundActionUp(actionId) {
        switch (actionId) {
            case "split":
                pressed.space = 0;
                break;
            case "eject":
                pressed.w = 0;
                break;
            case "shield":
                pressed.shield = 0;
                break;
            case "freeze":
                pressed.freeze = 0;
                break;
            case "spike":
                pressed.spike = 0;
                break;
            case "colorShift":
                pressed.colorShift = 0;
                break;
            case "doubleSplit":
                pressed.doubleSplit = 0;
                break;
            case "tripleSplit":
                pressed.tripleSplit = 0;
                break;
            case "maxSplit":
                pressed.maxSplit = 0;
                break;
            case "toggleMenu":
                pressed.esc = 0;
                break;
        }
    }
    function newNameCache(value, size) {
        let canvas = document.createElement("canvas"),
            ctx = canvas.getContext("2d");
        drawTextOnto(canvas, ctx, value, size);
        cachedCurvedNames[value] = cachedCurvedNames[value] || {};
        cachedCurvedNames[value][size] = {
            width: canvas.width,
            height: canvas.height,
            canvas: canvas,
            value: value,
            size: size,
            accessTime: syncAppStamp
        };
        return cachedCurvedNames[value][size];
    }
    function newMassCache(size) {
        let canvases = {
            "0": {}, "1": {}, "2": {}, "3": {}, "4": {},
            "5": {}, "6": {}, "7": {}, "8": {}, "9": {}
        };
        for (let value in canvases) {
            let canvas = canvases[value].canvas = document.createElement("canvas"),
                ctx = canvas.getContext("2d");
            drawTextOnto(canvas, ctx, value, size);
            canvases[value].canvas = canvas;
            canvases[value].width = canvas.width;
            canvases[value].height = canvas.height;
        }
        cachedMass[size] = {
            canvases: canvases,
            size: size,
            lineWidth: settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2,
            accessTime: syncAppStamp
        };
        return cachedMass[size];
    }
    function toleranceTest(a, b, tolerance) {
        return (a - tolerance) <= b && b <= (a + tolerance);
    }
    const curvedNameMeasureCanvas = document.createElement("canvas"),
        curvedNameMeasureCtx = curvedNameMeasureCanvas.getContext("2d"),
        curvedNameFontFamily = "Arial, Helvetica, sans-serif";
    function buildCurvedNameKey(size, radius) {
        let sizeBucket = Math.max(8, Math.round(size / 2) * 2),
            radiusBucket = Math.max(12, Math.round(radius / 4) * 4),
            outlineKey = settings.showTextOutline ? 1 : 0,
            colorKey = getOptionalFieldValue("nameColor", "F7FAFF").toUpperCase();
        return `${sizeBucket}:${radiusBucket}:${outlineKey}:${colorKey}`;
    }
    function truncateCurvedName(text, fontSize, maxWidth) {
        let value = String(text || "").trim();
        if (!value) return "";
        curvedNameMeasureCtx.font = `700 ${fontSize}px ${curvedNameFontFamily}`;
        if (curvedNameMeasureCtx.measureText(value).width <= maxWidth) return value;
        let ellipsis = "...",
            ellipsisWidth = curvedNameMeasureCtx.measureText(ellipsis).width,
            characters = Array.from(value),
            sliced = characters.slice();
        while (sliced.length > 1) {
            sliced.pop();
            let candidate = sliced.join("") + ellipsis;
            if (curvedNameMeasureCtx.measureText(candidate).width <= Math.max(ellipsisWidth, maxWidth)) return candidate;
        }
        return ellipsisWidth <= maxWidth ? ellipsis : "";
    }
    function drawCurvedTextOnto(canvas, ctx, text, fontSize, radius) {
        let fillHex = "#" + getOptionalFieldValue("nameColor", "FFF8EE"),
            strokeWidth = settings.showTextOutline ? Math.max(fontSize * .22, 3.2) : 1.9,
            usableRadius = Math.max(fontSize * 1.6, radius),
            pathRadius = Math.max(fontSize * 2.15, usableRadius - Math.max(fontSize * 1.18, usableRadius * .08)),
            maxWidth = Math.max(fontSize * 4.5, pathRadius * 1.42),
            oversample = Math.max(2, Math.min(3, Math.ceil((window.devicePixelRatio || 1) * 1.25))),
            displayText = truncateCurvedName(text, fontSize, maxWidth);
        if (!displayText) return {
            text: "",
            width: 0,
            height: 0,
            size: fontSize,
            radius: usableRadius,
            anchorBaselineY: 0
        };
        curvedNameMeasureCtx.font = `700 ${fontSize}px ${curvedNameFontFamily}`;
        let glyphs = Array.from(displayText),
            letterSpacing = Math.max(.35, fontSize * .01),
            widths = glyphs.map(char => Math.max(1, curvedNameMeasureCtx.measureText(char).width)),
            totalAdvance = widths.reduce((sum, width, index) => sum + width + (index < widths.length - 1 ? letterSpacing : 0), 0),
            totalAngle = Math.min(1.22, totalAdvance / Math.max(pathRadius, 1)),
            arcDepth = Math.max(fontSize * .22, pathRadius * (1 - Math.cos(totalAngle / 2))),
            paddingX = Math.ceil(fontSize * .85 + strokeWidth),
            paddingTop = Math.ceil(fontSize * .36 + strokeWidth),
            paddingBottom = Math.ceil(fontSize * .7 + strokeWidth),
            centerX = Math.ceil(pathRadius * Math.sin(totalAngle / 2)) + paddingX,
            centerY = paddingTop,
            logicalWidth = Math.ceil(centerX * 2),
            logicalHeight = Math.ceil(centerY + pathRadius + fontSize * .68 + paddingBottom),
            baselineY = centerY + pathRadius;
        canvas.width = Math.max(1, Math.ceil(logicalWidth * oversample));
        canvas.height = Math.max(1, Math.ceil(logicalHeight * oversample));
        ctx.setTransform(oversample, 0, 0, oversample, 0, 0);
        ctx.clearRect(0, 0, logicalWidth, logicalHeight);
        ctx.font = `700 ${fontSize}px ${curvedNameFontFamily}`;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.miterLimit = 2;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = fillHex;
        ctx.strokeStyle = "rgba(8, 8, 10, 0.98)";
        ctx.shadowColor = "rgba(0, 0, 0, 0.34)";
        ctx.shadowBlur = fontSize * .04;
        let angleCursor = -totalAngle / 2;
        for (let i = 0; i < glyphs.length; i++) {
            let glyph = glyphs[i],
                halfAngle = widths[i] / (2 * pathRadius),
                angle = angleCursor + halfAngle,
                px = centerX + Math.sin(angle) * pathRadius,
                py = centerY + Math.cos(angle) * pathRadius;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(-angle);
            if (strokeWidth > 1) ctx.strokeText(glyph, 0, 0);
            ctx.fillText(glyph, 0, 0);
            ctx.restore();
            angleCursor += halfAngle * 2 + letterSpacing / pathRadius;
        }
        return {
            text: displayText,
            width: logicalWidth,
            height: logicalHeight,
            size: fontSize,
            radius: usableRadius,
            anchorBaselineY: baselineY
        };
    }
    function newCurvedNameCache(value, size, radius) {
        let cacheKey = buildCurvedNameKey(size, radius),
            canvas = document.createElement("canvas"),
            ctx = canvas.getContext("2d"),
            meta = drawCurvedTextOnto(canvas, ctx, value, size, radius);
        cachedCurvedNames[value] = cachedCurvedNames[value] || {};
        cachedCurvedNames[value][cacheKey] = {
            canvas: canvas,
            width: meta.width,
            height: meta.height,
            value: meta.text,
            size: size,
            radius: radius,
            anchorBaselineY: meta.anchorBaselineY,
            accessTime: syncAppStamp
        };
        return cachedCurvedNames[value][cacheKey];
    }
    function getNameCache(value, size) {
        if (!cachedCurvedNames[value]) return newNameCache(value, size);
        let sizes = Object.keys(cachedCurvedNames[value]);
        for (let i = 0, l = sizes.length; i < l; i++)
            if (toleranceTest(size, sizes[i], size / 4)) return cachedCurvedNames[value][sizes[i]];
        return newNameCache(value, size);
    }
    function getCurvedNameCache(value, size, radius) {
        let cacheKey = buildCurvedNameKey(size, radius);
        if (!cachedCurvedNames[value] || !cachedCurvedNames[value][cacheKey]) return newCurvedNameCache(value, size, radius);
        return cachedCurvedNames[value][cacheKey];
    }
    function getMassCache(size) {
        let sizes = Object.keys(cachedMass);
        for (let i = 0, l = sizes.length; i < l; i++)
            if (toleranceTest(size, sizes[i], size / 4)) return cachedMass[sizes[i]];
        return newMassCache(size);
    }
    function drawCurvedName(ctx, x, y, radius, size, drawSize, value) {
        if (!value) return;
        let curveRadius = Math.max(radius * .64, radius - Math.max(size * 1.18, radius * .08)),
            anchorY = y + radius - Math.max(size * .78, radius * .07),
            cache = getCurvedNameCache(value, size, curveRadius),
            correctionScale = drawSize / Math.max(cache.size, 1),
            drawWidth = cache.width * correctionScale,
            drawHeight = cache.height * correctionScale;
        cache.accessTime = syncAppStamp;
        ctx.save();
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(cache.canvas, x - drawWidth / 2, anchorY - cache.anchorBaselineY * correctionScale, drawWidth, drawHeight);
        ctx.restore();
    }
    function drawText(ctx, isMass, x, y, size, drawSize, value) {
        ctx.save();
        if (size > 500) return drawRaw(ctx, x, y, value, drawSize);
        ctx.imageSmoothingQuality = "high";
        if (isMass) {
            let cache = getMassCache(size);
            cache.accessTime = syncAppStamp;
            let canvases = cache.canvases,
                correctionScale = drawSize / cache.size,
                width = 0; // Calculate width
            for (let i = 0; i < value.length; i++) width += canvases[value[i]].width - 2 * cache.lineWidth;
            ctx.scale(correctionScale, correctionScale);
            x /= correctionScale;
            y /= correctionScale;
            x -= width / 2;
            for (let i = 0; i < value.length; i++) {
                let item = canvases[value[i]];
                ctx.drawImage(item.canvas, x, y - item.height / 2);
                x += item.width - 2 * cache.lineWidth;
            }
        } else {
            let cache = getNameCache(value, size);
            cache.accessTime = syncAppStamp;
            let canvas = cache.canvas,
                correctionScale = drawSize / cache.size;
            ctx.scale(correctionScale, correctionScale);
            x /= correctionScale;
            y /= correctionScale;
            ctx.drawImage(canvas, x - canvas.width / 2, y - canvas.height / 2);
        }
        ctx.restore();
    }
    function init() {
        mainCanvas = document.getElementById("canvas");
        mainCtx = mainCanvas.getContext("2d");
        chatBox = document.getElementById("chat_textbox");
        soundsVolume = document.getElementById("soundsVolume");
        soundsVolumeValue = document.getElementById("nox-sound-volume-value");
        soundToggle = document.getElementById("nox-sound-toggle");
        gameLogsToggle = document.getElementById("nox-logs-toggle");
        arenaHud.score = document.getElementById("nox-hud-score");
        arenaHud.mass = document.getElementById("nox-hud-mass");
        arenaHud.fps = document.getElementById("nox-hud-fps");
        arenaHud.ping = document.getElementById("nox-hud-ping");
        initMobileControls();
        initArenaAbilityHud();
        arenaLeaderboard.root = document.getElementById("nox-arena-leaderboard");
        arenaLeaderboard.list = document.getElementById("nox-arena-leaderboard-list");
        arenaLeaderboard.self = document.getElementById("nox-arena-leaderboard-self");
        syncArenaLeaderboardUI();
        renderArenaLeaderboard();
        if (wHandle.localStorage) soundEnabled = wHandle.localStorage.getItem("nox-sound-enabled") !== "false";
        syncSoundToggleUI();
        if (soundsVolume) {
            let storedVolume = wHandle.localStorage ? parseFloat(wHandle.localStorage.getItem("nox-sounds-volume")) : NaN;
            if (isFinite(storedVolume)) soundsVolume.value = storedVolume;
            soundsVolume.addEventListener("input", syncSoundVolumeUI);
            syncSoundVolumeUI();
        }
        if (wHandle.localStorage) {
            let storedChatHidden = wHandle.localStorage.getItem("checkbox-7");
            if (storedChatHidden == null) storedChatHidden = wHandle.localStorage.getItem("nox-chat-hidden");
            let storedGameLogs = wHandle.localStorage.getItem("nox-game-logs-enabled");
            if (storedChatHidden == null) {
                let legacyChatEnabled = wHandle.localStorage.getItem("nox-chat-enabled");
                if (legacyChatEnabled != null) storedChatHidden = legacyChatEnabled === "true" ? "false" : "true";
            }
            if (storedGameLogs == null) {
                let legacyHideChat = wHandle.localStorage.getItem("checkbox-7");
                if (legacyHideChat != null) storedGameLogs = legacyHideChat === "true" ? "false" : "true";
            }
            if (storedChatHidden != null) wHandle.noxSetChatHidden(storedChatHidden === "true");
            else wHandle.noxSetChatHidden(false);
            if (storedGameLogs != null) wHandle.noxSetGameLogsEnabled(storedGameLogs === "true");
            else syncGameLogsToggleUI();
        } else {
            wHandle.noxSetChatHidden(false);
            syncGameLogsToggleUI();
        }
        loadKeyBindings();
        updateArenaAbilityHud(true);
        renderKeyBindingList();
        mainCanvas.focus();
        function handleScroll(event) {
            mouse.z *= Math.pow(.95, event.wheelDelta / -120 || event.detail || 0);
            if (!settings.infiniteZoom && mouse.z < 1) mouse.z = 1;
            if (mouse.z > 4 / mouse.z) mouse.z = 4 / mouse.z;
        }
        if (/firefox/i.test(navigator.userAgent)) document.addEventListener("DOMMouseScroll", handleScroll, 0);
        else document.body.onmousewheel = handleScroll;
        wHandle.onkeydown = function(event) {
            let code = getEventBindingCode(event);
            if (keyBindingCapture) {
                if (!code) return;
                event.preventDefault();
                event.stopPropagation();
                setKeyBinding(keyBindingCapture, code);
                return;
            }
            let action = findActionByCode(code);
            if (!action) return;
            if (isTextEntryActive() && action.id !== "chat") return;
            event.preventDefault();
            handleBoundActionDown(action.id);
        };
        wHandle.onkeyup = function(event) {
            if (keyBindingCapture) return;
            let action = findActionByCode(getEventBindingCode(event));
            if (!action) return;
            if (isTextEntryActive() && action.id !== "chat") return;
            event.preventDefault();
            handleBoundActionUp(action.id);
        };
        chatBox.onblur = function() {
            isTyping = 0;
            drawChat();
        };
        chatBox.onfocus = function() {
            isTyping = 1;
            resetMobileJoystick();
            drawChat();
        };
        mainCanvas.onmousemove = function(event) {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        };
        setInterval(() => { // Send mouse update
            let inputX = resolveInputPointerX(),
                inputY = resolveInputPointerY();
            sendMouseMove((inputX - mainCanvas.width / 2) / camera.z + camera.x, (inputY - mainCanvas.height / 2) / camera.z + camera.y);
        }, 60);
        wHandle.onresize = function() {
            let cW = mainCanvas.width = wHandle.innerWidth,
                cH = mainCanvas.height = wHandle.innerHeight;
            camera.viewMult = Math.sqrt(Math.min(cH / 1080, cW / 1920));
            updateMobileClientMode();
            updateMobileJoystickVisual();
        };
        wHandle.onresize();
        log.info(`Init completed in ${Date.now() - DATE}ms`);
        gameReset();
        showOverlay();
        let serverField = document.getElementById("gamemode");
        if (serverField && typeof serverField.value === "string" && serverField.value.trim()) WS_URL = serverField.value.trim();
        if (settings.allowGETipSet && wHandle.location.search) {
            let div = /ip=([\w\W]+):([0-9]+)/.exec(wHandle.location.search.slice(1));
            if (div) {
                WS_URL = `${div[1]}:${div[2]}`;
                if (serverField) serverField.value = WS_URL;
            }
        }
        window.requestAnimationFrame(drawGame);
    }
    wHandle.setServer = function(arg) {
        if (WS_URL === arg) return;
        WS_URL = arg;
        if (!overlayShown && ws) wsInit(arg);
    };
    wHandle.setSkins = function(arg) {
        settings.showSkins = arg;
    };
    wHandle.setNames = function(arg) {
        settings.showNames = arg;
        drawLeaderboard();
    };
    wHandle.noxToggleArenaLeaderboard = function() {
        leaderboard.collapsed = !leaderboard.collapsed;
        syncArenaLeaderboardUI();
    };
    wHandle.noxPerformArenaExit = function() {
        if (!arenaSession.mode && !ws) return showOverlay();
        leaveArena("exit");
    };
    wHandle.noxExitArena = function(force) {
        if (!force) {
            if (typeof wHandle.noxOpenArenaExitPrompt === "function") return wHandle.noxOpenArenaExitPrompt();
            return wHandle.noxPerformArenaExit();
        }
        wHandle.noxPerformArenaExit();
    };
    wHandle.noxReturnToLobby = function() {
        showOverlay();
    };
    wHandle.setColors = function(arg) {
        settings.showColor = !arg;
    };
    wHandle.setChatHide = function(arg) {
        wHandle.noxSetChatHidden(arg);
    };
    wHandle.setMinimap = function(arg) {
        settings.showMinimap = !arg;
    };
    wHandle.setGrid = function(arg) {
        settings.hideGrid = arg;
    };
    wHandle.setFood = function(arg) {
        settings.hideFood = arg;
    };
    wHandle.setStats = function(arg) {
        settings.hideStats = arg;
    };
    wHandle.setShowMass = function(arg) {
        settings.showMass = arg;
    };
    wHandle.setDarkTheme = function(arg) {
        settings.darkTheme = arg;
        drawStats();
    };
    wHandle.setCellBorder = function(arg) {
        settings.cellBorders = arg;
    };
    wHandle.setJelly = function(arg) {
        settings.jellyPhysics = arg;
    };
    wHandle.setTextOutline = function(arg) {
        settings.showTextOutline = arg;
    };
    wHandle.setZoom = function(arg) {
        settings.infiniteZoom = arg;
    };
    wHandle.setTransparency = function(arg) {
        settings.transparency = arg;
    };
    wHandle.setMapBorders = function(arg) {
        settings.mapBorders = arg;
    };
    wHandle.setSectors = function(arg) {
        settings.sectors = arg;
    };
    wHandle.setCellPos = function(arg) {
        settings.showPos = arg;
    };
    wHandle.spectate = function() {
        queueArenaAction({
            type: "spectate"
        });
    };
    wHandle.openSkinsList = function() {
        if (wjQuery("#inPageModalTitle").text() === "Skins") return;
        wjQuery.get("include/gallery.php").then(function(data) {
            wjQuery("#inPageModalTitle").text("Skins");
            wjQuery("#inPageModalBody").html(data);
        });
    };
    wHandle.play = function(arg) {
        if (typeof wHandle.noxEnterFullscreenSilently === "function") wHandle.noxEnterFullscreenSilently();
        queueArenaAction({
            type: "play",
            name: arg
        });
    };
    wHandle.onload = init;
})(window, window.jQuery);
