(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = "sleeptrack.v1";
  const DEFAULTS = { readings: [], journals: [], settings: { dark: false, reduceMotion: false, serviceUuid: "", characteristicUuid: "" } };
  let state = loadState();
  let bleDevice = null, bleServer = null, bleCharacteristic = null, breathingTimer = null, breathingPhase = false, toastTimer = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(DEFAULTS), ...parsed, settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) }, readings: Array.isArray(parsed.readings) ? parsed.readings : [], journals: Array.isArray(parsed.journals) ? parsed.journals : [] };
    } catch { return structuredClone(DEFAULTS); }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch { toast("Could not save data in this browser. Storage may be full or disabled."); }
  }
  function safeText(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
  function fmtTime(value) {
    if (!value) return "Unknown time";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "Unknown time" : d.toLocaleString([], { dateStyle:"medium", timeStyle:"short" });
  }
  function latestReading() { return state.readings.length ? state.readings[state.readings.length - 1] : null; }
  function valOrDash(value, suffix = "") { return value === null || value === undefined || value === "" ? "—" : `${safeText(value)}${suffix}`; }
  function toast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3600);
  }
  function showPage(name) {
    document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === `page-${name}`));
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === name));
    const active = document.querySelector(`.nav-item[data-page="${name}"]`);
    $("pageTitle").textContent = active ? active.textContent.trim().replace(/^[^\w]+/, "") : "Overview";
    $("sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: state.settings.reduceMotion ? "auto" : "smooth" });
  }
  document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));
  document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.go)));
  $("mobileMenu").addEventListener("click", () => $("sidebar").classList.toggle("open"));
  document.addEventListener("click", e => {
    if (window.innerWidth <= 760 && $("sidebar").classList.contains("open") && !$("sidebar").contains(e.target) && !$("mobileMenu").contains(e.target)) $("sidebar").classList.remove("open");
  });

  function setTheme(dark) {
    document.body.classList.toggle("dark", dark);
    $("darkSetting").checked = dark;
    $("themeToggle").innerHTML = `${dark ? "☾" : "☼"} <span>Switch appearance</span>`;
    state.settings.dark = dark; saveState();
  }
  function setReduceMotion(value) {
    document.body.classList.toggle("reduce-motion", value);
    $("motionSetting").checked = value; state.settings.reduceMotion = value; saveState();
  }
  $("themeToggle").addEventListener("click", () => setTheme(!state.settings.dark));
  $("darkSetting").addEventListener("change", e => setTheme(e.target.checked));
  $("motionSetting").addEventListener("change", e => setReduceMotion(e.target.checked));

  function renderConnection() {
    const connected = !!(bleDevice && bleDevice.gatt && bleDevice.gatt.connected);
    $("topConnection").innerHTML = `<i class="status-dot" style="background:${connected ? "#62b99b" : "#c4c3d4"}"></i> ${connected ? "Wristband connected" : "Wristband not connected"}`;
    $("overviewDevice").textContent = connected ? "Connected" : "Offline";
    $("overviewDeviceFoot").textContent = connected ? "Listening for sensor packets" : "Connect to start syncing";
    $("deviceStatusTitle").textContent = connected ? (bleDevice.name || "SleepTrack wristband") : "Not connected";
    $("deviceStatusDesc").textContent = connected ? "Connected over Bluetooth. Waiting for compatible sensor notifications." : "No wristband is connected. No readings are being received.";
    $("deviceConnectionValue").textContent = connected ? "Connected via BLE" : "Offline";
    $("connectBtn").disabled = connected;
    $("disconnectBtn").disabled = !connected;
    $("footerStatus").textContent = "BLE prototype · Local browser storage";
  }
  function renderReadings() {
    const r = latestReading();
    const hr = r && r.heartRate != null ? r.heartRate : null;
    const spo2 = r && r.spo2 != null ? r.spo2 : null;
    const sleep = r && r.sleepHours != null ? r.sleepHours : null;
    $("overviewHr").innerHTML = `${valOrDash(hr)}<small> bpm</small>`;
    $("overviewSpo2").innerHTML = `${valOrDash(spo2)}<small>%</small>`;
    $("healthHr").innerHTML = `${valOrDash(hr)}<small> bpm</small>`;
    $("healthSpo2").innerHTML = `${valOrDash(spo2)}<small>%</small>`;
    $("overviewSleep").innerHTML = `${valOrDash(sleep)}<small> h</small>`;
    $("sleepDuration").textContent = sleep == null ? "—" : `${safeText(sleep)} h`;
    $("readingTimestamp").textContent = r ? `Last packet: ${fmtTime(r.receivedAt)}` : "No device data received yet";
    $("healthHrTime").textContent = hr == null ? "No heart-rate field in latest packet" : `Received ${fmtTime(r.receivedAt)}`;
    $("healthSpo2Time").textContent = spo2 == null ? "No SpO₂ field in latest packet" : `Received ${fmtTime(r.receivedAt)}`;
    $("deviceLastPacket").textContent = r ? fmtTime(r.receivedAt) : "None";
    $("deviceReadingCount").textContent = String(state.readings.length);
    $("sleepSessions").textContent = String(state.readings.filter(x => x.sleepHours != null).length);
    const readingsHtml = state.readings.slice(-8).reverse().map(x => {
      const parts = [];
      if (x.heartRate != null) parts.push(`Heart rate: ${safeText(x.heartRate)} bpm`);
      if (x.spo2 != null) parts.push(`SpO₂: ${safeText(x.spo2)}%`);
      if (x.sleepHours != null) parts.push(`Sleep: ${safeText(x.sleepHours)} h`);
      return `<div class="reading-item"><div><strong>${safeText(parts.join(" · ") || "Sensor packet received")}</strong><p>${safeText(x.rawSummary || "Received from connected device")}</p></div><small>${safeText(fmtTime(x.receivedAt))}</small></div>`;
    }).join("");
    const empty = '<div class="empty-state"><span class="empty-illustration">✧</span><strong>No sensor readings yet</strong><p>Connect the wristband and send a packet in the configured format.</p></div>';
    $("recentReadings").innerHTML = readingsHtml ? `<div class="entry-list">${readingsHtml}</div>` : empty;
    $("healthHistory").innerHTML = readingsHtml ? `<div class="entry-list">${readingsHtml}</div>` : empty;
    const sleepRows = state.readings.filter(x => x.sleepHours != null).slice(-10).reverse().map(x => `<div class="reading-item"><div><strong>${safeText(x.sleepHours)} hours</strong><p>Sleep duration from device packet</p></div><small>${safeText(fmtTime(x.receivedAt))}</small></div>`).join("");
    $("sleepLog").innerHTML = sleepRows ? `<div class="entry-list">${sleepRows}</div>` : '<div class="empty-state"><span class="empty-illustration">☾</span><strong>No sleep sessions yet</strong><p>Your app will not invent sleep duration or stages.</p></div>';
  }
  function renderJournals() {
    const entries = state.journals.slice().sort((a,b) => b.date.localeCompare(a.date));
    $("journalEntries").innerHTML = entries.length ? `<div class="entry-list">${entries.map(e => `<div class="entry-item"><div><strong>${safeText(e.date)} · ${safeText(e.mood)}</strong><p>${safeText(e.text || "(No note text)")}</p></div><button class="text-btn" data-delete-journal="${safeText(e.id)}">Delete</button></div>`).join("")}</div>` : '<div class="empty-state"><strong>No journal entries yet</strong><p>Your saved notes will show up here.</p></div>';
    document.querySelectorAll("[data-delete-journal]").forEach(b => b.addEventListener("click", () => {
      state.journals = state.journals.filter(e => e.id !== b.dataset.deleteJournal); saveState(); renderJournals(); toast("Journal entry deleted.");
    }));
  }
  $("journalDate").value = new Date().toLocaleDateString("en-CA");
  $("saveJournal").addEventListener("click", () => {
    const date = $("journalDate").value;
    if (!date) { $("journalMessage").textContent = "Choose a date first."; return; }
    state.journals.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, date, mood: $("journalMood").value, text: $("journalText").value.trim(), createdAt: new Date().toISOString() });
    saveState(); $("journalText").value = ""; $("journalMessage").textContent = "Saved on this browser."; renderJournals(); toast("Journal entry saved.");
  });

  function uuidOrThrow(value, label) {
    const v = value.trim();
    if (!v) throw new Error(`Enter the ${label} from your wristband firmware first.`);
    // Bluetooth accepts 16-bit, 32-bit, or canonical 128-bit UUID strings.
    if (!/^(?:[0-9a-fA-F]{4}|[0-9a-fA-F]{8}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(v)) throw new Error(`The ${label} does not look like a valid Bluetooth UUID.`);
    return v;
  }
  function normalizePacket(packet) {
    if (!packet || typeof packet !== "object" || Array.isArray(packet)) throw new Error("Packet must be a JSON object.");
    const out = {};
    const aliases = { heartRate:["heartRate","heart_rate","hr"], spo2:["spo2","SpO2","oxygenSaturation","oxygen_saturation"], sleepHours:["sleepHours","sleep_hours"] };
    for (const [dest, keys] of Object.entries(aliases)) {
      const found = keys.find(k => Object.prototype.hasOwnProperty.call(packet, k) && packet[k] !== null && packet[k] !== "");
      if (found !== undefined) {
        const n = Number(packet[found]);
        if (!Number.isFinite(n) || n < 0 || n > 1000) throw new Error(`Invalid ${dest} value in packet.`);
        out[dest] = n;
      }
    }
    if (!Object.keys(out).length) throw new Error("Packet contained no supported fields. Expected heartRate, spo2, and/or sleepHours.");
    out.receivedAt = new Date().toISOString();
    out.deviceTimestamp = typeof packet.timestamp === "string" ? packet.timestamp : null;
    out.rawSummary = Object.keys(out).filter(k => !["receivedAt","deviceTimestamp","rawSummary"].includes(k)).join(", ");
    return out;
  }
  function handleNotification(event) {
    try {
      const dv = event.target.value;
      const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
      const textPacket = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim();
      const parsed = JSON.parse(textPacket);
      const reading = normalizePacket(parsed);
      state.readings.push(reading);
      if (state.readings.length > 1000) state.readings = state.readings.slice(-1000);
      saveState(); renderReadings(); renderConnection();
      $("deviceMessage").textContent = `Received real sensor packet at ${fmtTime(reading.receivedAt)}.`;
    } catch (err) {
      $("deviceMessage").textContent = `Packet not saved: ${err.message || "Unsupported packet format"}`;
    }
  }
  async function connectDevice() {
    if (!("bluetooth" in navigator)) {
      $("deviceMessage").textContent = "Web Bluetooth is unavailable in this browser. Try a compatible Chromium browser on desktop or Android, using HTTPS or localhost.";
      return;
    }
    let serviceUuid, characteristicUuid;
    try {
      serviceUuid = uuidOrThrow($("serviceUuid").value, "service UUID");
      characteristicUuid = uuidOrThrow($("characteristicUuid").value, "notify characteristic UUID");
    } catch (e) { $("deviceMessage").textContent = e.message; return; }
    $("connectBtn").disabled = true;
    $("deviceMessage").textContent = "Choose your wristband in the browser's Bluetooth picker…";
    try {
      bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [serviceUuid] }],
        optionalServices: [serviceUuid]
      });
      bleDevice.addEventListener("gattserverdisconnected", onDisconnected);
      bleServer = await bleDevice.gatt.connect();
      const service = await bleServer.getPrimaryService(serviceUuid);
      bleCharacteristic = await service.getCharacteristic(characteristicUuid);
      if (!bleCharacteristic.properties.notify && !bleCharacteristic.properties.indicate) throw new Error("That characteristic does not support notifications. Configure the firmware to expose a notify/indicate characteristic.");
      await bleCharacteristic.startNotifications();
      bleCharacteristic.addEventListener("characteristicvaluechanged", handleNotification);
      renderConnection();
      $("deviceMessage").textContent = "Connected. Waiting for real sensor notifications from the wristband.";
      toast("Bluetooth connected. Waiting for sensor data.");
    } catch (e) {
      if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) bleDevice.gatt.disconnect();
      bleDevice = null; bleServer = null; bleCharacteristic = null;
      renderConnection();
      $("deviceMessage").textContent = e.name === "NotFoundError" ? "No device selected. Check that the wristband is nearby and advertising the configured service." : (e.message || "Could not connect. Check Bluetooth permissions and firmware UUIDs.");
    } finally { $("connectBtn").disabled = !!(bleDevice && bleDevice.gatt && bleDevice.gatt.connected); }
  }
  function onDisconnected() {
    if (bleCharacteristic) bleCharacteristic.removeEventListener("characteristicvaluechanged", handleNotification);
    bleDevice = null; bleServer = null; bleCharacteristic = null; renderConnection();
    $("deviceMessage").textContent = "Wristband disconnected. Previously received readings remain saved in this browser.";
    toast("Wristband disconnected.");
  }
  $("connectBtn").addEventListener("click", connectDevice);
  $("disconnectBtn").addEventListener("click", () => {
    if (bleCharacteristic) bleCharacteristic.removeEventListener("characteristicvaluechanged", handleNotification);
    if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) bleDevice.gatt.disconnect();
    else onDisconnected();
  });
  $("saveProtocol").addEventListener("click", () => {
    state.settings.serviceUuid = $("serviceUuid").value.trim();
    state.settings.characteristicUuid = $("characteristicUuid").value.trim();
    saveState(); $("protocolMessage").textContent = "Bluetooth settings saved in this browser. Use the exact UUIDs from the firmware.";
    toast("Bluetooth settings saved.");
  });
  $("serviceUuid").value = state.settings.serviceUuid || "";
  $("characteristicUuid").value = state.settings.characteristicUuid || "";

  document.querySelectorAll(".void-card").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".void-card").forEach(b => b.classList.toggle("selected", b === btn));
    const scenes = {
      cosmic:["Cosmic Drift","Breathe in for four, and out for six. Follow the circle at your own pace.","#d8d0fb"],
      ocean:["Ocean of Calm","Imagine each breath moving in and out like a gentle tide.","#c7e9f2"],
      sunset:["Last Light","Soften your shoulders and let the day end without needing to solve everything.","#f6d4df"],
      clouds:["Cloud Nine","Let each thought pass like a cloud. You do not need to chase it.","#e1e4fb"]
    };
    const s = scenes[btn.dataset.scene]; $("sceneTitle").textContent = s[0]; $("sceneDesc").textContent = s[1];
    $("breathingCircle").style.background = `radial-gradient(circle, #fff, ${s[2]})`;
  }));
  function stopBreathing() {
    clearInterval(breathingTimer); breathingTimer = null; breathingPhase = false;
    $("breathingCircle").classList.remove("inhale"); $("breathingText").textContent = "Breathe in"; $("breathingToggle").textContent = "Start breathing";
  }
  $("breathingToggle").addEventListener("click", () => {
    if (breathingTimer) { stopBreathing(); return; }
    $("breathingToggle").textContent = "Stop breathing";
    const step = () => {
      breathingPhase = !breathingPhase;
      $("breathingCircle").classList.toggle("inhale", breathingPhase);
      $("breathingText").textContent = breathingPhase ? "Breathe in" : "Breathe out";
    };
    step(); breathingTimer = setInterval(step, 4000);
  });
  $("releaseWorry").addEventListener("click", () => {
    const text = $("worryText").value.trim();
    if (!text) { $("worryMessage").textContent = "Write a thought first, if you'd like to."; return; }
    $("worryText").value = ""; $("worryMessage").textContent = "Released. Your note was not saved."; toast("Let it drift away. Your note was not stored.");
  });

  $("exportData").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "sleeptrack-data.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("settingsMessage").textContent = "Export prepared. Keep the file private because it may contain health-related data.";
  });
  $("clearData").addEventListener("click", () => {
    if (!confirm("Delete all SleepTrack readings, journal entries, and local preferences from this browser? This cannot be undone.")) return;
    if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) bleDevice.gatt.disconnect();
    state = structuredClone(DEFAULTS); saveState(); setTheme(false); setReduceMotion(false);
    $("serviceUuid").value = ""; $("characteristicUuid").value = ""; renderReadings(); renderJournals(); renderConnection();
    $("settingsMessage").textContent = "Local app data cleared."; toast("Local app data cleared.");
  });

  $("dateLabel").textContent = new Date().toLocaleDateString([], { weekday:"long", month:"long", day:"numeric" }).toUpperCase();
  setTheme(!!state.settings.dark); setReduceMotion(!!state.settings.reduceMotion);
  renderConnection(); renderReadings(); renderJournals();
})();