"use strict";
const fs = require("fs");
const path = require("path");
const Log = require("./Logger");

class SupportStore {
    constructor(rootDir) {
        this.rootDir = rootDir;
        this.reportsFile = path.join(rootDir, "support-reports.json");
        this.queueFile = path.join(rootDir, "support-telegram-queue.json");
        this.screenshotDir = path.join(rootDir, "support-screenshots");
        this.reports = this.readJson(this.reportsFile, {
            version: 1,
            reports: []
        });
        this.queue = this.readJson(this.queueFile, {
            version: 1,
            queued: []
        });
    }
    ensureDirectories() {
        fs.mkdirSync(this.rootDir, {
            recursive: true
        });
        fs.mkdirSync(this.screenshotDir, {
            recursive: true
        });
    }
    readJson(filePath, fallback) {
        this.ensureDirectories();
        if (!fs.existsSync(filePath)) {
            this.writeJson(filePath, fallback);
            return fallback;
        }
        try {
            return Object.assign({}, fallback, JSON.parse(fs.readFileSync(filePath, "utf8")));
        } catch (error) {
            Log.error("SupportStore: Failed to read " + path.basename(filePath) + " - " + error.message);
            this.writeJson(filePath, fallback);
            return fallback;
        }
    }
    writeJson(filePath, value) {
        this.ensureDirectories();
        fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
    }
    createId() {
        return "SUP-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    }
    parseScreenshot(dataUrl) {
        if (!dataUrl || typeof dataUrl !== "string") return null;
        let match = dataUrl.match(/^data:(image\/png|image\/jpeg|image\/webp);base64,(.+)$/);
        if (!match) return null;
        let ext = "jpg",
            buffer = Buffer.from(match[2], "base64");
        if (match[1] === "image/png") ext = "png";
        else if (match[1] === "image/webp") ext = "webp";
        if (buffer.length > 5 * 1024 * 1024) throw new Error("Screenshot is too large.");
        return {
            ext: ext,
            buffer: buffer,
            mimeType: match[1]
        };
    }
    createReport(payload) {
        let id = this.createId(),
            screenshot = this.parseScreenshot(payload.screenshotDataUrl),
            now = new Date().toISOString(),
            screenshotPath = null;
        if (screenshot) {
            screenshotPath = path.join(this.screenshotDir, id + "." + screenshot.ext);
            fs.writeFileSync(screenshotPath, screenshot.buffer);
        }
        let report = {
            id: id,
            createdAt: now,
            username: (payload.username || "Pilot-07").trim().slice(0, 30) || "Pilot-07",
            telegramUsername: String(payload.telegramUsername || "").trim().replace(/^@+/, "").slice(0, 32),
            authProvider: (payload.authProvider || "guest").trim().slice(0, 24) || "guest",
            category: (payload.category || "bug").trim().slice(0, 32) || "bug",
            priority: (payload.priority || "normal").trim().slice(0, 24) || "normal",
            description: (payload.description || "").trim().slice(0, 2500),
            page: (payload.page || "support").trim().slice(0, 120),
            localTime: (payload.localTime || "").trim().slice(0, 80),
            timezone: (payload.timezone || "").trim().slice(0, 80),
            userAgent: (payload.userAgent || "").trim().slice(0, 280),
            screenshotPath: screenshotPath,
            screenshotMimeType: screenshot ? screenshot.mimeType : null,
            relayStatus: "queued",
            relayMessage: "Waiting for Telegram binding."
        };
        this.reports.reports.unshift(report);
        this.reports.reports = this.reports.reports.slice(0, 500);
        this.writeJson(this.reportsFile, this.reports);
        this.queue.queued.unshift({
            id: report.id,
            createdAt: report.createdAt
        });
        this.queue.queued = this.queue.queued.slice(0, 500);
        this.writeJson(this.queueFile, this.queue);
        return report;
    }
    markRelay(reportId, status, message) {
        let report = this.reports.reports.find(item => item.id === reportId);
        if (!report) return;
        report.relayStatus = status;
        report.relayMessage = message || "";
        this.writeJson(this.reportsFile, this.reports);
    }
    listReports(limit) {
        let safeLimit = Math.max(1, Math.min(250, Math.round(limit || 50)));
        return this.reports.reports.slice(0, safeLimit).map(report => ({
            id: report.id,
            createdAt: report.createdAt,
            username: report.username,
            telegramUsername: report.telegramUsername || "",
            category: report.category,
            priority: report.priority,
            description: report.description,
            relayStatus: report.relayStatus,
            relayMessage: report.relayMessage,
            hasScreenshot: !!report.screenshotPath,
            authProvider: report.authProvider || "guest",
            page: report.page || "support"
        }));
    }
}

module.exports = SupportStore;
