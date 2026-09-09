const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8999;
const HTML_PATH = path.join(__dirname, 'pose_detector.html');
const CONFIG_DIR = path.join(__dirname, '../config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'poseConfig.json');

if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// 1. Create HTTP Server
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(HTML_PATH, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading pose detector');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Pose Server] Local server running on http://localhost:${PORT}`);
  startTunnel();
});

// 2. Start Secure HTTPS Tunnel via Pinggy
function startTunnel() {
  console.log('[Pose Server] Establishing HTTPS Tunnel...');

  const tunnel = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=30',
    '-p', '443',
    '-R0:localhost:' + PORT,
    'a.pinggy.io'
  ]);

  let foundUrl = false;

  tunnel.stdout.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.free\.pinggy\.net/) ||
                  text.match(/https:\/\/[a-zA-Z0-9-]+\.run\.pinggy-free\.link/);

    if (match && !foundUrl) {
      foundUrl = true;
      const httpsUrl = match[0];
      console.log(`\n==============================================`);
      console.log(`🚀 Real-Time MediaPipe HTTPS Tunnel Ready:`);
      console.log(`🔗 ${httpsUrl}`);
      console.log(`==============================================\n`);

      const configData = {
        url: httpsUrl,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));
      console.log(`[Pose Server] Config saved to ${CONFIG_PATH}`);
    }
  });

  tunnel.stderr.on('data', (data) => {
    // Pinggy banner info
  });

  tunnel.on('close', (code) => {
    console.log(`[Pose Server] Tunnel closed (code ${code}), restarting in 5s...`);
    setTimeout(startTunnel, 5000);
  });
}
