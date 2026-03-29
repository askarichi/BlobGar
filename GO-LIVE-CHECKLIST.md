# NOX Go-Live Checklist

This file is the simple step-by-step checklist for switching the new NOX build live.

## 1. Keep a rollback point
1. Make a fresh full backup.
2. Confirm the latest backup path is written to:
   - D:\Game\Nox-Game\backups\LATEST-NOX-REPO-BASE-BACKUP.txt

## 2. Confirm server env is filled
Open:
- D:\Game\Nox-Game\projects\nox-repo-base\server\.env

Check these values:
- NOX_TELEGRAM_BOT_TOKEN=...
- NOX_TELEGRAM_LAUNCH_URL=https://t.me/NOXGAR_bot
- NOX_TELEGRAM_CHAT_ID=...
- NOX_CLIENT_BIND=https://noxgar.com
- NOX_SERVER_CHAT_PASSWORD=use-a-long-random-password

## 3. Replace the old live site with this build
Important:
- Telegram Mini App login will only fully work after https://noxgar.com is serving this new NOX build.
- Do not test Mini App login against the old live site.

## 4. After deployment, restart the NOX runtime
Run in PowerShell:

powershell -ExecutionPolicy Bypass -File D:\Game\Nox-Game\projects\nox-repo-base\stop-local.ps1
powershell -ExecutionPolicy Bypass -File D:\Game\Nox-Game\projects\nox-repo-base\start-local.ps1

## 5. Public site checks
Open in a browser:
- https://noxgar.com

Check:
- the new NOX lobby loads
- no certificate warning appears
- Play enters the arena normally
- inventory, ranking, support, and settings still work

## 6. Telegram Mini App checks
Open your bot in Telegram.
Press the bot menu / launch button.

Check:
- the Mini App opens the new NOX build
- the username is auto-filled from Telegram
- the username field is locked
- Telegram and Google buttons are hidden
- progression still loads correctly

## 7. Support relay checks
From the NOX Support tab, send a test report.
Check the Telegram admin group receives it.

## 8. Admin checks
Open:
- https://noxgar.com/admin/login
or the local admin URL if still testing locally.

Check:
- login works
- players load
- overview loads
- audit logs update
- player detail shows ability levels and live modifiers

## 9. Final smoke test
Do one full arena run and verify:
- coins are awarded
- XP is awarded
- results screen appears smoothly
- exit prompt works
- ranking still works
- skins still show on players and bots

## 10. If something goes wrong
1. Stop the runtime.
2. Restore the latest backup.
3. Start the runtime again.
