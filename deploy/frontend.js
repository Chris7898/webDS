// frontend.js

let ws;
let connected = false;

// DOM elements
const connectBtn = document.getElementById("connect-btn");
const cancelBtn = document.getElementById("cancel-btn");
const enableBtn = document.getElementById("enable-btn");
const disableBtn = document.getElementById("disable-btn");
const estopBtn = document.getElementById("estop-btn");
const modeBtns = document.querySelectorAll(".mode-btn");
const setTeamBtn = document.getElementById("set-team-btn");
const teamInput = document.getElementById('teamNumberInput');

const statusEl = document.getElementById("status");
const batteryEl = document.getElementById("battery");
const commsEl = document.getElementById("comms");
const codeEl = document.getElementById("robot-code");
// Example: when the team number input changes


teamInput.addEventListener('change', () => {
  const teamNumber = parseInt(teamInput.value);
  if (!isNaN(teamNumber) && ws.readyState === WebSocket.OPEN) {
    // Send team number to backend
    ws.send(JSON.stringify({ type: 'setTeam', team: teamNumber }));
  }
});

// Load saved team number from localStorage
if (localStorage.getItem("teamNumber")) {
  teamInput.value = localStorage.getItem("teamNumber");
}

// Helper logging
function log(msg) {
  console.log("[UI]", msg);
}

// Update indicator with color & flashing
function setIndicator(el, label, ok) {
  el.classList.remove("flash-red");
  if (ok) {
    el.textContent = `${label}: ✅`;
    el.className = "text-green-500";
  } else {
    el.textContent = `${label}: ❌`;
    el.className = "text-red-500 flash-red";
  }
}

// Update battery display
function setBattery(voltage) {
  if (!voltage) {
    batteryEl.textContent = "Battery: -- V";
    batteryEl.className = "";
    return;
  }

  batteryEl.textContent = `Battery: ${voltage.toFixed(2)} V`;
  batteryEl.classList.remove("flash-red");

  if (voltage >= 12) batteryEl.className = "text-green-500";
  else if (voltage >= 11) batteryEl.className = "text-yellow-500";
  else batteryEl.className = "text-red-500 flash-red";
}

// Setup WebSocket connection
function setupWS() {
  ws = new WebSocket("ws://localhost:5801");

  ws.onopen = () => log("Connected to backend");

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "init") log(`Backend ready. Robot IP: ${data.robotIP}`);
    if (data.type === "teamUpdated") log(`Team set: ${data.team} (IP: ${data.ip})`);

    if (data.type === "connection") {
      connected = data.connected;
      if (connected) {
        statusEl.textContent = "Connected ✅";
        statusEl.className = "font-bold text-green-500";
      } else {
        statusEl.textContent = "Disconnected ❌";
        statusEl.className = "font-bold text-red-500 flash-red";
      }
    }

    if (data.type === "status") {
      const s = data.status;
      setIndicator(commsEl, "Comms", s.comms);
      setIndicator(codeEl, "Code", s.robotCode);
      setBattery(s.battery);
    }
  };

  ws.onclose = () => {
    log("Disconnected from backend");
    statusEl.textContent = "Disconnected ❌";
    statusEl.className = "font-bold text-red-500 flash-red";
    connected = false;
  };
}

// Button actions
connectBtn.addEventListener("click", () => ws.send(JSON.stringify({ type: "connect" })));
cancelBtn.addEventListener("click", () => ws.send(JSON.stringify({ type: "cancelConnection" })));
enableBtn.addEventListener("click", () => ws.send(JSON.stringify({ type: "enable" })));
disableBtn.addEventListener("click", () => ws.send(JSON.stringify({ type: "disable" })));
estopBtn.addEventListener("click", () => ws.send(JSON.stringify({ type: "estop" })));

modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    ws.send(JSON.stringify({ type: "setMode", mode }));
  });
});

// Set team number & save to localStorage
setTeamBtn.addEventListener("click", () => {
  const team = parseInt(teamInput.value, 10);
  if (!isNaN(team)) {
    ws.send(JSON.stringify({ type: "setTeam", team }));
    localStorage.setItem("teamNumber", team);
  }
});

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'init') {
    const teamNumber = data.teamNumber || 0;
    document.getElementById('teamNumberInput').value = teamNumber;
  }
};

// Auto-setup WebSocket
setupWS();
