'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PORT = Number(process.env.VENOM_CLIENT_EXPLORER_PORT || 8765);
const HOST = process.env.VENOM_CLIENT_EXPLORER_BIND || '0.0.0.0';
const DISPLAY_HOST = process.env.VENOM_CLIENT_EXPLORER_ADDRESS || '192.168.0.80';

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function normalizePath(p) {
  if (!p) return '';
  let v = String(p).trim();
  if (v === '__NETWORK__') return '__NETWORK__';
  return v.replace(/^"|"$/g, '');
}

function isWindows() {
  return process.platform === 'win32';
}

function getDrives() {
  if (!isWindows()) return [];
  try {
    const out = execFileSync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      '[System.IO.DriveInfo]::GetDrives() | Where-Object {$_.IsReady} | ForEach-Object { $_.Name }'
    ], { encoding: 'utf8', windowsHide: true });
    return out.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(d => ({
      name: d,
      path: d,
      kind: 'drive'
    }));
  } catch {
    return [];
  }
}

function getNetworkHosts() {
  if (!isWindows()) return [];
  try {
    const out = execFileSync('cmd.exe', ['/c', 'net', 'view'], {
      encoding: 'utf8',
      windowsHide: true
    });
    const rows = [];
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^\\\\([^\s\\]+)\s+/);
      if (m) rows.push({ name: m[1], path: `\\\\${m[1]}`, kind: 'network-host' });
    }
    return rows;
  } catch {
    return [];
  }
}

function roots() {
  return [
    { name: '🌐 الشبكة', path: '__NETWORK__', kind: 'network' },
    { name: '💻 هذا الكمبيوتر', path: '__THIS_PC__', kind: 'pc' },
    ...getDrives()
  ];
}

function listDirectory(dir) {
  const result = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'System Volume Information' || e.name === '$RECYCLE.BIN') continue;
    const full = path.join(dir, e.name);
    let st;
    try { st = fs.statSync(full); } catch { continue; }
    result.push({
      name: e.name,
      path: full,
      isDir: st.isDirectory(),
      kind: st.isDirectory() ? 'folder' : 'file'
    });
  }
  result.sort((a,b) => (a.isDir !== b.isDir) ? (a.isDir ? -1 : 1) : a.name.localeCompare(b.name, 'ar', {numeric:true, sensitivity:'base'}));
  return result;
}

function browse(p) {
  p = normalizePath(p);
  if (p === '__THIS_PC__') {
    return { success: true, path: p, name: 'هذا الكمبيوتر', items: getDrives(), virtual: 'pc' };
  }
  if (p === '__NETWORK__') {
    const hosts = getNetworkHosts();
    return { success: true, path: p, name: 'الشبكة', items: hosts, virtual: 'network' };
  }
  if (!p) return { success: false, error: 'المسار غير محدد' };
  if (!fs.existsSync(p)) return { success: false, error: 'المسار غير موجود على جهاز المستخدم' };
  const st = fs.statSync(p);
  if (!st.isDirectory()) return { success: false, error: 'المسار ليس مجلدًا' };
  return { success: true, path: p, name: path.basename(p) || p, items: listDirectory(p) };
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://${DISPLAY_HOST}:${PORT}`);
  if (url.pathname === '/health') return json(res, 200, { success: true, service: 'VENOM Client Explorer', port: PORT });
  if (req.method === 'GET' && url.pathname === '/roots') return json(res, 200, { success: true, roots: roots() });
  if (req.method === 'POST' && url.pathname === '/browse') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      try {
        const body = JSON.parse(raw || '{}');
        const out = browse(body.path);
        json(res, out.success ? 200 : 400, out);
      } catch (e) {
        json(res, 400, { success: false, error: e.message });
      }
    });
    return;
  }
  json(res, 404, { success: false, error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`✅ VENOM Client Explorer: http://${DISPLAY_HOST}:${PORT}`);
  console.log(`   Binding: ${HOST}:${PORT}`);
});
