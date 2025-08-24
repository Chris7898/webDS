#!/usr/bin/env node
// --- Harden ws for pkg: force pure JS (avoid native addons) ---
process.env.WS_NO_BUFFER_UTIL = '1';
process.env.WS_NO_UTF_8_VALIDATE = '1';

const WebSocket = require('ws');

// ===== Config =====
const PORT = 5801;            // Match your frontend (ws://localhost:5801)
const HOST = '0.0.0.0';       // Bind all interfaces (or use '127.0.0.1' for local only)

let clients = [];

// Simple in-memory state (frontend drives real values)
let state = {
  team: null,
  mode: 'teleop',
  comms: false,
  robotCode: false,
  battery: null,
};

// Start WS server (explicit host fixes pkg option parsing issues)
const wss = new WebSocket.Server({ host: HOST, port: PORT }, () => {
  console.log(`WebDS Backend WebSocket running on ws://${HOST}:${PORT}`);
  console.log('Press Ctrl+C to quit');
});

wss.on('connection', (ws, req) => {
  const peer = req.socket.remoteAddress;
  console.log(`Frontend connected from ${peer}`);
  clients.push(ws);

  // Send initial snapshot (frontend expects this)
  safeSend(ws, {
    type: 'init',
    teamNumber: state.team ?? undefined,
    robotIP: state.team ? teamToIP(state.team) : undefined
  });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch {
      console.warn('Invalid JSON from client:', String(raw));
      return;
    }

    switch (msg.type) {
      case 'setTeam': {
        const t = Number(msg.team);
        if (Number.isFinite(t) && t > 0) {
          state.team = t;
          console.log(`Team set to ${t} (IP ${teamToIP(t)})`);
          // echo back init-style info so the UI updates confidently
          safeSend(ws, { type: 'init', teamNumber: t, robotIP: teamToIP(t) });
        }
        break;
      }
      case 'setMode': {
        if (typeof msg.mode === 'string') {
          state.mode = msg.mode;
          console.log(`Mode -> ${state.mode}`);
        }
        break;
      }
      case 'enable': {
        console.log('Enable received');
        // TODO: send proper DS UDP to robot here
        break;
      }
      case 'disable': {
        console.log('Disable received');
        // TODO: send proper DS UDP to robot here
        break;
      }
      case 'estop': {
        console.log('E-STOP received');
        // TODO: send proper DS UDP to robot here
        break;
      }
      case 'joystick': {
        // You’ll likely pack real axes/buttons later.
        // For now, just acknowledge to prove the pipe works.
        // console.log('Joystick event:', msg);
        break;
      }
      case 'ping': {
        // Frontend RTT
        safeSend(ws, { type: 'pong', clientTs: msg.clientTs });
        break;
      }
      default:
        // console.log('Unknown message type:', msg);
        break;
    }
  });

  ws.on('close', () => {
    console.log(`Frontend disconnected (${peer})`);
    clients = clients.filter(c => c !== ws);
  });
});

wss.on('error', (err) => {
  console.error('WebSocket server error:', err);
});

// Periodic status broadcast (frontend expects "status" frames)
setInterval(() => {
  // NOTE: keep placeholders minimal; your real robot hook will update these.
  const status = {
    comms: state.comms,         // set true when you actually see robot link
    robotCode: state.robotCode, // set true when code is detected
    battery: state.battery,     // numeric (e.g., 12.3)
  };
  broadcast({ type: 'status', status });
}, 200);

// ---- helpers ----
function broadcast(obj) {
  const s = JSON.stringify(obj);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(s);
    }
  }
}

function safeSend(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function teamToIP(team) {
  const t = String(team).padStart(4, '0');
  return `10.${t[0]}${t[1]}.${t[2]}${t[3]}.2`;
}
