# SleepTrack Web — starter app

A calm, responsive web-first SleepTrack interface designed around a **custom SleepTrack wristband**. This version is deliberately honest about device data: it does not invent heart rate, SpO₂, sleep duration, sleep stages, or sleep scores.

## Run locally

1. Download and unzip the project.
2. Open the folder in VS Code.
3. For Bluetooth, serve it from **localhost** (not by double-clicking `index.html`). In VS Code, use a local server extension, or run `python3 -m http.server 8000` from this folder and visit `http://localhost:8000`.
4. Open the **My wristband** page.
5. Enter the custom service UUID and notification characteristic UUID defined by your wristband firmware.
6. Click **Connect wristband**, choose the device, and wait for sensor notifications.

For a deployed version, use HTTPS. Web Bluetooth support depends on browser and operating system.

## What works in this starter

- Responsive app navigation and dashboard.
- Light/dark appearance and reduced-motion setting.
- Journal entries saved locally in the current browser.
- Export and clear local data.
- Web Bluetooth device picker and GATT connection attempt on supported browsers.
- Notification listener that parses incoming UTF-8 JSON packets.
- Only actual packets are saved as readings. No sample sensor values are inserted.
- Local history for received packets.

## Bluetooth packet contract (prototype)

The configured GATT characteristic should send a UTF-8 encoded JSON object, for example:

```json
{"heartRate":62,"spo2":97,"timestamp":"2026-10-16T20:15:00Z"}
```

Supported fields:
- `heartRate` (number, bpm)
- `spo2` (number, percent)
- `sleepHours` (number, hours)

Field aliases accepted by the parser include `heart_rate`, `hr`, `SpO2`, `oxygenSaturation`, `oxygen_saturation`, and `sleep_hours`. A packet must contain at least one supported field. Malformed or unsupported packets are not saved.

**This is a proposed prototype contract, not a claim about existing hardware.** The wristband firmware and app must agree on UUIDs, packet encoding, units, and update behavior. If firmware sends binary packets, update the decoder to match that real specification rather than guessing.

## Device compatibility

Web Bluetooth generally requires Chromium-based browsers and a secure context (HTTPS or localhost). Safari on iOS does not support Web Bluetooth. For broad iPhone support, plan a native companion app or a hardware/cloud bridge with an authenticated API.

## What is not included yet

- User accounts, secure cloud storage, or cross-device syncing.
- Production-grade BLE reconnection, firmware update, or battery telemetry.
- Sleep-stage algorithms or medical-grade validation.
- Community posting/messaging or video uploads.
- Live wristband data until compatible hardware and firmware are available.

The current browser `localStorage` is **not cloud sync** and is not appropriate as the only long-term store for sensitive health data. Before adding cloud sync, implement secure authentication, server-side authorization, encrypted transport, clear consent, deletion/export controls, and a defined retention policy.

## Suggested next build steps

1. Agree on BLE UUIDs and packet schema with firmware.
2. Verify the actual wristband sends notifications and validate real values/units.
3. Add a secure backend with user-scoped records for cross-device sync.
4. Add automated tests for parsing, invalid packets, disconnects, and permission denial.
5. Test with the actual hardware on each target browser/device.
