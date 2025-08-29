(() => {
  // Elements
  const teamInput = document.getElementById('teamInput');
  const robotIpEl = document.getElementById('robotIp');
  const connPill = document.getElementById('connPill');
  const connDot = document.getElementById('connDot');
  const connText = document.getElementById('connText');
  const connectBtn = document.getElementById('connectBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  const enableBtn = document.getElementById('enableBtn');
  const disableBtn = document.getElementById('disableBtn');
  const estopBtn = document.getElementById('estopBtn');

  const modeButtons = Array.from(document.querySelectorAll('.btn.mode'));

  const batteryV = document.getElementById('batteryV');
  const commsDot = document.getElementById('commsDot');
  const commsText = document.getElementById('commsText');
  const codeDot = document.getElementById('codeDot');
  const codeText = document.getElementById('codeText');
  const latencyMs = document.getElementById('latencyMs');
  const lossPct = document.getElementById('lossPct');

  const logStream = document.getElementById('logStream');
  const clearLogBtn = document.getElementById('clearLogBtn');

  const popup = document.getElementById('popup');
  const acceptBtn = document.getElementById('acceptBtn');
  const declineBtn = document.getElementById('declineBtn');
  const showPopupBtn = document.getElementById('showPopupBtn');

  // State
  let ws = null;
  let connectTimeoutId = null;
  let isConnected = false;           // to backend websocket
  let robotConnected = false;        // inferred from status
  let currentMode = 'teleop';
  let lastPingSent = 0;
  let rttSamples = [];
  let lastStatusTime = 0;
  let packetWindow = [];             // timestamps of status packets to estimate "loss" (placeholder)

  // Utils
  const padTeam = (n) => String(n).padStart(4, '0');
  const teamToIP = (teamNum) => {
    const t = padTeam(teamNum);
    return `10.${t[0]}${t[1]}.${t[2]}${t[3]}.2`;
  };
  const now = () => new Date();
  const ts = () => now().toLocaleTimeString();

  function showPopup() {
    originalOverflow = document.body.style.overflow;
    popup.classList.add('active');
    document.body.style.overflow = 'auto';
}

function hidePopup() {
    popup.classList.remove('active');
    document.body.style.overflow = 'auto';
    localStorage.setItem('popupDismissed', 'true'); // mark as shown
}

  // Accept button clicked
  acceptBtn.addEventListener('click', () => {
    popup.classList.remove('active');
    log("You accepted. GLHF");
    
  });

  // Decline button clicked
  declineBtn.addEventListener('click', () => {
    popup.classList.remove('active');
  window.location = "https://www.ni.com/en/support/downloads/drivers/download.frc-game-tools.html?srsltid=AfmBOooU5xxVVEt5dXOBapft2WQhnlLogObFARDtCx49sZGfLrO_XKA2"
    // log("You Clicked Exit! Unfortunately, we still will not be liable for any issues that occurred during the use of the WebDS project.");
    
  });

  // Optional: Show popup automatically on page load
  window.addEventListener('load', showPopup);
  window.addEventListener('remove', hidePopup);
  showPopupBtn.addEventListener('click', showPopup);

  if (!localStorage.getItem('popupDismissed')) {
    showPopup();
}

  function log(msg) {
    const el = document.createElement('div');
    el.className = 'log-item';
    el.innerHTML = `<span class="time">${ts()}</span>${msg}`;
    logStream.appendChild(el);
    logStream.scrollTop = logStream.scrollHeight;
  }

  function setConnState(state, text) {
    connPill.classList.remove('connected', 'connecting', 'disconnected');
    connPill.classList.add(state);
    connText.textContent = text;
  }

  function flashConnPill() {
    connPill.classList.add('flash');
    setTimeout(() => connPill.classList.remove('flash'), 600);
  }

  function setModeActive(mode) {
    currentMode = mode;
    modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  }

  function loadPersistedTeam() {
    const saved = localStorage.getItem('webds.teamNumber');
    if (saved) {
      teamInput.value = parseInt(saved, 10);
      robotIpEl.textContent = teamToIP(saved);
    }
  }

  function persistTeam(team) {
    localStorage.setItem('webds.teamNumber', String(team));
  }

  function startConnectTimeout() {
    log('"Space" and "Enter" DO NOT WORK to disable the robot.')
    clearTimeout(connectTimeoutId);
    setConnState('connecting', 'Connecting…');
    connectTimeoutId = setTimeout(() => {
      if (!isConnected) {
        setConnState('disconnected', 'Backend Unreachable');
        log('Connection timeout (30s) – backend not reachable.');
      }
    }, 30000);
  }

  function openWS() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return; // already connecting/connected
    }

    startConnectTimeout();
    try {
      ws = new WebSocket('ws://localhost:5801');
    } catch (e) {
      setConnState('disconnected', 'Invalid WS URL');
      log('WebSocket error constructing URL.');
      return;
    }

    ws.onopen = () => {
      isConnected = true;
      clearTimeout(connectTimeoutId);
      setConnState('connected', 'Connected');
      log('Connected to backend.');
      // Send current team number & mode on connect
      const team = parseInt(teamInput.value || '0', 10);
      if (team > 0) {
        ws.send(JSON.stringify({ type: 'setTeam', team }));
      }
      ws.send(JSON.stringify({ type: 'setMode', mode: currentMode }));
    };

    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'init') {
        // backend may send robotIP and possibly teamNumber
        if (data.robotIP) {
          robotIpEl.textContent = data.robotIP;
        }
        if (typeof data.teamNumber === 'number' && !teamInput.value) {
          teamInput.value = data.teamNumber;
          persistTeam(data.teamNumber);
        }
      } else if (data.type === 'status') {
        handleStatus(data.status);
      } else if (data.type === 'pong') {
        // round trip (optional if backend implements)
        const rtt = Date.now() - (data.clientTs || lastPingSent);
        rttSamples.push(rtt);
        if (rttSamples.length > 5) rttSamples.shift();
        const avg = Math.round(rttSamples.reduce((a, b) => a + b, 0) / rttSamples.length);
        latencyMs.textContent = `${avg} ms`;
      }
    };

    ws.onclose = () => {
      isConnected = false;
      setConnState('disconnected', 'Disconnected');
      log('Backend connection closed.');
    };

    ws.onerror = () => {
      // onerror often followed by onclose; keep pill as connecting/disconnected accordingly
    };
  }

  function handleStatus(status) {
    lastStatusTime = Date.now();
    // Track packet rate (approximate)
    packetWindow.push(lastStatusTime);
    const cutoff = lastStatusTime - 3000; // 3s window
    packetWindow = packetWindow.filter(t => t >= cutoff);
    // For placeholder "loss", assume expected rate 5Hz (200ms); estimate missing ratio
    const expected = Math.round(3000 / 200);
    const pctLoss = Math.max(0, Math.min(100, Math.round((1 - (packetWindow.length / expected)) * 100)));
    lossPct.textContent = `${pctLoss}%`;

    // Battery
    if (typeof status.battery === 'number') {
      batteryV.textContent = `${status.battery.toFixed(1)} V`;
    } else {
      batteryV.textContent = '--.- V';
    }

    // Comms & Code indicators
    const comms = !!status.comms;
    const code = !!status.robotCode;
    robotConnected = comms;

    commsDot.style.background = comms ? 'var(--success)' : 'var(--danger)';
    commsText.textContent = comms ? 'Linked' : 'No Link';

    codeDot.style.background = code ? 'var(--success)' : 'var(--warn)';
    codeText.textContent = code ? 'Running' : 'Not Ready';
  }

  // Handlers
  teamInput.addEventListener('input', () => {
    const val = parseInt(teamInput.value || '0', 10);
    if (val > 0) {
      robotIpEl.textContent = teamToIP(val);
    } else {
      robotIpEl.textContent = '10.00.00.2';
    }
  });

  teamInput.addEventListener('change', () => {
    const team = parseInt(teamInput.value || '0', 10);
    if (team > 0) {
      persistTeam(team);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'setTeam', team }));
        log(`Team set to ${team} (IP ${teamToIP(team)})`);
      } else {
        log(`Team updated locally to ${team}. Will apply when connected.`);
      }
    }
  });

  connectBtn.addEventListener('click', () => {
    log('Connecting to backend…');
    openWS();
  });

  cancelBtn.addEventListener('click', () => {
    if (ws) {
      log('Cancelling connection / closing backend socket…');
      ws.close();
    }
  });

  enableBtn.addEventListener('click', () => {
    if (!isConnected || !robotConnected) {
      flashConnPill();
      log('Enable blocked: not connected to robot.');
      return;
    }
    ws.send(JSON.stringify({ type: 'enable' }));
    log('Enable sent.');
  });
  (() => {
    /* Existing variables and functions from previous script remain unchanged */

    const joystickDisplay = document.getElementById('joystickDisplay');
    const axesDisplay = document.getElementById('axesDisplay');
    const buttonsDisplay = document.getElementById('buttonsDisplay');
    const downloadLogBtn = document.getElementById('downloadLogBtn');

    // Joystick handling
    let gamepads = {};

    function updateGamepads() {
      const gps = navigator.getGamepads();
      buttonsDisplay.innerHTML = '';
      axesDisplay.innerHTML = '';

      for (let gp of gps) {
        if (!gp) continue;
        // Axes
        gp.axes.forEach((val, i) => {
          const axisEl = document.createElement('span');
          axisEl.textContent = `Axis ${i}: ${val.toFixed(2)}`;
          axesDisplay.appendChild(axisEl);
        });

        // Buttons
        gp.buttons.forEach((btn, i) => {
          const btnEl = document.createElement('span');
          btnEl.className = 'btn';
          if (btn.pressed) btnEl.classList.add('pressed');
          btnEl.textContent = i;
          buttonsDisplay.appendChild(btnEl);

          if (btn.pressed) {
            log(`Joystick button ${i} pressed`);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'joystick', index: i, pressed: true }));
            }
          }
        });
      }
    }

    window.addEventListener("gamepadconnected", (e) => {
      log(`Gamepad connected: ${e.gamepad.id}`);
      gamepads[e.gamepad.index] = e.gamepad;
    });

    window.addEventListener("gamepaddisconnected", (e) => {
      log(`Gamepad disconnected: ${e.gamepad.id}`);
      delete gamepads[e.gamepad.index];
    });

    function gameLoop() {
      updateGamepads();
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);

    // Download log
    downloadLogBtn.addEventListener('click', () => {
      let logText = Array.from(logStream.children).map(e => e.textContent).join('\n');
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WebDS-log-${new Date().toISOString()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });

    /* Rest of previous code remains unchanged: WebSocket connect, Enable/Disable/E-Stop, Modes, logging, ping, etc. */
  })();

  disableBtn.addEventListener('click', () => {
    if (!isConnected) {
      flashConnPill();
      log('Disable pressed while disconnected (no-op).');
      return;
    }
    ws.send(JSON.stringify({ type: 'disable' }));
    log('Disable sent.');
  });

  estopBtn.addEventListener('click', () => {
    if (!isConnected) {
      flashConnPill();
      log('E-STOP pressed while disconnected (no-op).');
      return;
    }
    ws.send(JSON.stringify({ type: 'estop' }));
    log('E-STOP sent!');
  });

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      setModeActive(mode);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'setMode', mode }));
        log(`Mode → ${mode}`);
      } else {
        log(`Mode set locally to ${mode}. Will apply when connected.`);
      }
    });
  });

  clearLogBtn.addEventListener('click', () => {
    logStream.innerHTML = '';
  });


  // Auto-init
  loadPersistedTeam();
  setModeActive('teleop');
  setConnState('disconnected', 'Disconnected');

  // Auto-connect to backend on load (keeps plug-and-play feel)
  openWS();

  // Optional: backend RTT ping (only if backend supports a 'ping'/'pong' message)
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      lastPingSent = Date.now();
      ws.send(JSON.stringify({ type: 'ping', clientTs: lastPingSent }));
    }
  }, 1000);
})();
