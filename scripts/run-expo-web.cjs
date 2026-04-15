/**
 * Start Expo web on an OS-assigned free port (listen on :0).
 * Scanning 8081 on 127.0.0.1 only is wrong on Windows: the port can still be
 * taken on :: or 0.0.0.0, so Expo then prompts and dies in non-interactive mode.
 */
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

const root = path.join(__dirname, '..');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, () => {
      const addr = s.address();
      const port = typeof addr === 'object' && addr ? addr.port : null;
      s.close((err) => {
        if (err) reject(err);
        else if (port == null) reject(new Error('Could not resolve ephemeral port'));
        else resolve(port);
      });
    });
  });
}

(async () => {
  try {
    const port = await getFreePort();
    console.log(`[expo] Metro will use port ${port}`);
    console.log(`[expo] When ready, open http://localhost:${port}\n`);
    const child = spawn('npx', ['expo', 'start', '--web', '--port', String(port)], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });
    child.on('exit', (code) => process.exit(code == null ? 1 : code));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
