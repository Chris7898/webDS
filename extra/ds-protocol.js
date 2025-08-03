export function buildEnablePacket(mode = "teleop", enabled = false) {
    const buffer = Buffer.alloc(6);
  
    // Packet 0: Sequence number (dummy)
    buffer[0] = Math.floor(Math.random() * 256);
  
    // Packet 1: Control word (simplified)
    let control = 0;
    if (enabled) control |= 0x04; // Enabled
    if (mode === "autonomous") control |= 0x02;
    else if (mode === "test") control |= 0x01;
    buffer[1] = control;
  
    // The rest is placeholder
    return buffer;
  }
  