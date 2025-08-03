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

const app = express();
const udpClient = dgram.createSocket('udp4');

// Serve React frontend
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// WebSocket server for browser → Node communication
const wss = new WebSocketServer({ port: 8081 });
console.log("WebSocket server running on ws://localhost:8081");

wss.on('connection', (ws) => {
  console.log("Client connected");

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "enable") {
      const packet = buildEnablePacket(data.mode, true);
      udpClient.send(packet, ROBOT_PORT, ROBOT_IP);
    } else if (data.type === "disable") {
      const packet = buildEnablePacket(data.mode, false);
      udpClient.send(packet, ROBOT_PORT, ROBOT_IP);
    } else if (data.type === "joystick") {
      // TODO: Convert joystick to UDP packet
    }
  });

  ws.on('close', () => console.log("Client disconnected"));
});

// Serve frontend index.html for any route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

app.listen(8080, () => {
  console.log('Web FRC Driver Station running at http://localhost:8080');
});
