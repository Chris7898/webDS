import express from 'express';
import { WebSocketServer } from 'ws';
import dgram from 'dgram';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildEnablePacket } from './ds-protocol.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROBOT_IP = "10.14.89.2"; // Replace with your robot IP
const ROBOT_PORT = 1110;

const udpClient = dgram.createSocket('udp4');
const app = express();

// Serve frontend (after `npm run build` in frontend)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const wss = new WebSocketServer({ port: 8081 });
console.log("WebSocket server running on ws://localhost:8081");

wss.on('connection', (ws) => {
  console.log("Client connected");

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === "enable") {
      const packet = buildEnablePacket(data.mode, true);
      udpClient.send(packet, ROBOT_PORT, ROBOT_IP);
    }
    else if (data.type === "disable") {
      const packet = buildEnablePacket(data.mode, false);
      udpClient.send(packet, ROBOT_PORT, ROBOT_IP);
    }
    else if (data.type === "joystick") {
      // TODO: Build joystick packet
    }
  });

  ws.on('close', () => console.log("Client disconnected"));
});

app.listen(8080, () => {
  console.log('Backend running at http://localhost:8080');
});
