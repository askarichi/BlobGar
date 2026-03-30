"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

class PlayerAuth {
    constructor(gameServer, secretFilePath) {
        this.gameServer = gameServer;
        this.secretFilePath = secretFilePath;
        this.cookieName = "nox_player_auth";
        this.sessionTtlMs = 30 * 24 * 60 * 60 * 1000;
        this.telegramInitDataTtlSeconds = 24 * 60 * 60;
        this.authRate = new Map();
        this.secret = this.loadOrCreateSecret();
    }
    ensureDirectory() {
        fs.mkdirSync(path.dirname(this.secretFilePath), {
            recursive: true
        });
    }
    loadOrCreateSecret() {
        this.ensureDirectory();
        if (fs.existsSync(this.secretFilePath)) {
            let existing = String(fs.readFileSync(this.secretFilePath, "utf8") || "").trim();
            if (existing) return existing;
        }
        let secret = crypto.randomBytes(48).toString("hex");
        fs.writeFileSync(this.secretFilePath, secret, "utf8");
        return secret;
    }
    base64urlEncode(value) {
        return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }
    base64urlDecode(value) {
        let safe = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
        while (safe.length % 4) safe += "=";
        return Buffer.from(safe, "base64").toString("utf8");
    }
    sign(value) {
        return crypto.createHmac("sha256", this.secret).update(String(value || ""), "utf8").digest("hex");
    }
    sanitizeDisplayName(name) {
        let safe = String(name || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
        if (safe.length > this.gameServer.config.playerMaxNick) safe = safe.slice(0, this.gameServer.config.playerMaxNick);
        if (this.gameServer.config.filterBadWords && safe && this.gameServer.checkBadWord(safe)) safe = "";
        return safe || "Pilot-07";
    }
    normalizeAccountKey(accountKey) {
        return String(accountKey || "").trim().toLowerCase();
    }
    normalizeTelegramUsername(username) {
        return String(username || "").trim().replace(/^@+/, "").replace(/[^\w]/g, "").slice(0, 32);
    }
    parseCookies(source) {
        let cookieString = "";
        if (source && typeof source === "object" && source.headers) cookieString = String(source.headers.cookie || "");
        else cookieString = String(source || "");
        let result = {};
        if (!cookieString) return result;
        cookieString.split(";").forEach(part => {
            let index = part.indexOf("=");
            if (index < 0) return;
            let key = part.slice(0, index).trim(),
                value = part.slice(index + 1).trim();
            result[key] = decodeURIComponent(value);
        });
        return result;
    }
    buildCookiePayload(session) {
        let now = Date.now();
        return {
            v: 1,
            sid: session.sid || crypto.randomBytes(18).toString("hex"),
            accountKey: this.normalizeAccountKey(session.accountKey),
            displayName: this.sanitizeDisplayName(session.displayName),
            provider: session.provider || "guest",
            nameLocked: !!session.nameLocked,
            telegramUserId: session.telegramUserId || null,
            telegramUsername: this.normalizeTelegramUsername(session.telegramUsername || ""),
            csrfToken: session.csrfToken || crypto.randomBytes(24).toString("hex"),
            createdAt: session.createdAt || now,
            expiresAt: session.expiresAt || now + this.sessionTtlMs
        };
    }
    encodeSession(session) {
        let payload = this.buildCookiePayload(session),
            encoded = this.base64urlEncode(JSON.stringify(payload)),
            signature = this.sign(encoded);
        return encoded + "." + signature;
    }
    decodeSession(raw) {
        let token = String(raw || "").trim();
        if (!token) return null;
        let parts = token.split(".");
        if (parts.length !== 2) return null;
        let encoded = parts[0],
            signature = parts[1],
            expected = this.sign(encoded);
        if (signature.length !== expected.length) return null;
        if (!crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"))) return null;
        try {
            let payload = JSON.parse(this.base64urlDecode(encoded));
            if (!payload || payload.v !== 1 || !payload.accountKey || !payload.expiresAt) return null;
            if (payload.expiresAt <= Date.now()) return null;
            payload.accountKey = this.normalizeAccountKey(payload.accountKey);
            payload.displayName = this.sanitizeDisplayName(payload.displayName);
            payload.provider = payload.provider || "guest";
            payload.nameLocked = !!payload.nameLocked;
            payload.telegramUsername = this.normalizeTelegramUsername(payload.telegramUsername || "");
            payload.csrfToken = payload.csrfToken || "";
            return payload;
        } catch (error) {
            return null;
        }
    }
    shouldUseSecureCookies(req) {
        return !!((req.socket && req.socket.encrypted) || String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https");
    }
    writeSessionCookie(res, session, req) {
        let cookie = this.cookieName + "=" + encodeURIComponent(this.encodeSession(session)) +
            "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + Math.max(0, Math.floor(this.sessionTtlMs / 1000));
        if (this.shouldUseSecureCookies(req)) cookie += "; Secure";
        res.setHeader("Set-Cookie", cookie);
    }
    clearSessionCookie(res, req) {
        let cookie = this.cookieName + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
        if (this.shouldUseSecureCookies(req)) cookie += "; Secure";
        res.setHeader("Set-Cookie", cookie);
    }
    publicSession(session) {
        if (!session) return {
            authenticated: false
        };
        return {
            authenticated: true,
            accountKey: session.accountKey,
            displayName: session.displayName,
            provider: session.provider,
            nameLocked: !!session.nameLocked,
            csrfToken: session.csrfToken,
            telegramUserId: session.telegramUserId || null,
            telegramUsername: session.telegramUsername || ""
        };
    }
    getSession(req) {
        let cookies = this.parseCookies(req),
            raw = cookies[this.cookieName];
        return this.decodeSession(raw);
    }
    getSessionFromHeaders(headers) {
        return this.decodeSession(this.parseCookies({
            headers: headers || {}
        })[this.cookieName]);
    }
    getTrustedLocalHosts() {
        let hosts = new Set(["127.0.0.1", "localhost"]);
        let interfaces = os.networkInterfaces();
        Object.keys(interfaces).forEach(name => {
            (interfaces[name] || []).forEach(entry => {
                if (!entry || entry.internal || entry.family !== "IPv4" || !entry.address) return;
                hosts.add(String(entry.address).trim().toLowerCase());
            });
        });
        return hosts;
    }
    isTrustedOrigin(origin) {
        let safeOrigin = String(origin || "").trim();
        if (!safeOrigin) return false;
        try {
            let parsed = new URL(safeOrigin),
                hostname = String(parsed.hostname || "").trim().toLowerCase();
            if (this.getTrustedLocalHosts().has(hostname)) return true;
        } catch (error) {}
        if (this.gameServer.config.clientBind && this.gameServer.config.clientBind.length) {
            let trusted = Array.isArray(this.gameServer.clientBind) ? this.gameServer.clientBind.filter(Boolean) : [];
            if (trusted.length) return trusted.indexOf(safeOrigin) >= 0;
        }
        return false;
    }
    isTrustedRequest(req) {
        let origin = String(req.headers.origin || "").trim();
        if (!origin) return true;
        return this.isTrustedOrigin(origin);
    }
    checkRateLimit(key, limit, windowMs) {
        let now = Date.now(),
            bucket = this.authRate.get(key) || [];
        bucket = bucket.filter(stamp => now - stamp < windowMs);
        if (bucket.length >= limit) {
            this.authRate.set(key, bucket);
            return false;
        }
        bucket.push(now);
        this.authRate.set(key, bucket);
        return true;
    }
    updateGuestSession(req, res, currentSession, preferredName) {
        let updated = this.buildCookiePayload({
            sid: currentSession.sid,
            accountKey: currentSession.accountKey,
            displayName: preferredName || currentSession.displayName,
            provider: "guest",
            nameLocked: false,
            telegramUserId: null,
            telegramUsername: "",
            csrfToken: currentSession.csrfToken,
            createdAt: currentSession.createdAt,
            expiresAt: Date.now() + this.sessionTtlMs
        });
        this.writeSessionCookie(res, updated, req);
        return updated;
    }
    createGuestSession(req, res, preferredName) {
        let current = this.getSession(req);
        if (current && current.provider === "guest") return this.publicSession(this.updateGuestSession(req, res, current, preferredName));
        if (current) return this.publicSession(current);
        let session = this.buildCookiePayload({
            accountKey: "guest:" + crypto.randomBytes(12).toString("hex"),
            displayName: preferredName,
            provider: "guest",
            nameLocked: false
        });
        this.writeSessionCookie(res, session, req);
        return this.publicSession(session);
    }
    updateDisplayName(req, res, session, preferredName) {
        if (!session || session.nameLocked) return session;
        let safeName = this.sanitizeDisplayName(preferredName);
        if (!safeName || safeName === session.displayName) return session;
        return this.updateGuestSession(req, res, session, safeName);
    }
    getTelegramBotToken() {
        return String(process.env.NOX_TELEGRAM_BOT_TOKEN || "").trim();
    }
    buildTelegramSecretKey(botToken) {
        return crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    }
    parseTelegramInitData(initDataRaw) {
        let params = new URLSearchParams(String(initDataRaw || ""));
        let hash = params.get("hash") || "";
        if (!hash) return null;
        params.delete("hash");
        let pairs = [];
        params.forEach((value, key) => {
            pairs.push([key, value]);
        });
        pairs.sort((left, right) => String(left[0]).localeCompare(String(right[0])));
        return {
            hash: hash,
            params: params,
            dataCheckString: pairs.map(item => item[0] + "=" + item[1]).join("\n")
        };
    }
    fallbackTelegramDisplayName(user) {
        let username = this.sanitizeDisplayName(user && user.username ? user.username : "");
        if (username && username !== "Pilot-07") return username;
        let composed = this.sanitizeDisplayName([user && user.first_name || "", user && user.last_name || ""].join(" ").trim());
        if (composed && composed !== "Pilot-07") return composed;
        return this.sanitizeDisplayName("Telegram-" + String(user && user.id || "").slice(-6));
    }
    verifyTelegramInitData(initDataRaw) {
        let botToken = this.getTelegramBotToken();
        if (!botToken) return {
            ok: false,
            status: 503,
            error: "Telegram Mini App auth is not configured on the server yet."
        };
        let parsed = this.parseTelegramInitData(initDataRaw);
        if (!parsed || !parsed.dataCheckString) return {
            ok: false,
            status: 400,
            error: "Telegram init data is missing or invalid."
        };
        let expectedHash = crypto.createHmac("sha256", this.buildTelegramSecretKey(botToken)).update(parsed.dataCheckString).digest("hex");
        if (expectedHash.length !== parsed.hash.length || !crypto.timingSafeEqual(Buffer.from(expectedHash, "utf8"), Buffer.from(parsed.hash, "utf8"))) return {
            ok: false,
            status: 401,
            error: "Telegram auth signature validation failed."
        };
        let authDate = Number(parsed.params.get("auth_date") || 0);
        if (!isFinite(authDate) || authDate <= 0) return {
            ok: false,
            status: 400,
            error: "Telegram auth date is invalid."
        };
        if (Math.abs(Math.floor(Date.now() / 1000) - authDate) > this.telegramInitDataTtlSeconds) return {
            ok: false,
            status: 401,
            error: "Telegram auth data expired. Please reopen the Mini App."
        };
        let user = null;
        try {
            user = JSON.parse(parsed.params.get("user") || "{}");
        } catch (error) {
            user = null;
        }
        if (!user || !user.id) return {
            ok: false,
            status: 400,
            error: "Telegram user data is missing."
        };
        return {
            ok: true,
            user: user
        };
    }
    createTelegramSession(req, res, initDataRaw) {
        let ip = ((req.headers["x-forwarded-for"] || "") + "").split(",")[0].trim() || (req.socket && req.socket.remoteAddress) || "0.0.0.0";
        if (!this.checkRateLimit("tg:" + ip, 20, 10 * 60 * 1000)) return {
            ok: false,
            status: 429,
            error: "Too many Telegram auth attempts. Please wait a little."
        };
        let verified = this.verifyTelegramInitData(initDataRaw);
        if (!verified.ok) return verified;
        let user = verified.user,
            session = this.buildCookiePayload({
                accountKey: "telegram:" + String(user.id),
                displayName: this.fallbackTelegramDisplayName(user),
                provider: "telegram",
                nameLocked: true,
                telegramUserId: String(user.id),
                telegramUsername: this.normalizeTelegramUsername(user && user.username || "")
            });
        this.writeSessionCookie(res, session, req);
        return {
            ok: true,
            session: this.publicSession(session)
        };
    }
    requireSession(req, csrfRequired) {
        let session = this.getSession(req);
        if (!session) return {
            ok: false,
            status: 401,
            error: "Player authentication required."
        };
        if (csrfRequired) {
            let token = String(req.headers["x-nox-player-csrf"] || "");
            if (!token || token !== session.csrfToken) return {
                ok: false,
                status: 403,
                error: "Player CSRF validation failed."
            };
        }
        return {
            ok: true,
            session: session
        };
    }
    toProfileIdentity(session, overrideName) {
        return {
            accountKey: session && session.accountKey ? session.accountKey : "",
            name: overrideName || (session && session.displayName) || "Pilot-07",
            authProvider: session && session.provider ? session.provider : "guest",
            nameLocked: !!(session && session.nameLocked),
            telegramUserId: session && session.telegramUserId ? String(session.telegramUserId) : null,
            telegramUsername: session && session.telegramUsername ? String(session.telegramUsername) : ""
        };
    }
}

module.exports = PlayerAuth;
