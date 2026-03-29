# NOX Repo Base

Active gameplay base using the preferred GitHub repo mechanics.

## Structure
- `server` : repo-based server source
- `client` : matching repo-based client source

## Helpers
- `start-local.ps1` : starts the NOX repo server and client
- `stop-local.ps1` : stops the local ports used by the repo build
- `SETUP-TELEGRAM-AND-LAUNCH.md` : beginner-friendly step-by-step setup for Telegram login and launch prep

## Local Test
- Client: http://127.0.0.1:3001/?ip=127.0.0.1:15003
- Server websocket: ws://127.0.0.1:15003

## Notes
- Launch the server from `server/src`
- Launch the client from `client`
- Keep gameplay/mechanics intact first, then rebrand/replace visuals in controlled passes
- Keep `server/LICENSE.txt` and derivative notices intact while this base is in use
- The server now supports a simple `.env` file in `server/.env`
