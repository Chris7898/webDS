// launch.js
const WebSocket = require("ws");

// === Configuration ===
// Read values from environment variables (set before launch)
const TEAM_NUMBER = process.env.TEAM_NUMBER || null;
const ROBOT_IP_OVERRIDE = process.env.ROBOT_IP_OVERRIDE || null;
const PORT = process.env.PORT || 8080;

// === Address Resolver ===
function getRobotAddress(teamNumber, overrideIP) {
  if (overrideIP && overrideIP.trim() !== "") {
    return overrideIP.trim();
  }

  if (teamNumber) {
    const tn = teamNumber.toString().padStart(4, "0");
    return `10.${tn.slice(0, 2)}.${tn.slice(2)}.2`;
  }

  throw new Error("No team number or override IP provided.");
}

// === Startup ===
let robotAddress;
try {
  robotAddress = getRobotAddress(TEAM_NUMBER, ROBOT_IP_OVERRIDE);
  console.log(
    ROBOT_IP_OVERRIDE
      ? `🚀 Using override IP: ${robotAddress}`
      : `🚀 Using team number ${TEAM_NUMBER} → ${robotAddress}`
  );
} catch (err) {
  console.error("❌ Startup failed:", err.message);
  process.exit(1);
}

// === WebSocket Server ===
const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`✅ Backend running on ws://0.0.0.0:${PORT}`);
});

wss.on("connection", (ws) => {
  console.log("🔗 New client connected");

  ws.on("message", (msg) => {
    console.log(`📩 Received: ${msg}`);
    // TODO: forward/handle messages with robot at robotAddress
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");
  });
});

// Optional: attempt robot connection (stub for now)
console.log(`📡 Ready to communicate with robot at ${robotAddress}`);
