export function buildEnablePacket(mode = "teleop", enabled = false) {
    const buffer = Buffer.alloc(6);
  
    // Packet 0: sequence number (dummy)
    buffer[0] = Math.floor(Math.random() * 256);
    // Packet 1: control word
    let control = 0;
    if (enabled) control |= 0x04; // Enabled
    if (mode === "autonomous") control |= 0x02;
    else if (mode === "teleop") control |= 0x00;
    else if (mode === "test") control |= 0x01;
    buffer[1] = control;
  
    // The rest is padding for now
    return buffer;
  }
  