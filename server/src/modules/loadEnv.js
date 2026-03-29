"use strict";
const fs = require("fs");
const path = require("path");

function parseEnvLine(line) {
    let trimmed = String(line || "").trim();
    if (!trimmed || trimmed[0] === "#") return null;
    let separator = trimmed.indexOf("=");
    if (separator < 1) return null;
    let key = trimmed.slice(0, separator).trim(),
        value = trimmed.slice(separator + 1).trim();
    if (!key) return null;
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return {
        key: key,
        value: value
    };
}

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        let parsed = parseEnvLine(lines[i]);
        if (!parsed) continue;
        if (process.env[parsed.key] == null || process.env[parsed.key] === "") process.env[parsed.key] = parsed.value;
    }
}

function loadEnv() {
    let candidates = [
        path.resolve(__dirname, "..", "..", ".env"),
        path.resolve(__dirname, "..", "..", ".env.local"),
        path.resolve(__dirname, "..", "..", "..", ".env"),
        path.resolve(__dirname, "..", "..", "..", ".env.local")
    ];
    for (let i = 0; i < candidates.length; i++) loadEnvFile(candidates[i]);
}

module.exports = loadEnv;
