"use strict";
const fs = require("fs");
const path = require("path");
const Log = require("./Logger");

class RankingStore {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = this.createEmptyStore();
        this.load();
    }
    createEmptyStore() {
        return {
            version: 1,
            updatedAt: null,
            overall: {},
            daily: {},
            weekly: {}
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
                parsed = JSON.parse(raw);
            this.data = Object.assign(this.createEmptyStore(), parsed || {});
            this.data.overall = this.data.overall || {};
            this.data.daily = this.data.daily || {};
            this.data.weekly = this.data.weekly || {};
        } catch (error) {
            Log.error("RankingStore: Failed to load ranking data - " + error.message);
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
            Log.error("RankingStore: Failed to save ranking data - " + error.message);
        }
    }
    normalizeKey(name) {
        return (name || "").trim().toLowerCase();
    }
    sanitizeName(name) {
        return ((name || "").trim() || "Anonymous").slice(0, 30);
    }
    getWeekKey(date) {
        let current = new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            day = current.getDay() || 7;
        current.setDate(current.getDate() + 4 - day);
        let yearStart = new Date(current.getFullYear(), 0, 1),
            week = Math.ceil((((current - yearStart) / 86400000) + 1) / 7);
        return current.getFullYear() + "-W" + String(week).padStart(2, "0");
    }
    getDayKey(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    }
    updateBucket(bucket, run) {
        let key = this.normalizeKey(run.name);
        if (!key) return;
        let entry = bucket[key] || {
            name: run.name,
            bestScore: 0,
            bestKills: 0,
            lastScore: 0,
            lastKills: 0,
            gamesPlayed: 0,
            totalKills: 0,
            totalTimePlayed: 0,
            lastSeen: null,
            skin: ""
        };
        entry.name = run.name;
        entry.skin = run.skin || entry.skin || "";
        entry.bestScore = Math.max(entry.bestScore || 0, run.score || 0);
        entry.bestKills = Math.max(entry.bestKills || 0, run.kills || 0);
        entry.lastScore = run.score || 0;
        entry.lastKills = run.kills || 0;
        entry.gamesPlayed = (entry.gamesPlayed || 0) + 1;
        entry.totalKills = (entry.totalKills || 0) + (run.kills || 0);
        entry.totalTimePlayed = (entry.totalTimePlayed || 0) + (run.timePlayedSeconds || 0);
        entry.lastSeen = run.finishedAt;
        bucket[key] = entry;
    }
    recordRun(run) {
        if (!run || !run.name) return;
        let safeRun = {
                name: this.sanitizeName(run.name),
                skin: run.skin || "",
                score: Math.max(0, Math.round(run.score || 0)),
                kills: Math.max(0, Math.round(run.kills || 0)),
                timePlayedSeconds: Math.max(0, Math.round(run.timePlayedSeconds || 0)),
                finishedAt: run.finishedAt || new Date().toISOString()
            },
            finishedAt = new Date(safeRun.finishedAt),
            weekKey = this.getWeekKey(finishedAt),
            dayKey = this.getDayKey(finishedAt);
        if (!this.data.daily[dayKey]) this.data.daily[dayKey] = {};
        if (!this.data.weekly[weekKey]) this.data.weekly[weekKey] = {};
        this.updateBucket(this.data.overall, safeRun);
        this.updateBucket(this.data.daily[dayKey], safeRun);
        this.updateBucket(this.data.weekly[weekKey], safeRun);
        this.save();
    }
    getSortedEntries(bucket, limit) {
        return Object.keys(bucket || {}).map(key => bucket[key]).sort((a, b) => {
            return (b.bestScore - a.bestScore) ||
                (b.bestKills - a.bestKills) ||
                ((a.lastSeen || "").localeCompare(b.lastSeen || "")) ||
                a.name.localeCompare(b.name);
        }).slice(0, limit).map((entry, index) => ({
            rank: index + 1,
            name: entry.name,
            skin: entry.skin || "",
            score: entry.bestScore || 0,
            kills: entry.bestKills || 0,
            gamesPlayed: entry.gamesPlayed || 0,
            totalKills: entry.totalKills || 0,
            timePlayedSeconds: entry.totalTimePlayed || 0,
            lastSeen: entry.lastSeen || null
        }));
    }
    buildSnapshot(limit) {
        let now = new Date(),
            dayKey = this.getDayKey(now),
            weekKey = this.getWeekKey(now),
            dailyBucket = this.data.daily[dayKey] || {},
            weeklyBucket = this.data.weekly[weekKey] || {};
        return {
            updatedAt: this.data.updatedAt || now.toISOString(),
            dayKey: dayKey,
            weekKey: weekKey,
            dailyTop100: this.getSortedEntries(dailyBucket, limit || 100),
            weeklyTop100: this.getSortedEntries(weeklyBucket, limit || 100),
            overallTop100: this.getSortedEntries(this.data.overall, limit || 100)
        };
    }
}

module.exports = RankingStore;
