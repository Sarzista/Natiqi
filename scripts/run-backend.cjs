/**
 * Start Flask from backend/
 * - Probes real Python (not Windows Store stub).
 * - On Windows, also scans %LocalAppData%\Python\bin and Programs\Python\ (PATH is often stale in IDE terminals).
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..', 'backend');
const win = process.platform === 'win32';

function isRealPython(cmd, prefixArgs) {
  const absolute = path.isAbsolute(cmd);
  // Probe for both "real python" and required runtime deps for this project.
  const probe =
    'import sys\n' +
    'import flask\n' +
    'import numpy\n' +
    'import scipy\n' +
    'import sklearn\n' +
    'import joblib\n' +
    'sys.exit(0)\n';
  const r = spawnSync(cmd, [...prefixArgs, '-c', probe], {
    cwd: backendDir,
    stdio: 'ignore',
    shell: win && !absolute,
    windowsHide: true,
  });
  return r.status === 0;
}

function hasOpenpyxl(cmd, prefixArgs) {
  const absolute = path.isAbsolute(cmd);
  const probe = 'import sys\nimport openpyxl\nsys.exit(0)\n';
  const r = spawnSync(cmd, [...prefixArgs, '-c', probe], {
    cwd: backendDir,
    stdio: 'ignore',
    shell: win && !absolute,
    windowsHide: true,
  });
  return r.status === 0;
}

function pickFromEnv() {
  const v = process.env.PYTHON || process.env.PYTHON3;
  if (!v || !v.trim()) return null;
  const exe = v.trim();
  if (!isRealPython(exe, [])) return null;
  return { cmd: exe, args: ['app.py'] };
}

function windowsPythonFromCommonDirs() {
  const la = process.env.LOCALAPPDATA;
  if (!la) return null;

  const candidates = [];

  const binDir = path.join(la, 'Python', 'bin');
  if (fs.existsSync(binDir)) {
    try {
      for (const f of fs.readdirSync(binDir)) {
        if (!/\.exe$/i.test(f)) continue;
        if (/^python/i.test(f)) candidates.push(path.join(binDir, f));
      }
    } catch {
      /* ignore */
    }
  }

  const programsPython = path.join(la, 'Programs', 'Python');
  if (fs.existsSync(programsPython)) {
    try {
      for (const dir of fs.readdirSync(programsPython)) {
        const exe = path.join(programsPython, dir, 'python.exe');
        if (fs.existsSync(exe)) candidates.push(exe);
      }
    } catch {
      /* ignore */
    }
  }

  for (const exe of candidates) {
    if (isRealPython(exe, [])) return { cmd: exe, args: ['app.py'] };
  }
  return null;
}

function pickPython() {
  const fromEnv = pickFromEnv();
  if (fromEnv) return fromEnv;

  const attempts = win
    ? [
        { cmd: 'python', args: ['app.py'], probePrefix: [] },
        { cmd: 'py', args: ['-3', 'app.py'], probePrefix: ['-3'] },
        { cmd: 'python3', args: ['app.py'], probePrefix: [] },
      ]
    : [
        { cmd: 'python3', args: ['app.py'], probePrefix: [] },
        { cmd: 'python', args: ['app.py'], probePrefix: [] },
      ];

  for (const a of attempts) {
    if (isRealPython(a.cmd, a.probePrefix)) {
      return { cmd: a.cmd, args: a.args };
    }
  }

  if (win) {
    const found = windowsPythonFromCommonDirs();
    if (found) {
      console.error('[api] Using Python from install folder (PATH did not expose it). Restart the terminal later so PATH is picked up.\n');
      return found;
    }
  }

  return null;
}

const chosen = pickPython();
if (!chosen) {
  console.error(
    '\n[api] No working Python 3 found.\n\n' +
      '  Windows: The "python" in PATH is often a Microsoft Store stub.\n' +
      '    • Install Python from https://www.python.org/downloads/ and check "Add python.exe to PATH".\n' +
      '    • Or: Settings → Apps → App execution aliases → turn OFF python.exe / python3.exe.\n' +
      '    • Or set PYTHON to your real exe, e.g. set PYTHON=%LocalAppData%\\Programs\\Python\\Python314\\python.exe\n' +
      '    • After installing Python: fully quit and restart Cursor/VS Code so npm sees the new PATH.\n\n' +
      '  Then install API deps:\n' +
      '    cd backend\n' +
      '    pip install flask flask-sqlalchemy flask-cors werkzeug openpyxl\n\n' +
      '  If [api] exits but Expo runs, Create Account will fail until Flask is running on port 5000.\n'
  );
  process.exit(1);
}

const absoluteCmd = path.isAbsolute(chosen.cmd);
console.error(`[api] Starting Flask with: ${chosen.cmd} ${chosen.args.join(' ')}`);
if (!hasOpenpyxl(chosen.cmd, chosen.args[0] === '-3' ? ['-3'] : [])) {
  console.error(
    `[api] Warning: openpyxl is not installed in this Python. XLSX export will fail.\n` +
      `      Install with: ${chosen.cmd} -m pip install openpyxl\n`
  );
}
const child = spawn(chosen.cmd, chosen.args, {
  cwd: backendDir,
  stdio: 'inherit',
  env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  shell: win && !absoluteCmd,
  windowsHide: true,
});

child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code == null ? 1 : code);
});
