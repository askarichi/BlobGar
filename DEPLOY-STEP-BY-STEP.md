# NOX Deployment Step By Step

This file is the simple beginner-safe order for putting the new NOX build online.

## Phase 1. Freeze the good local version
1. Confirm the local build you like is working.
2. Confirm the latest backup path is written in:
   - `D:\Game\Nox-Game\backups\LATEST-NOX-REPO-BASE-BACKUP.txt`
3. Do not change gameplay again before deployment.

## Phase 2. Prepare GitHub from this folder
This project folder is currently **not** a Git repository yet.

### 2.1 Create the empty GitHub repo
1. Open GitHub in your browser.
2. Click `New repository`.
3. Name it something like:
   - `nox-arena-live`
4. Leave it empty:
   - no README
   - no `.gitignore`
   - no license
5. Create the repo.

### 2.2 Turn this local folder into a git repo
Open PowerShell and run these exact commands:

```powershell
cd D:\Game\Nox-Game\projects\nox-repo-base
git init
git add .
git commit -m "Initial NOX Arena live-ready build"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL_HERE
git push -u origin main
```

Example remote URL:

```powershell
git remote add origin https://github.com/YOURNAME/nox-arena-live.git
```

## Phase 3. Back up the current live server before deleting anything
Do **not** erase the old live game first without making a copy.

Make 2 backups on the live server:
1. the current site root for `noxgar.com`
2. the current `noxgar.com/test` site

Use dated folder names.

Example names:
- `live-root-backup-2026-03-29`
- `live-test-backup-2026-03-29`

## Phase 4. Remove the old live build only after backup exists
Once the old live site is backed up:
1. remove the old root site files for `noxgar.com`
2. remove the old `/test` files too
3. keep the backups untouched

Important:
- do not mix old and new files in the same web root
- use a clean fresh deploy

## Phase 5. Upload the new NOX build
Upload this project to the live server:
- `client`
- `server`
- root docs/scripts if needed

Do **not** upload:
- `.runtime`
- `node_modules`
- local backup folders
- local `.env` with wrong machine-specific values unless you reviewed them first

## Phase 6. Production env values
Open the live server env file and set:

```env
NOX_TELEGRAM_BOT_TOKEN=YOUR_REAL_TOKEN
NOX_TELEGRAM_LAUNCH_URL=https://t.me/NOXGAR_bot
NOX_TELEGRAM_CHAT_ID=YOUR_REAL_CHAT_ID
NOX_CLIENT_BIND=https://noxgar.com
NOX_SERVER_CHAT_PASSWORD=USE_A_LONG_RANDOM_PASSWORD
```

Optional if you move the socket to a separate domain later:

```env
NOX_SERVER_PORT=15003
```

## Phase 7. Put HTTPS in front of the game server
This repo uses:
- static client
- arena WebSocket server

The clean public setup is:
- `https://noxgar.com` for the client
- reverse proxy in front of the game server

Recommended:
- `nginx` or `caddy`

## Phase 8. Recommended public structure
Best public layout:
1. `noxgar.com` serves the `client` files
2. reverse proxy forwards the arena socket to the Node server on port `15003`
3. the client connects through the public domain, not `127.0.0.1`

## Phase 9. Post-deploy checks
After upload and restart, check:
1. `https://noxgar.com` loads the new NOX lobby
2. `Play` enters the arena normally
3. skins load
4. admin panel works
5. support relay works
6. Telegram Mini App opens the new build
7. Telegram username autofill/lock works

## Phase 10. Rollback plan
If the live deploy goes wrong:
1. stop the new runtime
2. restore the old live root backup
3. restore the old `/test` backup
4. restart the previous live setup

## What we should do next
The next correct step is to decide which live server path matches your real server:
1. Linux server path
2. Windows server path

That decides the exact delete/upload/restart commands.
