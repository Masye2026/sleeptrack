// Public browser configuration only. Never put secret keys in this file.
// Get these values from your Supabase project: Project Settings → API.
window.SLEEPTRACK_CONFIG = {
  SUPABASE_URL: "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE",
  SUPABASE_ANON_KEY: "PASTE_YOUR_SUPABASE_ANON_KEY_HERE",
  // Fill these with the REAL SleepTrack wristband UUIDs when firmware is ready.
  BLE_SERVICE_UUID: "",
  BLE_CHARACTERISTIC_UUID: "",
  // Leave false until the characteristic's packet format is implemented in parseDevicePacket().
  BLE_PACKET_FORMAT_CONFIRMED: false
};