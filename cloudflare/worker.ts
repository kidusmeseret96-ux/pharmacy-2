// YOYA Pharmacy — Standalone Cloudflare Worker + D1 Vendor & Anti-Sharing Portal
// Deploy with: wrangler deploy

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface Env {
  DB: D1Database;
  VENDOR_ADMIN_PASSCODE?: string;
  VENDOR_TOKEN_SECRET?: string;
  VENDOR_SYNC_SECRET?: string;
}

type LicenseStatus = 'active' | 'revoked' | 'banned';

interface VendorFeatureLocks {
  disablePos?: boolean;
  disableInventoryWrite?: boolean;
  disableExports?: boolean;
}

interface VendorTrackedAccount {
  id: string;
  name: string;
  username: string;
  role: 'owner' | 'manager' | 'seller';
  active: boolean;
  vendorBlocked: boolean;
  lastLoginAt?: string;
}

interface InstallationRow {
  installation_id: string;
  clinic_name: string;
  owner_name: string;
  owner_claimed: number;
  total_accounts_created: number;
  total_workers: number;
  active_workers: number;
  managers_count: number;
  sellers_count: number;
  drugs_count: number;
  transactions_count: number;
  seen_origins_json: string;
  seen_hosts_json: string;
  machine_fingerprints_json: string;
  ip_hashes_json: string;
  sharing_suspected: number;
  sharing_reasons_json: string;
  accounts_json?: string;
  blocked_accounts_json?: string;
  feature_locks_json?: string;
  license_status: LicenseStatus;
  license_reason: string;
  first_seen_at: string;
  last_seen_at: string;
}

const DEFAULT_VENDOR_PASSCODE = '0945206759';
let schemaEnsured = false;

async function ensureExtendedSchema(db: D1Database): Promise<void> {
  if (schemaEnsured) return;
  const alterStatements = [
    "ALTER TABLE vendor_installations ADD COLUMN accounts_json TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE vendor_installations ADD COLUMN blocked_accounts_json TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE vendor_installations ADD COLUMN feature_locks_json TEXT NOT NULL DEFAULT '{}'",
  ];
  for (const sql of alterStatements) {
    try {
      await db.prepare(sql).run();
    } catch {
      // Column already exists on D1 table
    }
  }
  schemaEnsured = true;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-vendor-sync-secret',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  });
}

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function parseAccounts(raw: string | undefined, blockedIds: string[]): VendorTrackedAccount[] {
  if (!raw) return [];
  const blockedSet = new Set(blockedIds);
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is VendorTrackedAccount => Boolean(x && typeof x.id === 'string' && typeof x.username === 'string'))
      .map((a) => ({
        id: a.id,
        name: String(a.name || a.username),
        username: String(a.username),
        role: a.role === 'owner' || a.role === 'manager' ? a.role : 'seller',
        active: Boolean(a.active),
        vendorBlocked: blockedSet.has(a.id),
        lastLoginAt: typeof a.lastLoginAt === 'string' ? a.lastLoginAt : undefined,
      }));
  } catch {
    return [];
  }
}

function parseFeatureLocks(raw: string | undefined): VendorFeatureLocks {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return {
      disablePos: Boolean(obj?.disablePos),
      disableInventoryWrite: Boolean(obj?.disableInventoryWrite),
      disableExports: Boolean(obj?.disableExports),
    };
  } catch {
    return {};
  }
}

function mergeList(existing: string[], incoming: string[], cap = 25): string[] {
  const merged = [...existing];
  for (const item of incoming) {
    const clean = String(item || '').trim();
    if (clean && !merged.includes(clean)) {
      merged.push(clean);
    }
  }
  return merged.slice(-cap);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

async function issueToken(secret: string): Promise<string> {
  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const payload = `vendor:${exp}`;
  const sig = await hmacSign(secret, payload);
  return `${payload}.${sig}`;
}

async function verifyToken(token: string | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload.startsWith('vendor:')) return false;
  const exp = Number(payload.slice('vendor:'.length));
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await hmacSign(secret, payload);
  return constantTimeEqual(sig, expected);
}

