// Elements
const connectionStatus = document.getElementById('connection-status');
const modeStatus = document.getElementById('mode-status');
const batteryVoltage = document.getElementById('battery-voltage');
const robotState = document.getElementById('robot-state');
const robotMode = document.getElementById('robot-mode');
const robotIP = document.getElementById('robot-ip');
const teamNumberInput = document.getElementById('team-number-input');
const joystickStatus = document.getElementById('joystick-status');
const canvas = document.getElementById('joystick-canvas');
const ctx = canvas.getContext('2d');
const buttonGrid = document.getElementById('button-grid');

let isConnected = false;
let isEnabled = false;
let isConnecting = false;
let connectionTimeout = null;
let currentMode = 'Teleop';
let teamNumber = 0;
let gamepadIndex = null;

// ---------------------------
// Load team number from localStorage
// ---------------------------
const savedTeamNumber = localStorage.getItem('teamNumber');
if (savedTeamNumber) {
  teamNumber = parseInt(savedTeamNumber);
  teamNumberInput.value = teamNumber;
} else {
  teamNumber = 1489; // default fallback
  teamNumberInput.value = teamNumber;
}

// Update IP display
function updateRobotIP() {
  const high = Math.floor(teamNumber / 100);
  const low = teamNumber % 100;
  const ip = `10.${high}.${low}.2`;
  robotIP.textContent = ip;
  localStorage.setItem('teamNumber', teamNumber);
  localStorage.setItem('robotIP', ip);
  return ip;
}
updateRobotIP();

teamNumberInput.addEventListener('input', () => {
  teamNumber = parseInt(teamNumberInput.value) || 0;
  updateRobotIP();
});

// ---------------------------
// Connection Tracker
// ---------------------------
const connectBtn = document.getElementById('connect-btn');

connectBtn.addEventListener('click', () => {
  if (isConnecting || isConnected) {
    // If already connecting or connected, cancel/stop
    disconnectRobot();
  } else {
    connectToRobot();
  }
});

function connectToRobot() {
  const ip = updateRobotIP();
  isConnecting = true;
  connectionStatus.textContent = 'Connecting…';
  connectionStatus.className = 'status-badge gray';
  connectBtn.textContent = 'Cancel';
  
  // Timeout after 30 seconds
  connectionTimeout = setTimeout(() => {
    if (!isConnected) {
      failConnection();
    }
  }, 30000); 

  // Simulate network "ping" → Replace with real WebSocket later
  setTimeout(() => {
    if (isConnecting) {
      // Simulate success 50% of the time for demo
      const success = Math.random() > 0.5;
      if (success) {
        completeConnection();
      } else {
        failConnection();
      }
    }
  }, 2000); // Fake 2s network delay
}

function completeConnection() {
  clearTimeout(connectionTimeout);
  isConnecting = false;
  isConnected = true;
  connectionStatus.textContent = 'Connected';
  connectionStatus.className = 'status-badge green';
  connectBtn.textContent = 'Disconnect';
}

function failConnection() {
  clearTimeout(connectionTimeout);
  isConnecting = false;
  isConnected = false;
  connectionStatus.textContent = 'Connection Failed';
  connectionStatus.className = 'status-badge red';
  connectBtn.textContent = 'Connect';
}

function disconnectRobot() {
  clearTimeout(connectionTimeout);
  isConnecting = false;
  isConnected = false;
  connectionStatus.textContent = 'Disconnected';
  connectionStatus.className = 'status-badge red';
  connectBtn.textContent = 'Connect';
  setRobotState(false); // Disable robot on disconnect
}

// ---------------------------
// Robot State & Modes
// ---------------------------
document.getElementById('enable-btn').addEventListener('click', () => {
  if (!isConnected) {
    flashConnectionWarning();
    return;
  }
  setRobotState(true);
});

document.getElementById('disable-btn').addEventListener('click', () => setRobotState(false));

function setRobotState(enabled) {
  isEnabled = enabled && isConnected; // only enable if connected
  modeStatus.textContent = isEnabled ? currentMode : 'Disabled';
  modeStatus.className = `status-badge ${isEnabled ? 'green' : 'gray'}`;
  robotState.textContent = isEnabled ? 'Enabled' : 'Disabled';
}

document.querySelectorAll('[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    currentMode = btn.dataset.mode.charAt(0).toUpperCase() + btn.dataset.mode.slice(1);
    robotMode.textContent = currentMode;
    if (isEnabled) modeStatus.textContent = currentMode;
  });
});

// ---------------------------
// Flash warning if not connected
// ---------------------------
function flashConnectionWarning() {
  let flashCount = 0;
  const originalClass = connectionStatus.className;

  const flashInterval = setInterval(() => {
    connectionStatus.className =
      connectionStatus.className.includes('red') ? 'status-badge gray' : 'status-badge red';
    flashCount++;

    if (flashCount > 5) { // ~5 flashes (~1 sec)
      clearInterval(flashInterval);
      connectionStatus.className = originalClass;
    }
  }, 200);
}

// ---------------------------
// Joystick / Gamepad Support
// ---------------------------
function drawJoystick(x = 150, y = 150) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Outer circle
  ctx.beginPath();
  ctx.arc(150, 150, 140, 0, Math.PI * 2);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Joystick dot
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#2a9d8f';
  ctx.fill();
}

drawJoystick();

window.addEventListener("gamepadconnected", (e) => {
  gamepadIndex = e.gamepad.index;
  joystickStatus.textContent = `Connected: ${e.gamepad.id}`;
  setupButtons(e.gamepad.buttons.length);
});

window.addEventListener("gamepaddisconnected", () => {
  gamepadIndex = null;
  joystickStatus.textContent = "No joystick detected";
  buttonGrid.innerHTML = "";
  drawJoystick();
});

function setupButtons(count) {
  buttonGrid.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const btn = document.createElement("div");
    btn.className = "gamepad-button";
    btn.textContent = i;
    buttonGrid.appendChild(btn);
  }
}

function updateGamepad() {
  if (gamepadIndex !== null) {
    const gp = navigator.getGamepads()[gamepadIndex];
    if (gp) {
      const x = 150 + gp.axes[0] * 120;
      const y = 150 + gp.axes[1] * 120;
      drawJoystick(x, y);

      const buttons = buttonGrid.querySelectorAll(".gamepad-button");
      gp.buttons.forEach((btn, i) => {
        if (buttons[i]) {
          buttons[i].classList.toggle("pressed", btn.pressed);
        }
      });
    }
  }
  requestAnimationFrame(updateGamepad);
}

updateGamepad();
