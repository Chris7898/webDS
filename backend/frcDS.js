const dgram = require("dgram");
const fs = require("fs");
const path = require("path");
const robotState = require("./shared/robotState");

class DriverStation {
  constructor() {
    this.configPath = path.join(__dirname, "config.json");
    this.team = 0;
    this.robotIP = "10.0.0.2";
    this.enabled = false;
    this.mode = robotState.RobotModeString.TELEOP;
    this.socket = dgram.createSocket("udp4");
    this.robotPort = 1110;
    this.dsPacketCounter = 0;

    this.loadTeamFromConfig();
  }

  loadTeamFromConfig() {
    try {
      const data = fs.readFileSync(this.configPath, "utf8");
      const config = JSON.parse(data);
      if (config.teamNumber && config.teamNumber > 0) {
        this.setTeam(config.teamNumber);
        console.log(`Loaded team number from config: ${this.team}`);
      }
    } catch {
      console.log("No config found or invalid, using default team 0");
    }
  }

  saveTeamToConfig() {
    fs.writeFileSync(
      this.configPath,
      JSON.stringify({ teamNumber: this.team }),
    );
  }

  setTeam(team) {
    this.team = team;
    this.robotIP = this.calculateRobotIP(team);
    console.log(`Team set: ${team}, Robot IP: ${this.robotIP}`);
    this.saveTeamToConfig(); // Writes to config.json automatically
  }

  calculateRobotIP(team) {
    const t = String(team).padStart(4, "0");
    return `10.${t[0]}${t[1]}.${t[2]}${t[3]}.2`;
  }

  connect() {
    console.log(`Auto-connecting to robot at ${this.robotIP}`);
    this.sendDSPacket();
  }

  disconnect() {
    console.log("Disconnected from robot");
  }

  setEnabled(flag) {
    this.enabled = flag;
    this.sendDSPacket();
  }

  estop() {
    this.enabled = false;
    this.sendDSPacket();
  }

  setMode(mode) {
    this.mode = mode;
    this.sendDSPacket();
  }

  sendDSPacket() {
    const buf = Buffer.alloc(64);
    buf.writeUInt8(this.enabled ? 1 : 0, 0);
    buf.writeUInt8(this.modeToNumber(this.mode), 1);
    buf.writeUInt16BE(this.dsPacketCounter++ % 65536, 2);

    this.socket.send(
      buf,
      0,
      buf.length,
      this.robotPort,
      this.robotIP,
      (err) => {
        if (err) console.error("Error sending DS packet:", err);
      },
    );
  }

  modeToNumber(mode) {
    switch (mode) {
      case robotState.RobotModeString.TELEOP:
        return 0;
      case robotState.RobotModeString.AUTONOMOUS:
        return 1;
      case robotState.RobotModeString.TEST:
        return 2;
      default:
        return 0;
    }
  }

  getStatus() {
    const battery = 12 + Math.random() * 1.5;
    const comms = true;
    const robotCode = true;
    return { battery, comms, robotCode };
  }
}

module.exports = { DriverStation };
