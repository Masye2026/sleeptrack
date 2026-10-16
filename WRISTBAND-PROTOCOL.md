# SleepTrack wristband integration notes

Do not turn on the Bluetooth data parser until the firmware specification is known.

Please provide:
- BLE primary service UUID
- Characteristic UUID for readings (read/notify/write as applicable)
- Packet schema, including byte positions, type, endian order, scale and units
- Whether packets are JSON text or binary
- How the device reports battery and connection state
- How sleep sessions are started/stopped and whether the device stores data offline
- Example packet captured from the actual hardware and expected decoded output

After that, implement `parseDevicePacket(value)` in `app.js` and add validation. Keep all displayed readings sourced from received packets. Do not infer sleep stages, heart rate, SpO₂, or other signals that the sensor does not actually provide.
