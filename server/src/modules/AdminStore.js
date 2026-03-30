"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Log = require("./Logger");

class AdminStore {
    constructor(filePath) {
        this.filePath = filePath;
        this.bootstrapFilePath = path.join(path.dirname(filePath), "admin-bootstrap.txt");
        this.data = this.createEmptyStore();
        this.load();
        this.ensureBootstrapAdmin();
    }
    createEmptyStore() {
        return {
            version: 1,
            updatedAt: null,
            admins: [],
            featureFlags: {
                maintenanceMode: false,
                economyEnabled: true,
                supportEnabled: true,
                rankingEnabled: true,
                jellyPhysicsEnabled: true
            },
            liveOpsSettings: {
                botTarget: null,
                mapSpikes: null,
                foodTarget: null,
                foodSpawnAmount: null,
                playerCap: null
            },
            moderation: {},
            auditLogs: [],
            dailyMetrics: {}
        };
    }
    ensureDirectory() {
        fs.mkdirSync(path.dirname(this.filePath), {
            recursive: true
        });
    }
    load() {
        this.ensureDirectory();
        if (!fs.existsSync(this.filePath)) return this.save();
        try {
            let raw = fs.readFileSync(this.filePath, "utf8"),
                parsed = JSON.parse(raw || "{}");
            this.data = Object.assign(this.createEmptyStore(), parsed || {});
            this.data.admins = Array.isArray(this.data.admins) ? this.data.admins : [];
            this.data.moderation = this.data.moderation || {};
            this.data.auditLogs = Array.isArray(this.data.auditLogs) ? this.data.auditLogs : [];
            this.data.dailyMetrics = this.data.dailyMetrics || {};
            this.data.featureFlags = Object.assign(this.createEmptyStore().featureFlags, this.data.featureFlags || {});
            this.data.liveOpsSettings = Object.assign(this.createEmptyStore().liveOpsSettings, this.data.liveOpsSettings || {});
        } catch (error) {
            Log.error("AdminStore: Failed to load admin state - " + error.message);
            this.data = this.createEmptyStore();
            this.save();
        }
    }
    save() {
        try {
            this.ensureDirectory();
            this.data.updatedAt = new Date().toISOString();
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
        } catch (error) {
            Log.error("AdminStore: Failed to save admin state - " + error.message);
        }
    }
    sanitizeAdminUsername(value) {
        return ((value || "").trim() || "noxadmin").slice(0, 60).toLowerCase();
    }
    sanitizePlayerName(value) {
        return ((value || "").trim() || "Pilot-07").slice(0, 30);
    }
    normalizePlayerKey(value) {
        return this.sanitizePlayerName(value).toLowerCase();
    }
    randomSecret(length) {
        return crypto.randomBytes(Math.max(16, length || 18)).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, Math.max(16, length || 18));
    }
    hashPassword(password, saltHex) {
        let salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16),
            iterations = 120000,
            derived = crypto.pbkdf2Sync(String(password || ""), salt, iterations, 32, "sha256");
        return {
            algorithm: "pbkdf2-sha256",
            iterations: iterations,
            salt: salt.toString("hex"),
            hash: derived.toString("hex")
        };
    }
    verifyPassword(record, password) {
        try {
            if (!record || !record.salt || !record.hash || !record.iterations) return false;
            let derived = crypto.pbkdf2Sync(String(password || ""), Buffer.from(record.salt, "hex"), record.iterations, 32, "sha256"),
                expected = Buffer.from(record.hash, "hex");
            return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
        } catch (error) {
            return false;
        }
    }
    ensureBootstrapAdmin() {
        if (this.data.admins.length) return null;
        let username = "noxadmin",
            password = this.randomSecret(20),
            passwordRecord = this.hashPassword(password),
            createdAt = new Date().toISOString();
        this.data.admins.push({
            username: username,
            role: "admin",
            active: true,
            createdAt: createdAt,
            password: passwordRecord
        });
        this.save();
        let bootstrapText = [
            "NOX Admin Bootstrap Credentials",
            "Created: " + createdAt,
            "Username: " + username,
            "Password: " + password,
            "Login URL: http://127.0.0.1:15003/admin/login",
            "Delete this file after the first successful admin login."
        ].join("\n");
        fs.writeFileSync(this.bootstrapFilePath, bootstrapText, "utf8");
        Log.warn("AdminStore: Bootstrap admin created. Credentials saved to " + this.bootstrapFilePath);
        return {
            username: username,
            password: password
        };
    }
    clearBootstrapFile() {
        try {
            if (fs.existsSync(this.bootstrapFilePath)) fs.unlinkSync(this.bootstrapFilePath);
        } catch (error) {
        }
    }
    authenticateAdmin(username, password) {
        let safeUser = this.sanitizeAdminUsername(username),
            admin = this.data.admins.find(item => item && item.active !== false && this.sanitizeAdminUsername(item.username) === safeUser);
        if (!admin) return null;
        if (!this.verifyPassword(admin.password, password)) return null;
        return {
            username: admin.username,
            role: admin.role || "admin"
        };
    }
    appendAudit(entry) {
        this.data.auditLogs.unshift({
            id: "AUD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
            createdAt: new Date().toISOString(),
            actor: (entry.actor || "system").slice(0, 80),
            action: (entry.action || "unknown").slice(0, 80),
            targetType: (entry.targetType || "system").slice(0, 80),
            target: (entry.target || "-").slice(0, 120),
            ip: (entry.ip || "").slice(0, 80),
            before: entry.before || null,
            after: entry.after || null
        });
        this.data.auditLogs = this.data.auditLogs.slice(0, 500);
        this.save();
    }
    listAudit(limit) {
        return this.data.auditLogs.slice(0, Math.max(1, Math.min(500, limit || 100)));
    }
    getModerationEntry(name, create) {
        let key = this.normalizePlayerKey(name);
        if (!key) return null;
        if (!this.data.moderation[key] && create) {
            this.data.moderation[key] = {
                name: this.sanitizePlayerName(name),
                banned: false,
                mutedUntil: null,
                notes: [],
                updatedAt: null
            };
        }
        return this.data.moderation[key] || null;
    }
    getPlayerModeration(name) {
        let entry = this.getModerationEntry(name, false);
        return Object.assign({
            banned: false,
            mutedUntil: null,
            notes: []
        }, entry || {});
    }
    isPlayerBanned(name) {
        let entry = this.getModerationEntry(name, false);
        return !!(entry && entry.banned);
    }
    isPlayerMuted(name) {
        let entry = this.getModerationEntry(name, false);
        if (!entry || !entry.mutedUntil) return false;
        if (entry.mutedUntil === "forever") return true;
        return Date.now() < new Date(entry.mutedUntil).getTime();
    }
    setPlayerBan(name, banned, actor, ip) {
        let entry = this.getModerationEntry(name, true),
            before = Object.assign({}, entry);
        entry.name = this.sanitizePlayerName(name);
        entry.banned = !!banned;
        entry.updatedAt = new Date().toISOString();
        this.appendAudit({
            actor: actor,
            action: entry.banned ? "player.ban" : "player.unban",
            targetType: "player",
            target: entry.name,
            before: before,
            after: entry,
            ip: ip
        });
        this.save();
        return Object.assign({}, entry);
    }
    setPlayerMute(name, minutes, actor, ip) {
        let entry = this.getModerationEntry(name, true),
            before = Object.assign({}, entry),
            muteMinutes = Math.max(1, Math.min(43200, Math.round(minutes || 0)));
        entry.name = this.sanitizePlayerName(name);
        entry.mutedUntil = new Date(Date.now() + muteMinutes * 60000).toISOString();
        entry.updatedAt = new Date().toISOString();
        this.appendAudit({
            actor: actor,
            action: "player.mute",
            targetType: "player",
            target: entry.name,
            before: before,
            after: entry,
            ip: ip
        });
        this.save();
        return Object.assign({}, entry);
    }
    clearPlayerMute(name, actor, ip) {
        let entry = this.getModerationEntry(name, true),
            before = Object.assign({}, entry);
        entry.name = this.sanitizePlayerName(name);
        entry.mutedUntil = null;
        entry.updatedAt = new Date().toISOString();
        this.appendAudit({
            actor: actor,
            action: "player.unmute",
            targetType: "player",
            target: entry.name,
            before: before,
            after: entry,
            ip: ip
        });
        this.save();
        return Object.assign({}, entry);
    }
    isMaintenanceEnabled() {
        return !!this.data.featureFlags.maintenanceMode;
    }
    setFeatureFlag(flagKey, enabled, actor, ip) {
        let safeKey = String(flagKey || "").trim();
        if (!Object.prototype.hasOwnProperty.call(this.data.featureFlags, safeKey)) throw new Error("Unknown feature flag.");
        let before = this.data.featureFlags[safeKey];
        this.data.featureFlags[safeKey] = !!enabled;
        this.appendAudit({
            actor: actor,
            action: "featureFlag.update",
            targetType: "featureFlag",
            target: safeKey,
            before: before,
            after: this.data.featureFlags[safeKey],
            ip: ip
        });
        this.save();
        return Object.assign({}, this.data.featureFlags);
    }
    getFeatureFlags() {
        return Object.assign({}, this.data.featureFlags);
    }
    getLiveOpsSettings() {
        return Object.assign({}, this.data.liveOpsSettings);
    }
    setLiveOpsSettings(nextSettings, actor, ip) {
        let before = this.getLiveOpsSettings();
        this.data.liveOpsSettings = Object.assign({}, before, nextSettings || {});
        this.appendAudit({
            actor: actor,
            action: "liveops.settings.update",
            targetType: "liveops",
            target: "runtime-settings",
            before: before,
            after: this.data.liveOpsSettings,
            ip: ip
        });
        this.save();
        return this.getLiveOpsSettings();
    }
    dayKey(dateValue) {
        let date = dateValue ? new Date(dateValue) : new Date();
        return date.toISOString().slice(0, 10);
    }
    ensureDay(dayKey) {
        if (!this.data.dailyMetrics[dayKey]) {
            this.data.dailyMetrics[dayKey] = {
                peakOnline: 0,
                activeUsers: [],
                newUsers: [],
                matchesPlayed: 0,
                totalSessionDuration: 0
            };
        }
        return this.data.dailyMetrics[dayKey];
    }
    notePlayerSeen(name, isNew, timestamp) {
        let safeName = this.sanitizePlayerName(name),
            day = this.ensureDay(this.dayKey(timestamp));
        if (day.activeUsers.indexOf(safeName) === -1) day.activeUsers.push(safeName);
        if (isNew && day.newUsers.indexOf(safeName) === -1) day.newUsers.push(safeName);
        this.save();
    }
    noteRun(run) {
        let day = this.ensureDay(this.dayKey(run && run.finishedAt));
        day.matchesPlayed += 1;
        day.totalSessionDuration += Math.max(0, Math.round(run && run.timePlayedSeconds || 0));
        this.save();
    }
    updatePeakOnline(count, timestamp) {
        let day = this.ensureDay(this.dayKey(timestamp));
        day.peakOnline = Math.max(day.peakOnline || 0, Math.max(0, Math.round(count || 0)));
        this.save();
    }
    collectUniqueUsers(daysBack) {
        let names = new Set(),
            today = new Date();
        for (let i = 0; i < daysBack; i++) {
            let date = new Date(today.getTime() - i * 86400000),
                day = this.data.dailyMetrics[this.dayKey(date)];
            if (!day || !Array.isArray(day.activeUsers)) continue;
            for (let j = 0; j < day.activeUsers.length; j++) names.add(day.activeUsers[j]);
        }
        return names.size;
    }
    buildOverview(gameServer, profileProgressStore, supportStore) {
        let todayKey = this.dayKey(),
            today = this.ensureDay(todayKey),
            onlineHumans = gameServer.clients.filter(client => client && client.playerTracker && client.isConnected !== false && !client.playerTracker.isBot && !client.playerTracker.isMinion && !client.playerTracker.isMi).length,
            pendingReports = supportStore && supportStore.queue && Array.isArray(supportStore.queue.queued) ? supportStore.queue.queued.length : 0;
        return {
            onlinePlayersNow: onlineHumans,
            peakOnlineToday: today.peakOnline || onlineHumans,
            dailyActiveUsers: this.collectUniqueUsers(1),
            weeklyActiveUsers: this.collectUniqueUsers(7),
            monthlyActiveUsers: this.collectUniqueUsers(30),
            matchesPlayedToday: today.matchesPlayed || 0,
            averageSessionDurationSeconds: today.matchesPlayed ? Math.round(today.totalSessionDuration / today.matchesPlayed) : 0,
            newUsersToday: Array.isArray(today.newUsers) ? today.newUsers.length : 0,
            pendingReportsCount: pendingReports,
            serverHealth: {
                updateMsAverage: Number((gameServer.updateTimeAvg || 0).toFixed(2)),
                websocketClients: gameServer.socketCount || 0,
                uptimeSeconds: Math.max(0, Math.round((Date.now() - gameServer.startTime) / 1000))
            }
        };
    }
    buildAnalytics(days) {
        let totalDays = Math.max(1, Math.min(60, days || 30)),
            rows = [];
        for (let i = totalDays - 1; i >= 0; i--) {
            let date = new Date(Date.now() - i * 86400000),
                key = this.dayKey(date),
                day = this.ensureDay(key);
            rows.push({
                day: key,
                dau: Array.isArray(day.activeUsers) ? day.activeUsers.length : 0,
                newUsers: Array.isArray(day.newUsers) ? day.newUsers.length : 0,
                matchesPlayed: day.matchesPlayed || 0,
                averageSessionDurationSeconds: day.matchesPlayed ? Math.round(day.totalSessionDuration / day.matchesPlayed) : 0,
                peakOnline: day.peakOnline || 0
            });
        }
        return {
            summary: {
                dau: this.collectUniqueUsers(1),
                wau: this.collectUniqueUsers(7),
                mau: this.collectUniqueUsers(30)
            },
            days: rows
        };
    }
}

module.exports = AdminStore;
