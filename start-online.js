const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=======================================================');
console.log('  🚀 OutreachAI — Starting Local Server & Cloudflare Tunnel');
console.log('=======================================================\n');

// 1. Start Server
console.log('[1/2] Starting Outreach Engine Server...');
const server = spawn('node', ['server/dist/index.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

server.on('error', (err) => console.error('Server error:', err));

// 2. Start Cloudflare Tunnel
console.log('[2/2] Connecting to Cloudflare Global Network (please wait a few seconds)...');
const cloudflaredBin = path.join(__dirname, 'cloudflared.exe');

const tunnel = spawn(cloudflaredBin, ['tunnel', '--url', 'http://localhost:3001'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let urlFound = false;

function parseOutput(data) {
  const text = data.toString();
  process.stdout.write(text);

  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !urlFound) {
    urlFound = true;
    const url = match[0];
    try {
      fs.writeFileSync(path.join(__dirname, 'live-link.txt'), url);
    } catch (e) {}

    console.log('\n\n=======================================================');
    console.log('  🎉 APP IS LIVE ONLINE!');
    console.log(`  👉 LIVE URL: ${url}`);
    console.log('  (Saved in live-link.txt)');
    console.log('=======================================================\n\n');

    // Auto open in default browser
    exec(`start "" "${url}"`);
  }
}

tunnel.stdout.on('data', parseOutput);
tunnel.stderr.on('data', parseOutput);

process.on('SIGINT', () => {
  try { server.kill(); } catch (e) {}
  try { tunnel.kill(); } catch (e) {}
  process.exit();
});
