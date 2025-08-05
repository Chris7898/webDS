const WebSocket = require('ws');
const dgram = require('dgram');
const { makeControlPacket, parseStatusPacket } = require('.frcpackets/');

const WS_PORT = 5800;
let wsClient = null;
let robotIP = null;
let teamNumber = null;
let seqNum = 0;
let robotEnabled = false;
let currentMode = 'teleop';
let lastJoystick = { axes: [0,0], buttons: 0 };

const udpClient = dgram.createSocket('udp4');
const udpServer = dgram.createSocket('udp4');

// -------------------
// WebSocket Server
// -------------------
const wss = new WebSocket.Server({ port: WS_PORT }, () => {
  console.log(`Backend running on ws://localhost:${WS_PORT}`);
});

wss.on('connection', (ws) => {
  wsClient = ws;
  console.log('Frontend connected');

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    switch (data.type) {
      case 'setTeam':
        teamNumber = data.team;
        robotIP = `10.${Math.floor(teamNumber/100)}.${teamNumber%100}.2`;
        break;
      case 'enable':
        robotEnabled = true;
        currentMode = data.mode || 'teleop';
        break;
      case 'disable':
        robotEnabled = false;
        break;
      case 'joystick':
        lastJoystick = { axes: data.axes, buttons: data.buttons };
        break;
    }
  });

  ws.on('close', () => {
    wsClient = null;
  });
});

// -------------------
// UDP Sending Loop
// -------------------
setInterval(() => {
  if (!robotIP) return;
  const packet = makeControlPacket(seqNum++, robotEnabled, currentMode, lastJoystick);
  udpClient.send(packet, 1110, robotIP, (err) => {
    if (err) console.error(err);
  });
}, 20); // ~50Hz like real DS

// -------------------
// UDP Status Listener
// -------------------
udpServer.on('message', (msg) => {
  const status = parseStatusPacket(msg);
  if (wsClient) {
    wsClient.send(JSON.stringify({
      type: 'status',
      battery: status.battery,
      connected: true
    }));
  }
});

udpServer.bind(1150);
