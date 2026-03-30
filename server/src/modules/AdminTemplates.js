"use strict";

function renderLoginPage() {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NOX Admin Login</title>
<style>
:root {
  color-scheme: dark;
  --bg:#0a0d14;
  --bg2:#101522;
  --panel:#111827;
  --panel2:#172033;
  --border:rgba(110,168,255,.16);
  --text:#edf4ff;
  --muted:#93a4c7;
  --accent:#6ee7ff;
  --accent2:#8b5cf6;
}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;font-family:Segoe UI,Arial,sans-serif;background:radial-gradient(circle at top,#1b2340 0,#0a0d14 52%,#06080d 100%);color:var(--text);display:flex;align-items:center;justify-content:center;padding:24px}
body:before{content:"";position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:48px 48px;opacity:.22;pointer-events:none}
.nox-admin-login{width:min(100%,440px);background:linear-gradient(180deg,rgba(17,24,39,.96),rgba(10,14,24,.94));border:1px solid var(--border);border-radius:22px;padding:28px;box-shadow:0 25px 60px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.02) inset}
.nox-admin-login__eyebrow{font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
.nox-admin-login h1{margin:0 0 10px;font-size:28px;letter-spacing:.08em;text-transform:uppercase}
.nox-admin-login p{margin:0 0 22px;color:var(--muted);line-height:1.5}
label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:#b8c6e2;margin-bottom:8px}
input{width:100%;border-radius:14px;border:1px solid rgba(110,168,255,.18);background:#0d1320;color:var(--text);padding:14px 16px;font-size:14px;outline:none}
input:focus{border-color:rgba(110,231,255,.5);box-shadow:0 0 0 3px rgba(110,231,255,.12)}
.form-row{margin-bottom:16px}
button{width:100%;border:0;border-radius:14px;padding:14px 16px;font-weight:700;font-size:14px;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;background:linear-gradient(90deg,var(--accent),#60a5fa 52%,var(--accent2));color:#081019;box-shadow:0 10px 30px rgba(96,165,250,.25)}
button:hover{filter:brightness(1.06);transform:translateY(-1px)}
.nox-admin-login__status{min-height:22px;margin-top:16px;color:var(--muted);font-size:13px}
.nox-admin-login__status.is-error{color:#fecaca}
.nox-admin-login__status.is-success{color:#bbf7d0}
.nox-admin-login__meta{margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.06);font-size:12px;color:var(--muted)}
</style>
</head>
<body>
<div class="nox-admin-login">
  <div class="nox-admin-login__eyebrow">NOX Internal Access</div>
  <h1>Admin Panel</h1>
  <p>Secure operations access for NOX admins only. Every request is validated server-side.</p>
  <form id="admin-login-form">
    <div class="form-row">
      <label for="admin-username">Username</label>
      <input id="admin-username" name="username" autocomplete="username" required>
    </div>
    <div class="form-row">
      <label for="admin-password">Password</label>
      <input id="admin-password" name="password" type="password" autocomplete="current-password" required>
    </div>
    <button type="submit">Sign In</button>
  </form>
  <div id="admin-login-status" class="nox-admin-login__status"></div>
  <div class="nox-admin-login__meta">If bootstrap credentials were just generated, check the local server data folder and rotate them after your first sign-in.</div>
</div>
<script>
(function(){
  var form = document.getElementById('admin-login-form');
  var status = document.getElementById('admin-login-status');
  function setStatus(type, text){
    status.className = 'nox-admin-login__status' + (type ? ' is-' + type : '');
    status.textContent = text || '';
  }
  form.addEventListener('submit', async function(event){
    event.preventDefault();
    setStatus('', 'Signing in...');
    var payload = {
      username: document.getElementById('admin-username').value.trim(),
      password: document.getElementById('admin-password').value
    };
    try {
      var response = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      var data = await response.json().catch(function(){ return {}; });
      if (!response.ok || !data.ok) {
        setStatus('error', data.error || 'Admin login failed.');
        return;
      }
      setStatus('success', 'Access granted. Redirecting...');
      window.location.href = '/admin';
    } catch (error) {
      setStatus('error', 'Admin login is unavailable right now.');
    }
  });
})();
</script>
</body>
</html>`;
}

function renderPanelPage() {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NOX Admin Panel</title>
<style>
:root {
  color-scheme: dark;
  --bg:#090d16;
  --panel:#111827;
  --border:rgba(110,168,255,.15);
  --text:#eef4ff;
  --muted:#91a3c8;
  --accent:#6ee7ff;
  --accent2:#8b5cf6;
  --ok:#22c55e;
  --warn:#f59e0b;
  --danger:#ef4444;
}
*{box-sizing:border-box}
body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:radial-gradient(circle at top,#17203a 0,#0a0d16 52%,#06080d 100%);color:var(--text)}
body:before{content:"";position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:46px 46px;opacity:.22;pointer-events:none}
.nox-admin{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:100vh;position:relative;z-index:1}
.nox-admin__sidebar{background:linear-gradient(180deg,rgba(10,15,28,.96),rgba(8,11,20,.98));border-right:1px solid rgba(110,168,255,.1);padding:24px 18px;display:flex;flex-direction:column;gap:18px}
.nox-admin__brand{padding:8px 10px 18px;border-bottom:1px solid rgba(255,255,255,.06)}
.nox-admin__eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.34em;color:var(--accent);margin-bottom:8px}
.nox-admin__brand h1{margin:0;font-size:24px;letter-spacing:.12em;text-transform:uppercase}
.nox-admin__brand p{margin:8px 0 0;color:var(--muted);font-size:13px;line-height:1.5}
.nox-admin__nav{display:flex;flex-direction:column;gap:8px}
.nox-admin__nav button{border:1px solid transparent;background:transparent;color:#d7e3fb;text-align:left;border-radius:14px;padding:12px 14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.nox-admin__nav button:hover{background:rgba(110,168,255,.08);border-color:rgba(110,168,255,.18)}
.nox-admin__nav button.is-active{background:linear-gradient(90deg,rgba(110,231,255,.16),rgba(139,92,246,.16));border-color:rgba(110,231,255,.28);box-shadow:0 0 0 1px rgba(110,231,255,.08) inset}
.nox-admin__sidebar-meta{margin-top:auto;padding:14px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);color:var(--muted);font-size:12px;line-height:1.5}
.nox-admin__main{padding:24px;display:flex;flex-direction:column;gap:18px}
.nox-admin__topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 22px;border-radius:20px;background:linear-gradient(180deg,rgba(17,24,39,.94),rgba(12,17,29,.9));border:1px solid var(--border)}
.nox-admin__topbar h2{margin:0;font-size:24px;letter-spacing:.08em;text-transform:uppercase}
.nox-admin__topbar p{margin:6px 0 0;color:var(--muted);font-size:13px}
.nox-admin__actions{display:flex;align-items:center;gap:10px}
.nox-admin__chip{padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-size:12px;color:var(--muted)}
.nox-admin__btn{border:1px solid rgba(110,168,255,.18);background:rgba(255,255,255,.03);color:var(--text);border-radius:12px;padding:10px 14px;font-weight:700;cursor:pointer}
.nox-admin__btn:hover{filter:brightness(1.06)}
.nox-admin__btn--primary{background:linear-gradient(90deg,var(--accent),#60a5fa 55%,var(--accent2));color:#081019;border:0}
.nox-admin__btn--danger{background:rgba(239,68,68,.16);border-color:rgba(239,68,68,.26);color:#fecaca}
.nox-admin__section{display:none;gap:16px}
.nox-admin__section.is-active{display:flex;flex-direction:column}
.nox-admin__grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}
.nox-card{background:linear-gradient(180deg,rgba(17,24,39,.94),rgba(13,18,31,.92));border:1px solid var(--border);border-radius:20px;padding:18px;box-shadow:0 12px 32px rgba(0,0,0,.22)}
.nox-card h3{margin:0 0 10px;font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:#cad7ef}
.nox-kpi{grid-column:span 3;min-height:120px}
.nox-kpi__value{font-size:36px;font-weight:800;line-height:1.1;margin-top:16px}
.nox-kpi__hint{margin-top:8px;color:var(--muted);font-size:12px}
.nox-card--wide{grid-column:span 8}
.nox-card--mid{grid-column:span 6}
table{width:100%;border-collapse:collapse}
th,td{padding:12px 10px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left;font-size:13px}
th{font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:#b7c7e6}
td{color:#ebf2ff}
input,textarea{width:100%;border-radius:12px;border:1px solid rgba(110,168,255,.18);background:#0d1320;color:var(--text);padding:12px 14px;font:inherit;outline:none}
input:focus,textarea:focus{border-color:rgba(110,231,255,.42);box-shadow:0 0 0 3px rgba(110,231,255,.12)}
textarea{min-height:120px;resize:vertical}
.nox-form-row--single{display:grid;grid-template-columns:1fr}
.nox-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.08);font-size:12px;color:var(--muted)}
.nox-badge--ok{color:#bbf7d0;border-color:rgba(34,197,94,.26);background:rgba(34,197,94,.08)}
.nox-badge--warn{color:#fde68a;border-color:rgba(245,158,11,.26);background:rgba(245,158,11,.08)}
.nox-note{color:var(--muted);font-size:13px;line-height:1.6}
.nox-player-layout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px}
.nox-player-search-results{max-height:440px;overflow:auto}
.nox-player-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.nox-player-row:last-child{border-bottom:0}
.nox-player-row strong{display:block}
.nox-player-row span{display:block;color:var(--muted);font-size:12px;margin-top:4px}
.nox-player-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.nox-resource-admin-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
.nox-resource-admin-card{padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
.nox-resource-admin-card strong{display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b8c6e2}
.nox-resource-admin-value{display:block;font-size:28px;font-weight:800;margin:10px 0 12px}
.nox-resource-admin-actions{display:flex;flex-wrap:wrap;gap:8px}
.nox-bars{display:grid;gap:12px}
.nox-bars__row{display:grid;grid-template-columns:100px 1fr 72px;gap:12px;align-items:center}
.nox-bars__track{height:10px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}
.nox-bars__fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent),#60a5fa,var(--accent2))}
.nox-logs{max-height:560px;overflow:auto}
.nox-liveops-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.nox-liveops-field{display:grid;gap:8px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
.nox-liveops-field span{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#b7c7e6}
.nox-flag-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.nox-flag{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
.nox-admin__message{min-height:18px;color:var(--muted);font-size:13px}
.nox-admin__message.is-error{color:#fecaca}
.nox-admin__message.is-success{color:#bbf7d0}
@media (max-width:1180px){.nox-admin{grid-template-columns:1fr}.nox-admin__sidebar{border-right:0;border-bottom:1px solid rgba(110,168,255,.1)}.nox-kpi,.nox-card--wide,.nox-card--mid{grid-column:span 12}.nox-player-layout{grid-template-columns:1fr}.nox-flag-grid,.nox-resource-admin-grid,.nox-liveops-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="nox-admin">
  <aside class="nox-admin__sidebar">
    <div class="nox-admin__brand">
      <div class="nox-admin__eyebrow">NOX Operations</div>
      <h1>Admin Panel</h1>
      <p>Secure internal control surface for live operations, moderation, analytics, and audit history.</p>
    </div>
    <nav class="nox-admin__nav" id="admin-nav">
      <button class="is-active" data-section="overview">Overview</button>
      <button data-section="liveops">Live Ops</button>
      <button data-section="players">Players</button>
      <button data-section="support">Support</button>
      <button data-section="analytics">Analytics</button>
      <button data-section="settings">Settings</button>
      <button data-section="logs">Logs</button>
    </nav>
    <div class="nox-admin__sidebar-meta">Protected routes only. Server-side auth, CSRF validation, rate limits, and audit logs are enforced on every sensitive action.</div>
  </aside>
  <main class="nox-admin__main">
    <div class="nox-admin__topbar">
      <div>
        <h2 id="admin-section-title">Overview</h2>
        <p id="admin-section-copy">Live NOX operational snapshot.</p>
      </div>
      <div class="nox-admin__actions">
        <div class="nox-admin__chip" id="admin-user-chip">Admin</div>
        <button class="nox-admin__btn" id="admin-refresh-btn">Refresh</button>
        <button class="nox-admin__btn nox-admin__btn--danger" id="admin-logout-btn">Logout</button>
      </div>
    </div>
    <div class="nox-admin__message" id="admin-global-message"></div>

    <section class="nox-admin__section is-active" data-section="overview">
      <div class="nox-admin__grid" id="overview-grid"></div>
    </section>

    <section class="nox-admin__section" data-section="liveops">
      <div class="nox-admin__grid">
        <div class="nox-card nox-card--mid"><h3>Live Server</h3><div id="liveops-server"></div></div>
        <div class="nox-card nox-card--mid">
          <h3>Broadcast</h3>
          <div class="nox-form-row--single"><textarea id="admin-broadcast-message" placeholder="Write a short broadcast for players..."></textarea></div>
          <div class="nox-player-actions"><button class="nox-admin__btn nox-admin__btn--primary" id="admin-broadcast-btn">Send Broadcast</button></div>
        </div>
        <div class="nox-card nox-card--wide">
          <h3>Runtime Controls</h3>
          <div class="nox-liveops-grid">
            <label class="nox-liveops-field"><span>Bot Target</span><input id="admin-liveops-botTarget" type="number" min="0" max="200"></label>
            <label class="nox-liveops-field"><span>Map Spikes</span><input id="admin-liveops-mapSpikes" type="number" min="0" max="400"></label>
            <label class="nox-liveops-field"><span>Food Dots</span><input id="admin-liveops-foodTarget" type="number" min="0" max="12000"></label>
            <label class="nox-liveops-field"><span>Food Spawn</span><input id="admin-liveops-foodSpawnAmount" type="number" min="0" max="500"></label>
            <label class="nox-liveops-field"><span>Player Cap</span><input id="admin-liveops-playerCap" type="number" min="1" max="500"></label>
          </div>
          <div class="nox-player-actions"><button class="nox-admin__btn nox-admin__btn--primary" id="admin-save-liveops-btn">Apply Runtime Settings</button></div>
          <div class="nox-note">Bot cap, map spikes, food population, spawn rate, and player capacity apply live and are persisted for the next restart.</div>
        </div>
      </div>
    </section>

    <section class="nox-admin__section" data-section="players">
      <div class="nox-player-layout">
        <div class="nox-card">
          <h3>Search Players</h3>
          <div class="nox-form-row--single"><input id="admin-player-query" placeholder="Search by username or player id"></div>
          <div class="nox-player-actions"><button class="nox-admin__btn nox-admin__btn--primary" id="admin-player-search-btn">Search</button></div>
          <div class="nox-note" style="margin:10px 0 14px">Recent and online players load here automatically. Search to narrow the list.</div>
          <div class="nox-player-search-results" id="admin-player-results"></div>
        </div>
        <div class="nox-card">
          <h3>Player Detail</h3>
          <div id="admin-player-detail" class="nox-note">Search for a player to inspect profile progression, moderation state, and last-run summary.</div>
        </div>
      </div>
    </section>

    <section class="nox-admin__section" data-section="support">
      <div class="nox-admin__grid">
        <div class="nox-card nox-card--wide">
          <h3>Support Inbox</h3>
          <div class="nox-note" style="margin-bottom:12px">Every report submitted from the live support form lands here, even when Telegram relay is unavailable.</div>
          <div class="nox-logs" id="admin-support-reports"></div>
        </div>
      </div>
    </section>

    <section class="nox-admin__section" data-section="analytics">
      <div class="nox-admin__grid">
        <div class="nox-card nox-card--wide"><h3>Activity Trend</h3><div class="nox-bars" id="analytics-bars"></div></div>
        <div class="nox-card nox-card--mid"><h3>Summary</h3><div id="analytics-summary"></div></div>
        <div class="nox-card nox-card--mid"><h3>Daily Table</h3><div id="analytics-table"></div></div>
      </div>
    </section>

    <section class="nox-admin__section" data-section="settings">
      <div class="nox-admin__grid">
        <div class="nox-card nox-card--mid">
          <h3>Feature Flags</h3>
          <div class="nox-flag-grid" id="admin-feature-flags"></div>
          <div class="nox-player-actions"><button class="nox-admin__btn nox-admin__btn--primary" id="admin-save-flags-btn">Save Flags</button></div>
        </div>
        <div class="nox-card nox-card--mid">
          <h3>Safety Notes</h3>
          <div class="nox-note">Maintenance mode, player moderation, and coin edits are validated server-side and written to the audit log. This MVP is designed to expand later into reports, economy tooling, and deeper live operations.</div>
        </div>
      </div>
    </section>

    <section class="nox-admin__section" data-section="logs">
      <div class="nox-card"><h3>Audit Logs</h3><div class="nox-logs" id="admin-logs"></div></div>
    </section>
  </main>
</div>
<script>
(function(){
  var state = { session: null, csrf: '', featureFlags: {}, runtimeSettings: {}, currentPlayer: null };
  var sectionMeta = {
    overview: { title: 'Overview', copy: 'Live NOX operational snapshot.' },
    liveops: { title: 'Live Ops', copy: 'Monitor server state, maintenance mode, and player broadcasts.' },
    players: { title: 'Players', copy: 'Search profiles, inspect progression, and apply moderation safely.' },
    support: { title: 'Support Inbox', copy: 'Review support reports saved by players from the live client.' },
    analytics: { title: 'Analytics', copy: 'Daily activity trends and session health summaries.' },
    settings: { title: 'Settings', copy: 'Feature flags and admin-side operational controls.' },
    logs: { title: 'Audit Logs', copy: 'Every important admin action is recorded here.' }
  };
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(char){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char];});}
  function setMessage(type,text){var node=document.getElementById('admin-global-message');node.className='nox-admin__message'+(type?' is-'+type:'');node.textContent=text||'';}
  async function api(path,options){var init=Object.assign({credentials:'same-origin',headers:{}},options||{});if(state.csrf&&init.method&&init.method!=='GET')init.headers['X-NOX-CSRF']=state.csrf;if(init.body&&!init.headers['Content-Type'])init.headers['Content-Type']='application/json';var response=await fetch(path,init);var data=await response.json().catch(function(){return{};});if(!response.ok)throw new Error(data.error||'Request failed.');return data;}
  function setSection(name){document.querySelectorAll('.nox-admin__section').forEach(function(node){node.classList.toggle('is-active',node.getAttribute('data-section')===name);});document.querySelectorAll('#admin-nav button').forEach(function(node){node.classList.toggle('is-active',node.getAttribute('data-section')===name);});document.getElementById('admin-section-title').textContent=sectionMeta[name].title;document.getElementById('admin-section-copy').textContent=sectionMeta[name].copy;}
  function formatDuration(seconds){var total=Math.max(0,Number(seconds)||0),mins=Math.floor(total/60),secs=total%60,hrs=Math.floor(mins/60);mins=mins%60;if(hrs)return hrs+'h '+mins+'m';if(mins)return mins+'m '+secs+'s';return secs+'s';}
  function renderOverview(data){var grid=document.getElementById('overview-grid');var cards=[['Online Now',data.onlinePlayersNow,'Players currently active in the arena.'],['Peak Today',data.peakOnlineToday,'Highest online player count captured today.'],['DAU',data.dailyActiveUsers,'Unique active players today.'],['WAU',data.weeklyActiveUsers,'Unique active players in the last 7 days.'],['MAU',data.monthlyActiveUsers,'Unique active players in the last 30 days.'],['Matches Today',data.matchesPlayedToday,'Completed runs recorded today.'],['Avg Session',formatDuration(data.averageSessionDurationSeconds),'Average run length today.'],['Pending Reports',data.pendingReportsCount,'Support reports waiting in the relay queue.']];grid.innerHTML=cards.map(function(item){return '<article class="nox-card nox-kpi"><h3>'+esc(item[0])+'</h3><div class="nox-kpi__value">'+esc(item[1])+'</div><div class="nox-kpi__hint">'+esc(item[2])+'</div></article>';}).join('')+'<article class="nox-card nox-card--wide"><h3>Server Health</h3><table><tbody><tr><th>Update Avg</th><td>'+esc(data.serverHealth.updateMsAverage+' ms')+'</td><th>Websocket Clients</th><td>'+esc(data.serverHealth.websocketClients)+'</td></tr><tr><th>Uptime</th><td>'+esc(formatDuration(data.serverHealth.uptimeSeconds))+'</td><th>Status</th><td><span class="nox-badge nox-badge--ok">Healthy</span></td></tr></tbody></table></article>'; }
  function renderLiveOps(data){state.runtimeSettings=data.runtimeSettings||{};document.getElementById('liveops-server').innerHTML='<table><tbody><tr><th>Server</th><td>'+esc(data.server.name)+'</td></tr><tr><th>Players</th><td>'+esc(data.server.players)+' / '+esc(state.runtimeSettings.playerCap||'-')+'</td></tr><tr><th>Bots</th><td>'+esc(data.server.bots)+' / '+esc(state.runtimeSettings.botTarget||0)+'</td></tr><tr><th>Map Spikes</th><td>'+esc(state.runtimeSettings.mapSpikes||0)+'</td></tr><tr><th>Food</th><td>'+esc(state.runtimeSettings.foodTarget||0)+' target / '+esc(state.runtimeSettings.foodSpawnAmount||0)+' spawn</td></tr><tr><th>Avg Update</th><td>'+esc(data.server.updateMsAverage+' ms')+'</td></tr><tr><th>Maintenance</th><td><span class="nox-badge '+(data.featureFlags.maintenanceMode?'nox-badge--warn':'nox-badge--ok')+'">'+(data.featureFlags.maintenanceMode?'Enabled':'Disabled')+'</span></td></tr></tbody></table>';['botTarget','mapSpikes','foodTarget','foodSpawnAmount','playerCap'].forEach(function(key){var input=document.getElementById('admin-liveops-'+key);if(input)input.value=state.runtimeSettings[key]!=null?state.runtimeSettings[key]:'';});}
  function renderPlayerResults(rows){var root=document.getElementById('admin-player-results');if(!rows.length){root.innerHTML='<div class="nox-note">No players matched that search yet.</div>';return;}root.innerHTML=rows.map(function(row){return '<div class="nox-player-row"><div><strong>'+esc(row.name)+'</strong><span>ID '+esc(row.playerId||'-')+' · Coins '+esc(row.coins)+' · '+esc(row.authProvider||'guest')+' · '+(row.online?'Online':'Offline')+'</span></div><button class="nox-admin__btn" data-player="'+esc(row.lookupKey)+'">Open</button></div>';}).join('');root.querySelectorAll('button[data-player]').forEach(function(btn){btn.addEventListener('click',function(){loadPlayerDetail(btn.getAttribute('data-player'));});});}
  function renderPlayerDetail(detail){state.currentPlayer=detail;var mod=detail.moderation||{},abilities=detail.abilities||{},abilityEffects=detail.abilityEffects||{},resources=detail.resources||{},abilityKeys=Object.keys(abilities),resourceMeta={shields:'Shields',freezes:'Freezes',spikes:'Spikes'},abilityMarkup=abilityKeys.length?'<div class="nox-note" style="margin-top:14px"><strong>Abilities</strong><br>'+abilityKeys.map(function(key){var entry=abilities[key]||{},label=key.replace(/([A-Z])/g,' $1').replace(/^./,function(char){return char.toUpperCase();}),status=entry.isLive===false?' (Pending)':' (Live)';return esc(label)+': Lv. '+esc(entry.level||0)+' / '+esc(entry.maxLevel||50)+status;}).join('<br>')+'</div>':'',effectMarkup='<div class="nox-note" style="margin-top:14px"><strong>Live modifiers</strong><br>Speed x'+esc((abilityEffects.speedMultiplier||1).toFixed(2))+'<br>Spawn mass x'+esc((abilityEffects.startMassMultiplier||1).toFixed(2))+'<br>Eject cooldown '+esc(Number(abilityEffects.ejectCooldownTicks||0).toFixed(2))+' ticks<br>Shield '+esc(Math.round((abilityEffects.shieldDurationMs||0)/1000*100)/100)+'s / '+esc(Math.round((abilityEffects.shieldCooldownMs||0)/1000*100)/100)+'s<br>Freeze '+esc(Math.round((abilityEffects.freezeDurationMs||0)/1000*100)/100)+'s / '+esc(Math.round((abilityEffects.freezeCooldownMs||0)/1000*100)/100)+'s<br>Spike cooldown '+esc(Math.round((abilityEffects.spikeCooldownMs||0)/1000*100)/100)+'s</div>',resourceMarkup='<div class="nox-note" style="margin-top:14px"><strong>Ability Resources</strong><br>Grant or remove charges for live arena abilities. Each change is audited.</div><div class="nox-resource-admin-grid">'+Object.keys(resourceMeta).map(function(key){return '<div class="nox-resource-admin-card"><strong>'+esc(resourceMeta[key])+'</strong><span class="nox-resource-admin-value">'+esc(resources[key]||0)+'</span><div class="nox-resource-admin-actions"><button class="nox-admin__btn" data-resource="'+esc(key)+'" data-mode="delta" data-amount="1">+1</button><button class="nox-admin__btn" data-resource="'+esc(key)+'" data-mode="delta" data-amount="-1">-1</button><button class="nox-admin__btn" data-resource="'+esc(key)+'" data-mode="set" data-amount="">Set...</button></div></div>';}).join('')+'</div>';document.getElementById('admin-player-detail').innerHTML='<table><tbody><tr><th>Name</th><td>'+esc(detail.name)+'</td><th>Player ID</th><td>'+esc(detail.playerId||'-')+'</td></tr><tr><th>Auth</th><td>'+esc(detail.authProvider||'guest')+'</td><th>Account Key</th><td>'+esc(detail.accountKey||'-')+'</td></tr><tr><th>Level</th><td>'+esc(detail.level)+'</td><th>XP</th><td>'+esc(detail.totalXp)+'</td></tr><tr><th>Coins</th><td>'+esc(detail.coins)+'</td><th>Last Seen</th><td>'+esc(detail.lastSeen||'-')+'</td></tr><tr><th>Games</th><td>'+esc(detail.gamesPlayed)+'</td><th>Wins</th><td>'+esc(detail.totalWins)+'</td></tr><tr><th>Kills</th><td>'+esc(detail.totalKills)+'</td><th>Time Played</th><td>'+esc(formatDuration(detail.totalTimePlayedSeconds))+'</td></tr><tr><th>Skin</th><td>'+esc(detail.skin||'Base')+'</td><th>Moderation</th><td>'+esc(mod.banned?'Banned':(mod.mutedUntil?'Muted':'Clear'))+'</td></tr></tbody></table><div class="nox-player-actions"><button class="nox-admin__btn" id="player-coins-btn">Edit Coins</button><button class="nox-admin__btn '+(mod.mutedUntil?'nox-admin__btn--danger':'')+'" id="player-mute-btn">'+(mod.mutedUntil?'Unmute':'Mute 30m')+'</button><button class="nox-admin__btn '+(mod.banned?'':'nox-admin__btn--danger')+'" id="player-ban-btn">'+(mod.banned?'Unban':'Ban')+'</button></div>'+resourceMarkup+abilityMarkup+effectMarkup+'<div class="nox-note" style="margin-top:14px">Last run: score '+esc(detail.lastRun&&detail.lastRun.score||0)+', coins '+esc(detail.lastRun&&detail.lastRun.coinsAwarded||0)+', time '+esc(formatDuration(detail.lastRun&&detail.lastRun.timePlayedSeconds||0))+'.</div>';document.getElementById('player-coins-btn').onclick=editPlayerCoins;document.getElementById('player-mute-btn').onclick=togglePlayerMute;document.getElementById('player-ban-btn').onclick=togglePlayerBan;document.querySelectorAll('#admin-player-detail button[data-resource]').forEach(function(btn){btn.addEventListener('click',function(){editPlayerResource(btn.getAttribute('data-resource'),btn.getAttribute('data-mode'),btn.getAttribute('data-amount'));});});}
  function renderSupportReports(reports){var root=document.getElementById('admin-support-reports');if(!reports||!reports.length){root.innerHTML='<div class="nox-note">No support reports have been submitted yet.</div>';return;}root.innerHTML='<table><thead><tr><th>When</th><th>Player</th><th>Type</th><th>Status</th><th>Details</th></tr></thead><tbody>'+reports.map(function(report){var badgeClass=report.relayStatus==='delivered'?'nox-badge--ok':'nox-badge--warn';return '<tr><td>'+esc(report.createdAt)+'</td><td><strong>'+esc(report.username||'Pilot-07')+'</strong><br><span style=\"color:var(--muted)\">'+esc(report.authProvider||'guest')+'</span></td><td>'+esc(report.category||'bug')+' / '+esc(report.priority||'normal')+'</td><td><span class=\"nox-badge '+badgeClass+'\">'+esc(report.relayStatus||'queued')+'</span><br><span style=\"color:var(--muted)\">'+esc(report.relayMessage||'')+'</span></td><td>'+esc(report.description||'')+(report.hasScreenshot?'<br><span style=\"color:var(--muted)\">Screenshot attached</span>':'')+'</td></tr>';}).join('')+'</tbody></table>';}
  function renderAnalytics(data){var rows=data.days||[];var peak=1;rows.forEach(function(row){peak=Math.max(peak,row.dau,row.matchesPlayed,row.peakOnline);});document.getElementById('analytics-bars').innerHTML=rows.slice(-12).map(function(row){return '<div class="nox-bars__row"><div>'+esc(row.day)+'</div><div class="nox-bars__track"><div class="nox-bars__fill" style="width:'+Math.max(4,Math.round((row.dau/peak)*100))+'%"></div></div><div>'+esc(row.dau)+' DAU</div></div>';}).join('');var dau=rows.length?rows[rows.length-1].dau:0;document.getElementById('analytics-summary').innerHTML='<table><tbody><tr><th>Days Tracked</th><td>'+esc(rows.length)+'</td></tr><tr><th>DAU</th><td>'+esc(data.summary&&data.summary.dau||dau)+'</td></tr><tr><th>WAU</th><td>'+esc(data.summary&&data.summary.wau||0)+'</td></tr><tr><th>MAU</th><td>'+esc(data.summary&&data.summary.mau||0)+'</td></tr></tbody></table>';document.getElementById('analytics-table').innerHTML='<table><thead><tr><th>Day</th><th>DAU</th><th>New</th><th>Matches</th><th>Avg Session</th><th>Peak</th></tr></thead><tbody>'+rows.map(function(row){return '<tr><td>'+esc(row.day)+'</td><td>'+esc(row.dau)+'</td><td>'+esc(row.newUsers)+'</td><td>'+esc(row.matchesPlayed)+'</td><td>'+esc(formatDuration(row.averageSessionDurationSeconds))+'</td><td>'+esc(row.peakOnline)+'</td></tr>';}).join('')+'</tbody></table>';}
  function renderFlags(flags){state.featureFlags=flags||{};document.getElementById('admin-feature-flags').innerHTML=Object.keys(state.featureFlags).map(function(key){var label=key.replace(/([A-Z])/g,' $1').replace(/^./,function(char){return char.toUpperCase();});return '<label class="nox-flag"><span>'+esc(label)+'</span><input type="checkbox" data-flag="'+esc(key)+'" '+(state.featureFlags[key]?'checked':'')+'></label>';}).join('');}
  function renderLogs(logs){document.getElementById('admin-logs').innerHTML='<table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>IP</th></tr></thead><tbody>'+logs.map(function(log){return '<tr><td>'+esc(log.createdAt)+'</td><td>'+esc(log.actor)+'</td><td>'+esc(log.action)+'</td><td>'+esc(log.targetType+' / '+log.target)+'</td><td>'+esc(log.ip||'-')+'</td></tr>';}).join('')+'</tbody></table>';}
  async function loadOverview(){renderOverview(await api('/admin/api/overview'));}
  async function loadLiveOps(){renderLiveOps(await api('/admin/api/live-ops'));}
  async function searchPlayers(){var query=document.getElementById('admin-player-query').value.trim();var data=await api('/admin/api/players?query='+encodeURIComponent(query));renderPlayerResults(data.results||[]);}
  async function loadPlayerDetail(key){renderPlayerDetail(await api('/admin/api/players/'+encodeURIComponent(key)));}
  async function loadSupportReports(){renderSupportReports((await api('/admin/api/support/reports?limit=120')).reports||[]);}
  async function loadAnalytics(){renderAnalytics(await api('/admin/api/analytics'));}
  async function loadSettings(){renderFlags((await api('/admin/api/settings')).featureFlags||{});}
  async function loadLogs(){renderLogs((await api('/admin/api/logs?limit=120')).logs||[]);}
  async function refreshCurrent(){var active=document.querySelector('.nox-admin__section.is-active').getAttribute('data-section');setMessage('', 'Refreshing '+sectionMeta[active].title+'...');if(active==='overview')await loadOverview();if(active==='liveops')await loadLiveOps();if(active==='players')await searchPlayers();if(active==='support')await loadSupportReports();if(active==='analytics')await loadAnalytics();if(active==='settings')await loadSettings();if(active==='logs')await loadLogs();setMessage('success', sectionMeta[active].title+' refreshed.');}
  async function editPlayerCoins(){if(!state.currentPlayer)return;var next=prompt('Set coin balance for '+state.currentPlayer.name, String(state.currentPlayer.coins||0));if(next==null)return;if(!confirm('Apply the new coin balance to '+state.currentPlayer.name+'?'))return;try{await api('/admin/api/players/coins',{method:'POST',body:JSON.stringify({lookupKey:state.currentPlayer.lookupKey||state.currentPlayer.accountKey||state.currentPlayer.name,coins:Number(next)})});setMessage('success','Coins updated for '+state.currentPlayer.name+'.');await loadPlayerDetail(state.currentPlayer.lookupKey||state.currentPlayer.name);await loadOverview();await loadLogs();}catch(error){setMessage('error',error.message);}}
  async function editPlayerResource(resourceKey,mode,amount){if(!state.currentPlayer)return;var resourceLabel=resourceKey.charAt(0).toUpperCase()+resourceKey.slice(1),resolvedAmount=Number(amount||0);if(mode==='set'){var next=prompt('Set '+resourceLabel+' for '+state.currentPlayer.name, String(state.currentPlayer.resources&&state.currentPlayer.resources[resourceKey]||0));if(next==null)return;resolvedAmount=Number(next);}if(!confirm((mode==='set'?'Set ':'Adjust ')+resourceLabel+' for '+state.currentPlayer.name+'?'))return;try{await api('/admin/api/players/resources',{method:'POST',body:JSON.stringify({lookupKey:state.currentPlayer.lookupKey||state.currentPlayer.accountKey||state.currentPlayer.name,resourceKey:resourceKey,mode:mode||'set',amount:resolvedAmount})});setMessage('success',resourceLabel+' updated for '+state.currentPlayer.name+'.');await loadPlayerDetail(state.currentPlayer.lookupKey||state.currentPlayer.name);await loadLogs();}catch(error){setMessage('error',error.message);}}
  async function togglePlayerMute(){if(!state.currentPlayer)return;try{if(state.currentPlayer.moderation&&state.currentPlayer.moderation.mutedUntil){if(!confirm('Unmute '+state.currentPlayer.name+'?'))return;await api('/admin/api/players/unmute',{method:'POST',body:JSON.stringify({name:state.currentPlayer.name})});}else{if(!confirm('Mute '+state.currentPlayer.name+' for 30 minutes?'))return;await api('/admin/api/players/mute',{method:'POST',body:JSON.stringify({name:state.currentPlayer.name,minutes:30})});}setMessage('success','Moderation updated for '+state.currentPlayer.name+'.');await loadPlayerDetail(state.currentPlayer.lookupKey||state.currentPlayer.name);await loadLogs();}catch(error){setMessage('error',error.message);}}
  async function togglePlayerBan(){if(!state.currentPlayer)return;try{var nextState=!(state.currentPlayer.moderation&&state.currentPlayer.moderation.banned);if(!confirm((nextState?'Ban ':'Unban ')+state.currentPlayer.name+'?'))return;await api('/admin/api/players/ban',{method:'POST',body:JSON.stringify({name:state.currentPlayer.name,banned:nextState})});setMessage('success','Ban state updated for '+state.currentPlayer.name+'.');await loadPlayerDetail(state.currentPlayer.lookupKey||state.currentPlayer.name);await loadLogs();}catch(error){setMessage('error',error.message);}}
  async function saveFlags(){var payload={};document.querySelectorAll('#admin-feature-flags input[data-flag]').forEach(function(input){payload[input.getAttribute('data-flag')]=!!input.checked;});if(!confirm('Apply feature flag changes?'))return;try{var data=await api('/admin/api/settings/feature-flags',{method:'POST',body:JSON.stringify({featureFlags:payload})});renderFlags(data.featureFlags||payload);setMessage('success','Feature flags saved.');await loadLiveOps();await loadLogs();}catch(error){setMessage('error',error.message);}}
  async function saveLiveOps(){var payload={runtimeSettings:{botTarget:Number(document.getElementById('admin-liveops-botTarget').value),mapSpikes:Number(document.getElementById('admin-liveops-mapSpikes').value),foodTarget:Number(document.getElementById('admin-liveops-foodTarget').value),foodSpawnAmount:Number(document.getElementById('admin-liveops-foodSpawnAmount').value),playerCap:Number(document.getElementById('admin-liveops-playerCap').value)}};if(!confirm('Apply these live runtime settings?'))return;try{await api('/admin/api/live-ops/runtime',{method:'POST',body:JSON.stringify(payload)});renderLiveOps(await api('/admin/api/live-ops'));setMessage('success','Runtime settings applied live.');await loadLogs();}catch(error){setMessage('error',error.message);}}
  async function sendBroadcast(){var message=document.getElementById('admin-broadcast-message').value.trim();if(!message){setMessage('error','Write a message before sending.');return;}if(!confirm('Broadcast this message to active players?'))return;try{await api('/admin/api/live-ops/broadcast',{method:'POST',body:JSON.stringify({message:message})});document.getElementById('admin-broadcast-message').value='';setMessage('success','Broadcast sent.');await loadLogs();}catch(error){setMessage('error',error.message);}}
  async function boot(){try{var sessionData=await api('/admin/api/session');if(!sessionData.authenticated){window.location.href='/admin/login';return;}state.session=sessionData;state.csrf=sessionData.csrfToken||'';document.getElementById('admin-user-chip').textContent=sessionData.username+' · '+sessionData.role;document.querySelectorAll('#admin-nav button').forEach(function(button){button.addEventListener('click',function(){setSection(button.getAttribute('data-section'));});});document.getElementById('admin-refresh-btn').addEventListener('click',refreshCurrent);document.getElementById('admin-player-search-btn').addEventListener('click',searchPlayers);document.getElementById('admin-save-flags-btn').addEventListener('click',saveFlags);document.getElementById('admin-save-liveops-btn').addEventListener('click',saveLiveOps);document.getElementById('admin-broadcast-btn').addEventListener('click',sendBroadcast);document.getElementById('admin-logout-btn').addEventListener('click',async function(){await api('/admin/api/logout',{method:'POST'}).catch(function(){});window.location.href='/admin/login';});await Promise.all([loadOverview(),loadLiveOps(),searchPlayers(),loadSupportReports(),loadAnalytics(),loadSettings(),loadLogs()]);setMessage('success','Admin panel ready.');}catch(error){setMessage('error',error.message||'Admin panel failed to load.');}}
  boot();
})();
</script>
</body>
</html>`;
}

module.exports = {
    renderLoginPage,
    renderPanelPage
};
