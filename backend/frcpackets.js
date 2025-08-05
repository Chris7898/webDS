// backend/frcPackets.js
module.exports = {
    makeControlPacket(seq, enabled, mode, joystick) {
      const buf = Buffer.alloc(20);
      // Sequence number
      buf.writeUInt16LE(seq, 0);
  
      // Control byte (bitmask)
      let control = 0;
      if (enabled) control |= 0x04; // Enabled
      if (mode === 'auto') control |= 0x02;
      buf.writeUInt8(control, 2);
  
      // Estop (disabled here)
      buf.writeUInt8(0, 3);
  
      // Example: joystick X axis and button bitmask
      buf.writeInt8(Math.floor((joystick.axes[0] || 0) * 127), 4);
      buf.writeUInt16LE(joystick.buttons || 0, 5);
  
      return buf;
    },
  
    parseStatusPacket(msg) {
      // This is heavily simplified, real packets are complex
      return {
        battery: (msg[0] / 10.0 + 11).toFixed(2), // fake battery
        robotCode: true
      };
    }
  };
  