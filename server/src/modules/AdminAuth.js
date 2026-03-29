"use strict";
const crypto = require("crypto");

class AdminAuth {
    constructor(gameServer) {
        this.gameServer = gameServer;
        this.cookieName = "nox_admin_sid";
        this.sessionTtlMs = 8 * 60 * 60 * 1000;
        this.sessions = new Map();
        this.loginRate = new Map();
        this.actionRate = new Map();
    }
    getIp(req) {
        return ((req.headers["x-forwarded-for"] || "") + "").split(",")[0].trim() || (req.socket && req.socket.remoteAddress) || "0.0.0.0";
    }
    uaHash(req) {
        return crypto.createHash("sha256").update(String(req.headers["user-agent"] || "")).digest("hex");
    }
    parseCookies(req) {
        let source = String(req.headers.cookie || ""),
            result = {};
        if (!source) return result;
        source.split(";").forEach(part => {
            let index = part.indexOf("=");
            if (index === -1) return;
            let key = part.slice(0, index).trim(),
                value = part.slice(index + 1).trim();
            result[key] = decodeURIComponent(value);
        });
        return result;
    }
    isTrustedOrigin(origin) {
        let safeOrigin = String(origin || "").trim();
        if (!safeOrigin) return false;
        if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(safeOrigin)) return true;
        if (this.gameServer && this.gameServer.config && this.gameServer.config.clientBind && this.gameServer.config.clientBind.length) {
            let trusted = Array.isArray(this.gameServer.clientBind) ? this.gameServer.clientBind.filter(Boolean) : [];
            if (trusted.length) return trusted.indexOf(safeOrigin) >= 0;
        }
        return false;
    }
    checkRateBucket(map, key, limit, windowMs) {
        let now = Date.now(),
            bucket = map.get(key) || [];
        bucket = bucket.filter(stamp => now - stamp < windowMs);
        if (bucket.length >= limit) {
            map.set(key, bucket);
            return false;
        }
        bucket.push(now);
        map.set(key, bucket);
        return true;
    }
    pruneSessions() {
        let now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (!session || session.expiresAt <= now) this.sessions.delete(sessionId);
        }
    }
    setSessionCookie(res, value, maxAgeMs) {
        let cookie = this.cookieName + "=" + encodeURIComponent(value) + "; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=" + Math.max(0, Math.floor((maxAgeMs || 0) / 1000));
        res.setHeader("Set-Cookie", cookie);
    }
    clearSessionCookie(res) {
        res.setHeader("Set-Cookie", this.cookieName + "=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0");
    }
    getSession(req) {
        this.pruneSessions();
        let cookies = this.parseCookies(req),
            id = cookies[this.cookieName];
        if (!id) return null;
        let session = this.sessions.get(id);
        if (!session) return null;
        if (session.ip !== this.getIp(req)) return null;
        if (session.uaHash !== this.uaHash(req)) return null;
        if (session.expiresAt <= Date.now()) {
            this.sessions.delete(id);
            return null;
        }
        session.expiresAt = Date.now() + this.sessionTtlMs;
        return Object.assign({
            id: id
        }, session);
    }
    createSession(user, req) {
        let id = crypto.randomBytes(24).toString("hex"),
            csrfToken = crypto.randomBytes(24).toString("hex"),
            session = {
                username: user.username,
                role: user.role || "admin",
                csrfToken: csrfToken,
                ip: this.getIp(req),
                uaHash: this.uaHash(req),
                createdAt: Date.now(),
                expiresAt: Date.now() + this.sessionTtlMs
            };
        this.sessions.set(id, session);
        return Object.assign({
            id: id
        }, session);
    }
    login(req, res, username, password) {
        let ip = this.getIp(req);
        if (!this.checkRateBucket(this.loginRate, ip, 8, 10 * 60 * 1000)) return {
            ok: false,
            status: 429,
            error: "Too many login attempts. Try again later."
        };
        let user = this.gameServer.adminStore.authenticateAdmin(username, password);
        if (!user) return {
            ok: false,
            status: 401,
            error: "Invalid admin credentials."
        };
        let session = this.createSession(user, req);
        this.setSessionCookie(res, session.id, this.sessionTtlMs);
        this.gameServer.adminStore.clearBootstrapFile();
        this.gameServer.adminStore.appendAudit({
            actor: user.username,
            action: "admin.login",
            targetType: "session",
            target: "admin-panel",
            ip: ip
        });
        return {
            ok: true,
            session: session
        };
    }
    logout(req, res) {
        let session = this.getSession(req);
        if (session) {
            this.sessions.delete(session.id);
            this.gameServer.adminStore.appendAudit({
                actor: session.username,
                action: "admin.logout",
                targetType: "session",
                target: "admin-panel",
                ip: this.getIp(req)
            });
        }
        this.clearSessionCookie(res);
        return {
            ok: true
        };
    }
    requireAdmin(req, csrfRequired) {
        let session = this.getSession(req);
        if (!session) return {
            ok: false,
            status: 401,
            error: "Admin authentication required."
        };
        if (csrfRequired) {
            let headerToken = String(req.headers["x-nox-csrf"] || "");
            if (!headerToken || headerToken !== session.csrfToken) return {
                ok: false,
                status: 403,
                error: "Admin CSRF validation failed."
            };
            let ip = this.getIp(req);
            if (!this.checkRateBucket(this.actionRate, ip, 90, 60 * 1000)) return {
                ok: false,
                status: 429,
                error: "Too many admin actions. Slow down a little."
            };
        }
        return {
            ok: true,
            session: session
        };
    }
}

module.exports = AdminAuth;
