# SleepTrack wristband protocol — design checklist

The custom wristband firmware and web app must agree on this before live syncing can work.

## Recommended first prototype

- Transport: Bluetooth Low Energy (BLE)
- GATT service: one custom 128-bit service UUID
- Sensor data characteristic: one custom 128-bit characteristic UUID with `Notify`
- Payload: UTF-8 JSON for early prototyping
- Packet example:
  `{"heartRate":62,"spo2":97,"timestamp":"2026-10-16T20:15:00Z"}`
- Optional sleep summary:
  `{"sleepHours":7.5,"timestamp":"2026-10-16T07:00:00Z"}`

Use your own assigned UUIDs, not the placeholder text in the app. Firmware should send only measurements that its sensors actually support and should define units, valid ranges, timestamp source, sampling rate, and behavior when a sensor cannot obtain a reading.

## Before release

- Define device identity and pairing/privacy behavior.
- Avoid transmitting health data to untrusted nearby devices.
- Decide whether data is buffered on the band when the browser is disconnected.
- Define packet versioning and error handling.
- Test the sensor against a suitable reference; do not present unvalidated readings as medical measurements.
- For cloud sync, authenticate the account and device association and authorize every record server-side.
