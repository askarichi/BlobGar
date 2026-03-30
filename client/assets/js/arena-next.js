(function(wHandle) {
    "use strict";
    let NOX_ARENA_NEXT = {
        initStarted: false,
        ready: false,
        failed: false,
        arenaActive: false,
        app: null,
        host: null,
        root: null,
        bgSprite: null,
        gridGraphics: null,
        worldRoot: null,
        borderGraphics: null,
        lastWidth: 0,
        lastHeight: 0,
        lastThemeKey: "",
        step: 50,
        _initPromise: null,
        init(options) {
            if (this.failed) return Promise.resolve(false);
            if (this.ready) return Promise.resolve(true);
            if (this._initPromise) return this._initPromise;
            this.initStarted = true;
            let settings = options || {};
            this._initPromise = this.boot(settings);
            return this._initPromise;
        },
        async boot(options) {
            if (!wHandle.PIXI) {
                this.failed = true;
                console.warn("NOX Arena Next could not start because PIXI is unavailable.");
                return false;
            }
            try {
                let host = document.getElementById(options.hostId || "nox-arena-stage"),
                    beforeNode = document.getElementById(options.beforeId || "canvas"),
                    app = new wHandle.PIXI.Application();
                if (typeof app.init === "function") await app.init({
                    backgroundAlpha: 0,
                    antialias: true,
                    autoDensity: true,
                    resolution: this.getResolution(),
                    preference: "webgl",
                    powerPreference: "high-performance"
                });
                this.app = app;
                this.host = host || document.body;
                this.root = document.createElement("div");
                this.root.id = "nox-arena-next-root";
                this.root.setAttribute("aria-hidden", "true");
                let view = app.canvas || app.view;
                this.root.appendChild(view);
                if (beforeNode && beforeNode.parentNode === this.host) this.host.insertBefore(this.root, beforeNode);
                else this.host.appendChild(this.root);
                this.bgSprite = new wHandle.PIXI.Sprite(wHandle.PIXI.Texture.WHITE);
                this.bgSprite.position.set(0, 0);
                this.gridGraphics = new wHandle.PIXI.Graphics();
                this.worldRoot = new wHandle.PIXI.Container();
                this.borderGraphics = new wHandle.PIXI.Graphics();
                this.worldRoot.addChild(this.borderGraphics);
                app.stage.addChild(this.bgSprite);
                app.stage.addChild(this.gridGraphics);
                app.stage.addChild(this.worldRoot);
                this.ready = true;
                this.setArenaActive(false);
                return true;
            } catch (error) {
                this.failed = true;
                console.warn("NOX Arena Next failed to boot.", error);
                return false;
            }
        },
        getResolution() {
            let dpr = Math.max(1, Number(wHandle.devicePixelRatio) || 1),
                mobileLike = false;
            try {
                mobileLike = !!(wHandle.matchMedia && (wHandle.matchMedia("(pointer: coarse)").matches || wHandle.matchMedia("(hover: none)").matches));
            } catch (error) {
                mobileLike = false;
            }
            return mobileLike ? 1 : Math.min(2, dpr);
        },
        shouldUse() {
            return !!(this.ready && !this.failed);
        },
        setArenaActive(active) {
            this.arenaActive = !!active;
            if (!this.root) return;
            this.root.style.display = this.arenaActive ? "block" : "none";
        },
        resize(width, height, state) {
            if (!this.ready || !this.app) return;
            this.lastWidth = Math.max(1, Math.round(width || 1));
            this.lastHeight = Math.max(1, Math.round(height || 1));
            if (this.app.renderer && typeof this.app.renderer.resize === "function") this.app.renderer.resize(this.lastWidth, this.lastHeight);
            if (this.bgSprite) {
                this.bgSprite.width = this.lastWidth;
                this.bgSprite.height = this.lastHeight;
            }
            this.rebuildGrid(state);
        },
        rebuildGrid(state) {
            if (!this.ready || !this.gridGraphics) return;
            let darkTheme = !!(state && state.darkTheme),
                themeKey = `${darkTheme}:${this.lastWidth}:${this.lastHeight}`;
            if (themeKey === this.lastThemeKey) return;
            this.lastThemeKey = themeKey;
            let step = this.step,
                width = this.lastWidth + step * 2,
                height = this.lastHeight + step * 2,
                color = darkTheme ? 0x313746 : 0x000000,
                alpha = darkTheme ? 0.42 : 0.12,
                graphics = this.gridGraphics;
            graphics.clear();
            graphics.lineStyle(1, color, alpha);
            for (let x = 0; x <= width; x += step) {
                graphics.moveTo(x + .5, 0);
                graphics.lineTo(x + .5, height);
            }
            for (let y = 0; y <= height; y += step) {
                graphics.moveTo(0, y + .5);
                graphics.lineTo(width, y + .5);
            }
        },
        render(state) {
            if (!state) return false;
            if (!this.ready) {
                this.init(state.initOptions || {});
                return false;
            }
            this.setArenaActive(!!state.arenaActive);
            if (!state.arenaActive) return false;
            if (state.width !== this.lastWidth || state.height !== this.lastHeight || `${!!state.darkTheme}:${state.width}:${state.height}` !== this.lastThemeKey) this.resize(state.width, state.height, state);
            if (this.bgSprite) this.bgSprite.tint = state.darkTheme ? 0x000000 : 0xF2FBFF;
            let startLeft = state.startLeft,
                startTop = state.startTop,
                step = this.step;
            if (this.gridGraphics) {
                this.gridGraphics.visible = !state.hideGrid;
                this.gridGraphics.position.set(startLeft - step, startTop - step);
            }
            if (this.worldRoot) {
                this.worldRoot.scale.set(state.cameraZ, state.cameraZ);
                this.worldRoot.position.set(state.width / 2 - state.cameraX * state.cameraZ, state.height / 2 - state.cameraY * state.cameraZ);
            }
            this.renderBorders(state);
            return true;
        },
        renderBorders(state) {
            if (!this.borderGraphics) return;
            let graphics = this.borderGraphics,
                border = state.border || {},
                pulse = 0.5 + 0.5 * Math.sin(state.now / 260),
                radius = Math.max(0, (border.radius || 0) - 10),
                markerRadius = 12 / Math.max(state.cameraZ, .001),
                markerCross = 7 / Math.max(state.cameraZ, .001),
                glowRadius = 60 / Math.max(state.cameraZ, .001),
                centerX = border.centerX || 0,
                centerY = border.centerY || 0;
            graphics.clear();
            if (!state.connected) return;
            if (!state.hideGrid) {
                graphics.lineStyle(1.45 / Math.max(state.cameraZ, .001), state.darkTheme ? 0xA57942 : 0x4B3A20, state.darkTheme ? 0.72 : 0.24);
                graphics.moveTo(centerX, centerY - state.viewHeight / 2);
                graphics.lineTo(centerX, centerY + state.viewHeight / 2);
                graphics.moveTo(centerX - state.viewWidth / 2, centerY);
                graphics.lineTo(centerX + state.viewWidth / 2, centerY);
            }
            if (state.mapBorders && radius > 0) {
                graphics.lineStyle((26 + pulse * 3) / Math.max(state.cameraZ, .001), 0xb91c1c, 0.42);
                graphics.drawCircle(centerX, centerY, radius);
                graphics.lineStyle(11 / Math.max(state.cameraZ, .001), 0xff6a00, 0.78);
                graphics.drawCircle(centerX, centerY, radius);
                graphics.lineStyle(5 / Math.max(state.cameraZ, .001), 0xff9240, 0.9);
                graphics.drawCircle(centerX, centerY, radius);
                graphics.lineStyle(2.5 / Math.max(state.cameraZ, .001), 0xffe0ad, 0.72);
                graphics.drawCircle(centerX, centerY, radius - 1.5);
            }
            if (!state.hideGrid) {
                graphics.beginFill(state.darkTheme ? 0xffbc5c : 0x5a4628, state.darkTheme ? 0.18 : 0.08);
                graphics.drawCircle(centerX, centerY, glowRadius);
                graphics.endFill();
                graphics.lineStyle(1.2 / Math.max(state.cameraZ, .001), state.darkTheme ? 0xffdfb6 : 0x5c4824, state.darkTheme ? 0.64 : 0.24);
                graphics.moveTo(centerX - markerCross, centerY);
                graphics.lineTo(centerX + markerCross, centerY);
                graphics.moveTo(centerX, centerY - markerCross);
                graphics.lineTo(centerX, centerY + markerCross);
                graphics.beginFill(state.darkTheme ? 0xffdaa4 : 0x5c4824, state.darkTheme ? 0.90 : 0.42);
                graphics.drawCircle(centerX, centerY, markerRadius * .2);
                graphics.endFill();
            }
        }
    };
    wHandle.NoxArenaNextBackground = NOX_ARENA_NEXT;
})(window);