function formatSummary(row: InstallationRow) {
  const blockedAccountIds = parseList(row.blocked_accounts_json);
  return {
    installationId: row.installation_id,
    clinicName: row.clinic_name,
    ownerName: row.owner_name,
    ownerClaimed: Boolean(row.owner_claimed),
    totalAccountsCreated: row.total_accounts_created,
    totalWorkers: row.total_workers,
    activeWorkers: row.active_workers,
    managersCount: row.managers_count,
    sellersCount: row.sellers_count,
    drugsCount: row.drugs_count,
    transactionsCount: row.transactions_count,
    seenOrigins: parseList(row.seen_origins_json),
    seenHosts: parseList(row.seen_hosts_json),
    machineFingerprints: parseList(row.machine_fingerprints_json),
    ipHashes: parseList(row.ip_hashes_json),
    sharingSuspected: Boolean(row.sharing_suspected),
    sharingReasons: parseList(row.sharing_reasons_json),
    accounts: parseAccounts(row.accounts_json, blockedAccountIds),
    blockedAccountIds,
    featureLocks: parseFeatureLocks(row.feature_locks_json),
    licenseStatus: row.license_status,
    licenseReason: row.license_reason,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  };
}

function renderDashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YOYA Developer License & Anti-Sharing Portal</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at top left, #0d2149, #050a18 65%); color: #f0f6ff; }
    .wrap { max-width: 1180px; margin: 0 auto; padding: 24px 16px 48px; }
    .card { background: rgba(15, 23, 42, 0.78); backdrop-filter: blur(18px); border: 1px solid rgba(56, 189, 248, 0.16); border-radius: 22px; padding: 20px; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 18px 0; }
    .kpi { background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(148, 163, 184, 0.14); border-radius: 18px; padding: 14px 16px; }
    .kpi small { color: #94a3b8; display: block; font-size: 12px; }
    .kpi strong { font-size: 24px; display: block; margin-top: 4px; font-variant-numeric: tabular-nums; }
    .list { display: grid; gap: 14px; }
    .row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .btn { border: 0; border-radius: 12px; padding: 8px 13px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .btn-primary { background: #1464f6; color: #fff; }
    .btn-warn { background: #d97706; color: #fff; }
    .btn-danger { background: #dc2626; color: #fff; }
    .btn-ok { background: #059669; color: #fff; }
    .btn-muted { background: rgba(148, 163, 184, 0.16); color: #e2e8f0; }
    input[type=password], input[type=text] { width: 100%; padding: 11px 14px; border-radius: 14px; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(2, 6, 23, 0.7); color: #fff; font-size: 14px; }
    .tag { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .tag-active { background: rgba(16, 185, 129, 0.18); color: #34d399; }
    .tag-revoked { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .tag-banned { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .alert { margin-top: 10px; padding: 10px 12px; border-radius: 14px; background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.3); font-size: 12px; color: #fecaca; }
    .meta { font-size: 12px; color: #94a3b8; line-height: 1.6; margin-top: 8px; }
    .panel { margin-top: 12px; padding: 12px 14px; border-radius: 16px; background: rgba(2, 6, 23, 0.45); border: 1px solid rgba(148, 163, 184, 0.16); }
    .acct-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(148, 163, 184, 0.12); font-size: 12px; }
    .acct-row:last-child { border-bottom: 0; padding-bottom: 0; }
    .locks { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="wrap">
    <div id="loginView" class="card" style="max-width:420px;margin:60px auto;">
      <h2 style="margin:0 0 6px;">Developer License Portal</h2>
      <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Monitor pharmacy accounts, workers, sharing flags, individual user blocks, and feature locks.</p>
      <form id="loginForm" style="display:grid;gap:12px;">
        <input id="passcode" type="password" placeholder="Enter Developer Passcode" required />
        <div id="loginError" style="color:#f87171;font-size:12px;display:none;"></div>
        <button class="btn btn-primary" type="submit">Sign In to Console</button>
      </form>
    </div>

    <div id="dashView" style="display:none;">
      <div class="row" style="align-items:center;margin-bottom:14px;">
        <div>
          <h1 style="margin:0;font-size:22px;">YOYA License & Anti-Sharing Control</h1>
          <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">Cloudflare D1 Global Telemetry & User Control</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="refreshBtn" class="btn btn-muted" type="button">Refresh</button>
          <button id="logoutBtn" class="btn btn-muted" type="button">Lock</button>
        </div>
      </div>

      <div id="kpis" class="kpis"></div>
      <div id="installList" class="list"></div>
    </div>
  </div>

  <script>
    let token = '';
    const loginView = document.getElementById('loginView');
    const dashView = document.getElementById('dashView');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const kpisEl = document.getElementById('kpis');
    const listEl = document.getElementById('installList');

    async function api(path, opts = {}) {
      const headers = new Headers(opts.headers || {});
      if (opts.body) headers.set('Content-Type', 'application/json');
      if (token) headers.set('Authorization', 'Bearer ' + token);
      const res = await fetch(path, { ...opts, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    }

    async function loadData() {
      const { installations } = await api('/api/vendor/installations');
      const totalAccounts = installations.reduce((s, x) => s + x.totalAccountsCreated, 0);
      const totalWorkers = installations.reduce((s, x) => s + x.totalWorkers, 0);
      const sharingAlerts = installations.filter((x) => x.sharingSuspected).length;
      const blocked = installations.filter((x) => x.licenseStatus !== 'active').length;

      kpisEl.innerHTML = [
        ['Installations', installations.length],
        ['Accounts Created', totalAccounts],
        ['Total Workers', totalWorkers],
        ['Sharing Flags', sharingAlerts],
        ['Revoked / Banned', blocked],
      ].map(([label, val]) => '<div class="kpi"><small>' + label + '</small><strong>' + val + '</strong></div>').join('');

      if (installations.length === 0) {
        listEl.innerHTML = '<div class="card"><p style="margin:0;color:#94a3b8;">No pharmacy telemetry received yet.</p></div>';
        return;
      }

      listEl.innerHTML = installations.map((inst) => {
        const tagClass = inst.licenseStatus === 'banned' ? 'tag-banned' : inst.licenseStatus === 'revoked' ? 'tag-revoked' : 'tag-active';
        const reasons = inst.sharingReasons && inst.sharingReasons.length
          ? '<div class="alert"><strong>Sharing Alert:</strong> ' + inst.sharingReasons.join(' | ') + '</div>' : '';
        const locks = inst.featureLocks || {};
        const accounts = Array.isArray(inst.accounts) ? inst.accounts : [];
        const acctHtml = accounts.length === 0
          ? '<p style="margin:0;font-size:12px;color:#94a3b8;">No account list reported yet.</p>'
          : accounts.map((acct) => {
              const blocked = Boolean(acct.vendorBlocked);
              return '<div class="acct-row">' +
                '<div>' +
                  '<strong>' + escapeHtml(acct.name) + '</strong> ' +
                  '<code>@' + escapeHtml(acct.username) + '</code> ' +
                  '<span class="tag ' + (blocked ? 'tag-banned' : 'tag-active') + '">' +
                    escapeHtml(acct.role) + (blocked ? ' · SUSPENDED' : '') +
                  '</span>' +
                '</div>' +
                '<button class="btn ' + (blocked ? 'btn-ok' : 'btn-danger') + '" onclick="toggleUser(\\'' + inst.installationId + '\\', \\'' + acct.id + '\\', ' + (!blocked) + ')">' +
                  (blocked ? 'Restore User' : 'Suspend User') +
                '</button>' +
              '</div>';
            }).join('');

        return '<div class="card">' +
          '<div class="row">' +
            '<div style="flex:1;min-width:260px;">' +
              '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
                '<strong style="font-size:16px;">' + escapeHtml(inst.clinicName) + '</strong>' +
                '<span class="tag ' + tagClass + '">' + inst.licenseStatus + '</span>' +
              '</div>' +
              '<div class="meta">' +
                'Owner: <strong>' + escapeHtml(inst.ownerName) + '</strong> · Owner Claimed: ' + (inst.ownerClaimed ? 'Yes' : 'No') + '<br/>' +
                'Accounts: <strong>' + inst.totalAccountsCreated + '</strong> · Workers: <strong>' + inst.totalWorkers + '</strong> (' + inst.managersCount + ' managers, ' + inst.sellersCount + ' sellers, ' + inst.activeWorkers + ' active)<br/>' +
                'Medicines: ' + inst.drugsCount + ' · Sales: ' + inst.transactionsCount + '<br/>' +
                'Hosts: <code>' + escapeHtml((inst.seenHosts || []).join(', ') || '—') + '</code><br/>' +
                'Origins: <code>' + escapeHtml((inst.seenOrigins || []).join(', ') || '—') + '</code><br/>' +
                'Machine IDs: <code>' + (inst.machineFingerprints || []).length + '</code> · Distinct IPs: <code>' + (inst.ipHashes || []).length + '</code> · ID: <code>' + escapeHtml(inst.installationId) + '</code>' +
              '</div>' +
              reasons +
              '<div class="panel">' +
                '<strong style="font-size:12px;">Feature Restrictions</strong>' +
                '<div class="locks">' +
                  '<button class="btn ' + (locks.disablePos ? 'btn-danger' : 'btn-muted') + '" onclick="toggleLock(\\'' + inst.installationId + '\\', \\'disablePos\\', ' + (!locks.disablePos) + ')">' + (locks.disablePos ? 'POS Locked' : 'Lock POS') + '</button>' +
                  '<button class="btn ' + (locks.disableInventoryWrite ? 'btn-warn' : 'btn-muted') + '" onclick="toggleLock(\\'' + inst.installationId + '\\', \\'disableInventoryWrite\\', ' + (!locks.disableInventoryWrite) + ')">' + (locks.disableInventoryWrite ? 'Inventory Edits Locked' : 'Lock Inventory Edits') + '</button>' +
                  '<button class="btn ' + (locks.disableExports ? 'btn-warn' : 'btn-muted') + '" onclick="toggleLock(\\'' + inst.installationId + '\\', \\'disableExports\\', ' + (!locks.disableExports) + ')">' + (locks.disableExports ? 'Exports Locked' : 'Lock Exports') + '</button>' +
                '</div>' +
              '</div>' +
              '<div class="panel">' +
                '<strong style="font-size:12px;display:block;margin-bottom:4px;">Individual Accounts (' + accounts.length + ')</strong>' +
                acctHtml +
              '</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
              '<button class="btn btn-warn" onclick="setStatus(\\'' + inst.installationId + '\\', \\'revoked\\')">Revoke Access</button>' +
              '<button class="btn btn-danger" onclick="setStatus(\\'' + inst.installationId + '\\', \\'banned\\')">Ban Account</button>' +
              '<button class="btn btn-ok" onclick="setStatus(\\'' + inst.installationId + '\\', \\'active\\')">Restore</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    }

    window.setStatus = async (id, status) => {
      const reason = status === 'active' ? '' : (prompt('Optional reason for ' + status + ':', '') || '');
      await api('/api/vendor/installations/' + encodeURIComponent(id) + '/status', {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      });
      await loadData();
    };

    window.toggleUser = async (id, acctId, block) => {
      await api('/api/vendor/installations/' + encodeURIComponent(id) + '/controls', {
        method: 'POST',
        body: JSON.stringify({ toggleAccountId: acctId, accountBlocked: block }),
      });
      await loadData();
    };

    window.toggleLock = async (id, key, nextVal) => {
      const featureLocks = {};
      featureLocks[key] = nextVal;
      await api('/api/vendor/installations/' + encodeURIComponent(id) + '/controls', {
        method: 'POST',
        body: JSON.stringify({ featureLocks }),
      });
      await loadData();
    };

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';
      try {
        const res = await api('/api/vendor/login', {
          method: 'POST',
          body: JSON.stringify({ passcode: document.getElementById('passcode').value }),
        });
        token = res.token;
        loginView.style.display = 'none';
        dashView.style.display = 'block';
        await loadData();
      } catch (err) {
        loginError.textContent = err.message;
        loginError.style.display = 'block';
      }
    });

    document.getElementById('refreshBtn').addEventListener('click', loadData);
    document.getElementById('logoutBtn').addEventListener('click', () => {
      token = '';
      dashView.style.display = 'none';
      loginView.style.display = 'block';
    });
  </script>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-vendor-sync-secret',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
      });
    }

    await ensureExtendedSchema(env.DB);

    const url = new URL(request.url);
    const tokenSecret = env.VENDOR_TOKEN_SECRET || env.VENDOR_ADMIN_PASSCODE || DEFAULT_VENDOR_PASSCODE;

    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(renderDashboardHtml(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/vendor/login') {
      const body = (await request.json().catch(() => ({}))) as { passcode?: string };
      const expected = (env.VENDOR_ADMIN_PASSCODE || DEFAULT_VENDOR_PASSCODE).trim();
      if (!body.passcode || !constantTimeEqual(String(body.passcode).trim(), expected)) {
        return json({ error: 'Invalid developer passcode.' }, 401);
      }
      const token = await issueToken(tokenSecret);
      return json({ token });
    }

    if (request.method === 'GET' && url.pathname === '/api/vendor/installations') {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      if (!(await verifyToken(token, tokenSecret))) {
        return json({ error: 'Vendor authorization required.' }, 401);
      }
      const res = await env.DB.prepare(
        'SELECT * FROM vendor_installations ORDER BY last_seen_at DESC'
      ).all<InstallationRow>();
      return json({ installations: (res.results ?? []).map(formatSummary) });
    }

    const statusMatch = url.pathname.match(/^\/api\/vendor\/installations\/([^/]+)\/status$/);
    if (request.method === 'POST' && statusMatch) {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      if (!(await verifyToken(token, tokenSecret))) {
        return json({ error: 'Vendor authorization required.' }, 401);
      }
      const installationId = decodeURIComponent(statusMatch[1]);
      const body = (await request.json().catch(() => ({}))) as {
        status?: LicenseStatus;
        reason?: string;
      };
      if (body.status !== 'active' && body.status !== 'revoked' && body.status !== 'banned') {
        return json({ error: 'Invalid license status.' }, 400);
      }
      await env.DB.prepare(
        'UPDATE vendor_installations SET license_status = ?, license_reason = ? WHERE installation_id = ?'
      )
        .bind(body.status, String(body.reason || '').trim(), installationId)
        .run();

      const updated = await env.DB.prepare(
        'SELECT * FROM vendor_installations WHERE installation_id = ?'
      )
        .bind(installationId)
        .first<InstallationRow>();
      if (!updated) {
        return json({ error: 'Installation not found.' }, 404);
      }
      return json({ installation: formatSummary(updated) });
    }

    const controlsMatch = url.pathname.match(/^\/api\/vendor\/installations\/([^/]+)\/controls$/);
    if (request.method === 'POST' && controlsMatch) {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      if (!(await verifyToken(token, tokenSecret))) {
        return json({ error: 'Vendor authorization required.' }, 401);
      }
      const installationId = decodeURIComponent(controlsMatch[1]);
      const existing = await env.DB.prepare(
        'SELECT * FROM vendor_installations WHERE installation_id = ?'
      )
        .bind(installationId)
        .first<InstallationRow>();
      if (!existing) {
        return json({ error: 'Installation not found.' }, 404);
      }

      const body = (await request.json().catch(() => ({}))) as {
        blockedAccountIds?: string[];
        toggleAccountId?: string;
        accountBlocked?: boolean;
        featureLocks?: VendorFeatureLocks;
      };

      let nextBlocked = parseList(existing.blocked_accounts_json);
      if (Array.isArray(body.blockedAccountIds)) {
        nextBlocked = Array.from(
          new Set(body.blockedAccountIds.filter((x): x is string => typeof x === 'string' && x.trim().length > 0))
        );
      }
      if (typeof body.toggleAccountId === 'string' && body.toggleAccountId.trim()) {
        const acctId = body.toggleAccountId.trim();
        const shouldBlock =
          typeof body.accountBlocked === 'boolean' ? body.accountBlocked : !nextBlocked.includes(acctId);
        if (shouldBlock) {
          if (!nextBlocked.includes(acctId)) nextBlocked.push(acctId);
        } else {
          nextBlocked = nextBlocked.filter((id) => id !== acctId);
        }
      }

      const prevLocks = parseFeatureLocks(existing.feature_locks_json);
      const nextLocks: VendorFeatureLocks = body.featureLocks
        ? {
            disablePos:
              typeof body.featureLocks.disablePos === 'boolean'
                ? body.featureLocks.disablePos
                : Boolean(prevLocks.disablePos),
            disableInventoryWrite:
              typeof body.featureLocks.disableInventoryWrite === 'boolean'
                ? body.featureLocks.disableInventoryWrite
                : Boolean(prevLocks.disableInventoryWrite),
            disableExports:
              typeof body.featureLocks.disableExports === 'boolean'
                ? body.featureLocks.disableExports
                : Boolean(prevLocks.disableExports),
          }
        : prevLocks;

      await env.DB.prepare(
        'UPDATE vendor_installations SET blocked_accounts_json = ?, feature_locks_json = ? WHERE installation_id = ?'
      )
        .bind(JSON.stringify(nextBlocked), JSON.stringify(nextLocks), installationId)
        .run();

      const updated = await env.DB.prepare(
        'SELECT * FROM vendor_installations WHERE installation_id = ?'
      )
        .bind(installationId)
        .first<InstallationRow>();
      return json({ installation: formatSummary(updated!) });
    }

    if (request.method === 'POST' && url.pathname === '/api/vendor/telemetry') {
      if (env.VENDOR_SYNC_SECRET) {
        const provided = request.headers.get('x-vendor-sync-secret') || '';
        if (!constantTimeEqual(provided, env.VENDOR_SYNC_SECRET)) {
          return json({ error: 'Invalid telemetry sync secret.' }, 401);
        }
      }

      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const installationId = String(body.installationId || '').trim();
      if (!installationId) {
        return json({ error: 'installationId is required.' }, 400);
      }

      const existing = await env.DB.prepare(
        'SELECT * FROM vendor_installations WHERE installation_id = ?'
      )
        .bind(installationId)
        .first<InstallationRow>();

      const seenOrigins = mergeList(
        parseList(existing?.seen_origins_json),
        Array.isArray(body.seenOrigins) ? (body.seenOrigins as string[]) : []
      );
      const seenHosts = mergeList(
        parseList(existing?.seen_hosts_json),
        Array.isArray(body.seenHosts) ? (body.seenHosts as string[]) : []
      );
      const machineFingerprints = mergeList(
        parseList(existing?.machine_fingerprints_json),
        Array.isArray(body.seenFingerprints)
          ? (body.seenFingerprints as string[])
          : Array.isArray(body.machineFingerprints)
            ? (body.machineFingerprints as string[])
            : []
      );
      const ipHashes = mergeList(
        parseList(existing?.ip_hashes_json),
        Array.isArray(body.ipHashes) ? (body.ipHashes as string[]) : []
      );

      const reasons: string[] = [];
      if (machineFingerprints.length > 1) {
        reasons.push(`Detected on ${machineFingerprints.length} separate server machines/containers`);
      }
      if (seenHosts.length > 2) {
        reasons.push(`Accessed from ${seenHosts.length} different host domains`);
      }
      if (seenOrigins.length > 2) {
        reasons.push(`Accessed from ${seenOrigins.length} distinct deployment URLs`);
      }
      if (ipHashes.length > 6) {
        reasons.push(`Unusual spread across ${ipHashes.length} distinct public IP networks`);
      }

      const now = new Date().toISOString();
      const licenseStatus: LicenseStatus = existing?.license_status ?? 'active';
      const licenseReason = existing?.license_reason ?? '';
      const blockedAccountIds = parseList(existing?.blocked_accounts_json);
      const featureLocks = parseFeatureLocks(existing?.feature_locks_json);
      const incomingAccounts = Array.isArray(body.accounts)
        ? parseAccounts(JSON.stringify(body.accounts), blockedAccountIds)
        : parseAccounts(existing?.accounts_json, blockedAccountIds);

      await env.DB.prepare(
        `INSERT INTO vendor_installations (
          installation_id, clinic_name, owner_name, owner_claimed,
          total_accounts_created, total_workers, active_workers,
          managers_count, sellers_count, drugs_count, transactions_count,
          seen_origins_json, seen_hosts_json, machine_fingerprints_json, ip_hashes_json,
          sharing_suspected, sharing_reasons_json, accounts_json, blocked_accounts_json, feature_locks_json,
          license_status, license_reason, first_seen_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(installation_id) DO UPDATE SET
          clinic_name = excluded.clinic_name,
          owner_name = excluded.owner_name,
          owner_claimed = excluded.owner_claimed,
          total_accounts_created = excluded.total_accounts_created,
          total_workers = excluded.total_workers,
          active_workers = excluded.active_workers,
          managers_count = excluded.managers_count,
          sellers_count = excluded.sellers_count,
          drugs_count = excluded.drugs_count,
          transactions_count = excluded.transactions_count,
          seen_origins_json = excluded.seen_origins_json,
          seen_hosts_json = excluded.seen_hosts_json,
          machine_fingerprints_json = excluded.machine_fingerprints_json,
          ip_hashes_json = excluded.ip_hashes_json,
          sharing_suspected = excluded.sharing_suspected,
          sharing_reasons_json = excluded.sharing_reasons_json,
          accounts_json = excluded.accounts_json,
          last_seen_at = excluded.last_seen_at`
      )
        .bind(
          installationId,
          String(body.clinicName || 'YOYA Pharmacy'),
          String(body.ownerName || 'Pharmacy Owner'),
          body.ownerClaimed ? 1 : 0,
          Number(body.totalAccountsCount ?? body.totalAccountsCreated ?? 0),
          Number(body.workersCount ?? body.totalWorkers ?? 0),
          Number(body.activeWorkersCount ?? body.activeWorkers ?? 0),
          Number(body.managersCount ?? 0),
          Number(body.sellersCount ?? 0),
          Number(body.drugsCount ?? 0),
          Number(body.transactionsCount ?? 0),
          JSON.stringify(seenOrigins),
          JSON.stringify(seenHosts),
          JSON.stringify(machineFingerprints),
          JSON.stringify(ipHashes),
          reasons.length > 0 ? 1 : 0,
          JSON.stringify(reasons),
          JSON.stringify(incomingAccounts),
          JSON.stringify(blockedAccountIds),
          JSON.stringify(featureLocks),
          licenseStatus,
          licenseReason,
          existing?.first_seen_at ?? now,
          now
        )
        .run();

      return json({
        installationId,
        status: licenseStatus,
        reason: licenseReason,
        blockedAccountIds,
        featureLocks,
      });
    }

    return json({ error: 'Not found.' }, 404);
  },
};
