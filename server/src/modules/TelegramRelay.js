"use strict";
const fs = require("fs");
const https = require("https");
const path = require("path");

class TelegramRelay {
    constructor() {
        this.botToken = process.env.NOX_TELEGRAM_BOT_TOKEN || "";
        this.chatId = process.env.NOX_TELEGRAM_CHAT_ID || "";
    }
    isConfigured() {
        return !!(this.botToken && this.chatId);
    }
    formatCaption(report) {
        return [
            "NOX Support Report",
            "ID: " + report.id,
            "User: " + report.username,
            "Category: " + report.category,
            "Priority: " + report.priority,
            "Page: " + report.page,
            "Time: " + report.localTime,
            "TZ: " + report.timezone,
            "",
            report.description
        ].join("\n").slice(0, 1024);
    }
    requestJson(method, endpoint, body, headers) {
        let options = {
            hostname: "api.telegram.org",
            port: 443,
            path: "/bot" + this.botToken + endpoint,
            method: method,
            headers: headers || {}
        };
        return new Promise((resolve, reject) => {
            let req = https.request(options, res => {
                let chunks = [];
                res.on("data", chunk => chunks.push(chunk));
                res.on("end", () => {
                    let text = Buffer.concat(chunks).toString("utf8");
                    if (res.statusCode >= 200 && res.statusCode < 300) return resolve(text);
                    reject(new Error("Telegram relay failed with status " + res.statusCode + "."));
                });
            });
            req.on("error", reject);
            if (body) req.write(body);
            req.end();
        });
    }
    async sendMessage(report) {
        let body = JSON.stringify({
            chat_id: this.chatId,
            text: this.formatCaption(report)
        });
        await this.requestJson("POST", "/sendMessage", body, {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body)
        });
    }
    async sendPhoto(report) {
        let fileBuffer = fs.readFileSync(report.screenshotPath),
            boundary = "----NOX" + Date.now().toString(16),
            chunks = [];
        let push = value => chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
        push("--" + boundary + "\r\n");
        push("Content-Disposition: form-data; name=\"chat_id\"\r\n\r\n");
        push(this.chatId + "\r\n");
        push("--" + boundary + "\r\n");
        push("Content-Disposition: form-data; name=\"caption\"\r\n\r\n");
        push(this.formatCaption(report) + "\r\n");
        push("--" + boundary + "\r\n");
        push("Content-Disposition: form-data; name=\"photo\"; filename=\"" + path.basename(report.screenshotPath) + "\"\r\n");
        push("Content-Type: " + (report.screenshotMimeType || "image/png") + "\r\n\r\n");
        push(fileBuffer);
        push("\r\n--" + boundary + "--\r\n");
        let body = Buffer.concat(chunks);
        await this.requestJson("POST", "/sendPhoto", body, {
            "Content-Type": "multipart/form-data; boundary=" + boundary,
            "Content-Length": body.length
        });
    }
    async relay(report) {
        if (!this.isConfigured()) return {
            status: "queued",
            message: "Telegram binding is not configured yet."
        };
        if (report.screenshotPath && fs.existsSync(report.screenshotPath)) {
            await this.sendPhoto(report);
        } else {
            await this.sendMessage(report);
        }
        return {
            status: "delivered",
            message: "Delivered to Telegram."
        };
    }
}

module.exports = TelegramRelay;
