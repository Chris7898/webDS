// Elements
const connectionStatus = document.getElementById("connection-status");
const batteryVoltage = document.getElementById("battery-voltage");
const robotState = document.getElementById("robot-state");
const robotMode = document.getElementById("robot-mode");
const robotIP = document.getElementById("robot-ip");
const teamNumberInput = document.getElementById("team-number");
const joystickStatus = document.getElementById("joystick-status");
const canvas = document.getElementById("joystick-canvas");
const ctx = canvas.getContext("2d");
const buttonsContainer = document.getElementById("buttons-container");

let ws;
let isConnected = false;
let isEnabled = false;
let currentMode = "teleop";
let teamNumber = parseInt(localStorage.getItem("teamNumber")) || 254;

teamNumberInput.value = teamNumber;
updateRobotIP();

function updateRobotIP() {
  const high = Math.floor(teamNumber / 100);
  const low = teamNumber % 100;
  const ip = `10.${high}.${low}.2`;
  robotIP.textContent = `IP: ${ip}`;
  localStorage.setItem("teamNumber", teamNumber);
}

teamNumberInput.addEventListener("input", () => {
  let val = parseInt(teamNumberInput.value);
  if (!isNaN(val) && val >= 1 && val <= 9999) {
    teamNumber = val;
    updateRobotIP();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "setTeam", team: teamNumber }));
    }
  }
});

function connectWebSocket() {
  ws = new WebSocket("ws://localhost:5800");

  ws.onopen = () => {
    isConnected = true;
    connectionStatus.textContent = "Connected";
    connectionStatus.className = "status green";
    ws.send(JSON.stringify({ type: "setTeam", team: teamNumber }));
    if (isEnabled) {
      ws.send(JSON.stringify({ type: "enable", mode: currentMode }));
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "status") {
      batteryVoltage.textContent = `${data.battery} V`;
      if (data.connected) {
        connectionStatus.textContent = "Robot Connected";
        connectionStatus.className = "status green";
      } else {
        connectionStatus.textContent = "Robot Disconnected";
        connectionStatus.className = "status red";
      }
    }
  };

  ws.onclose = () => {
    isConnected = false;
    isEnabled = false;
    connectionStatus.textContent = "Disconnected";
    connectionStatus.className = "status gray";
    robotState.textContent = "Disabled";
    setTimeout(connectWebSocket, 2000);
  };
}
connectWebSocket();

document.getElementById("enable-button").addEventListener("click", () => {
  if (!isConnected) {
    flashConnectionWarning();
    return;
  }
  isEnabled = true;
  robotState.textContent = "Enabled";
  ws.send(JSON.stringify({ type: "enable", mode: currentMode }));
});

document.getElementById("disable-button").addEventListener("click", () => {
  isEnabled = false;
  robotState.textContent = "Disabled";
  ws.send(JSON.stringify({ type: "disable" }));
});

document.querySelectorAll(".mode-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    currentMode = btn.getAttribute("data-mode");
    robotMode.textContent = btn.textContent;
    if (isEnabled) {
      ws.send(JSON.stringify({ type: "enable", mode: currentMode }));
    }
  })
);

// Flash red if trying to enable while disconnected
function flashConnectionWarning() {
  let flashCount = 0;
  const originalClass = connectionStatus.className;
  const flashInterval = setInterval(() => {
    connectionStatus.className =
      connectionStatus.className === "status red" ? "status gray" : "status red";
    flashCount++;
    if (flashCount > 6) {
      clearInterval(flashInterval);
      connectionStatus.className = originalClass;
    }
  }, 200);
}

// Joystick/Gamepad support
window.addEventListener("gamepadconnected", (e) => {
  joystickStatus.textContent = `Gamepad Connected: ${e.gamepad.id}`;
  setupButtons(e.gamepad.buttons.length);
});

window.addEventListener("gamepaddisconnected", () => {
  joystickStatus.textContent = "No joystick detected";
  buttonsContainer.innerHTML = "";
  drawJoystick(0, 0);
});

function setupButtons(count) {
  buttonsContainer.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const btn = document.createElement("div");
    btn.classList.add("gamepad-button");
    btn.textContent = i;
    buttonsContainer.appendChild(btn);
  }
}

function drawJoystick(x = 0, y = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Outer circle
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 110, 0, Math.PI * 2);
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Joystick position circle
  ctx.beginPath();
  ctx.arc(
    canvas.width / 2 + x * 100,
    canvas.height / 2 + y * 100,
    20,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "#2ecc71";
  ctx.fill();
}

function updateJoystick() {
  const gp = navigator.getGamepads()[0];
  if (gp) {
    const x = gp.axes[0] || 0;
    const y = gp.axes[1] || 0;
    drawJoystick(x, y);

    let buttonMask = 0;
    gp.buttons.forEach((button, i) => {
      if (button.pressed) {
        buttonMask |= 1 << i;
      }
    });

    const buttons = buttonsContainer.children;
    gp.buttons.forEach((button, i) => {
      if (buttons[i]) buttons[i].classList.toggle("pressed", button.pressed);
    });

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "joystick",
          axes: gp.axes,
          buttons: buttonMask,
        })
      );
    }
  } else {
    drawJoystick(0, 0);
  }

  requestAnimationFrame(updateJoystick);
}

updateJoystick();
