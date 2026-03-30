# NOX Setup Guide

This guide is written for the current NOX repo-base build.

## What This Setup Does
- enables Telegram Mini App login
- locks the username for Telegram players
- hides the social buttons for Telegram players
- keeps guest login working for normal browser players
- lets you prepare the project for public launch

## Where You Will Edit
- environment file:
  - [D:\Game\Nox-Game\projects\nox-repo-base\server\.env](D:\Game\Nox-Game\projects\nox-repo-base\server\.env)
- template/example:
  - [D:\Game\Nox-Game\projects\nox-repo-base\server\.env.example](D:\Game\Nox-Game\projects\nox-repo-base\server\.env.example)

## Step 1: Create The Server Env File
1. Open this folder:
   - [D:\Game\Nox-Game\projects\nox-repo-base\server](D:\Game\Nox-Game\projects\nox-repo-base\server)
2. Copy `.env.example`
3. Rename the copy to:
   - `.env`

## Step 2: Fill In The Values
Open [D:\Game\Nox-Game\projects\nox-repo-base\server\.env](D:\Game\Nox-Game\projects\nox-repo-base\server\.env)

Use this format:

```env
NOX_TELEGRAM_BOT_TOKEN=PASTE_YOUR_BOT_TOKEN_HERE
NOX_TELEGRAM_LAUNCH_URL=PASTE_YOUR_TELEGRAM_BOT_OR_MINIAPP_LINK_HERE
NOX_TELEGRAM_CHAT_ID=PASTE_YOUR_CHAT_ID_HERE
NOX_CLIENT_BIND=https://YOUR-REAL-DOMAIN.COM
NOX_SERVER_CHAT_PASSWORD=MAKE_A_LONG_RANDOM_PASSWORD_HERE
```

### What Each Value Means
- `NOX_TELEGRAM_BOT_TOKEN`
  - required for Telegram Mini App login
- `NOX_TELEGRAM_LAUNCH_URL`
  - optional but strongly recommended
  - this is what the Telegram button inside NOX opens
  - example:
    - `https://t.me/YourBotUsername`
- `NOX_TELEGRAM_CHAT_ID`
  - optional now
  - used for support relay into Telegram admin chat
  - this must be the target admin group/chat id, not just your private chat with the bot
  - you can provide multiple chat ids separated by commas if you want support reports to go to more than one place
- `NOX_CLIENT_BIND`
  - the exact allowed browser client origin
  - examples:
    - `http://127.0.0.1:3001`
    - `https://play.noxgar.com`
  - local `127.0.0.1` and `localhost` are still allowed for development
- `NOX_SERVER_CHAT_PASSWORD`
  - replaces the weak default OP password

## Step 3: Restart NOX
After editing `.env`, restart the local runtime:

1. Stop current local runtime:
   - [D:\Game\Nox-Game\projects\nox-repo-base\stop-local.ps1](D:\Game\Nox-Game\projects\nox-repo-base\stop-local.ps1)
2. Start it again:
   - [D:\Game\Nox-Game\projects\nox-repo-base\start-local.ps1](D:\Game\Nox-Game\projects\nox-repo-base\start-local.ps1)

## Step 4: Test Telegram Login
Expected result when the game is opened inside the Telegram Mini App:
- username is auto-filled
- username cannot be changed
- Telegram/Google buttons are hidden
- profile progression loads for that Telegram account

## Step 5: Test Normal Browser Login
Expected result in a regular browser:
- guest session is created automatically
- username stays editable
- Telegram/Google buttons stay visible
- profile progression belongs to the guest session, not just the nickname text

## Step 6: Before Public Launch
Make sure all of these are true:
- `NOX_TELEGRAM_BOT_TOKEN` is set
- `NOX_CLIENT_BIND` points to your real domain
- `NOX_SERVER_CHAT_PASSWORD` is changed
- the server has been restarted after editing `.env`

## What To Ask Me For Next
If you want help step by step, ask me one of these:
1. `help me fill the .env file`
2. `help me get the Telegram bot token`
3. `help me find the Telegram chat id`
4. `help me test the Telegram Mini App login`
5. `make a backup now`
