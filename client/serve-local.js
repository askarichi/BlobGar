"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = process.env.PORT || 3001;
const host = process.env.HOST || "0.0.0.0";

const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mp3": "audio/mpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ttf": "font/ttf",
    ".txt": "text/plain; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
};

function send(res, status, body, type) {
    res.writeHead(status, { "Content-Type": type || "text/plain; charset=utf-8" });
    res.end(body);
}

http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const relativePath = urlPath === "/" ? "/index.html" : urlPath;
    const filePath = path.normalize(path.join(root, relativePath));

    if (!filePath.startsWith(root)) {
        send(res, 403, "Forbidden");
        return;
    }

    fs.stat(filePath, (statErr, stats) => {
        if (statErr || !stats.isFile()) {
            send(res, 404, "Not Found");
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
    });
}).listen(port, host, () => {
    console.log(`NOX repo client running on ${host}:${port}`);
});
