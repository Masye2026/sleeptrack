# SleepTrack — Moonlit Edition

A dreamy responsive SleepTrack web app with real Supabase authentication and database persistence, favorite tips, account-based messages, sleep logs, export, a server-side AI endpoint, account deletion endpoint, and a Bluetooth integration gate that refuses to invent wristband readings.

## What is real vs what still needs setup

**Real after configuration:** email/password sign up and login, Supabase session persistence, saved sleep logs, favorites, profile edits, friend lookup by registered email, messages, logout, data export, and account deletion endpoint.

**Needs credentials:** Supabase project and SQL setup; Vercel environment variables; OpenAI API key for AI chat.

**Needs actual hardware documentation:** wristband service UUID, characteristic UUID, and packet format. Device connection is deliberately disabled until those real values are entered. `parseDevicePacket()` is intentionally unimplemented so the app will not fabricate readings.

**Videos:** this version links to YouTube search results for established health sources rather than pretending that a specific video ID was verified. Replace these with exact reviewed video IDs in `videoData` if you want embedded player playback.

## 1. Create the Supabase backend

1. Create a project at https://supabase.com/ (free tier may be sufficient for development).
2. Open **SQL Editor → New query**, paste all of `supabase-setup.sql`, and run it.
3. Open **Project Settings → API**. Copy Project URL and the **anon/public** key.
4. Edit `config.js` and replace the two `PASTE_...` values. The anon key is designed to be public; database security comes from RLS policies in the SQL.
5. In Supabase **Authentication → URL Configuration**, add your deployed app URL to Site URL and Redirect URLs. During development add `http://localhost:3000` and your Vercel domain.
6. For the simplest test, configure email confirmation according to your preference in Authentication settings. If confirmations are enabled, users must confirm before logging in.

## 2. Deploy to Vercel

1. Upload the files and folders from this project into the root of your GitHub repository.
2. Import the repository in https://vercel.com/ and deploy.
3. In Vercel → Project → Settings → Environment Variables, add:
   - `SUPABASE_URL` = same project URL
   - `SUPABASE_ANON_KEY` = same anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase **service_role/secret key**, server-side only, needed only for account deletion. Never put it in `config.js`, HTML, or GitHub.
   - `OPENAI_API_KEY` = OpenAI API key, server-side only, needed for AI chat.
   - Optional `OPENAI_MODEL` = `gpt-4o-mini`
4. Redeploy after adding environment variables.
5. Add the deployed Vercel URL to Supabase Auth URL Configuration.

**Security:** Never expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` to the browser or commit them to GitHub. Keep them only in Vercel environment variables. Rotate keys immediately if accidentally exposed.

## 3. Local preview

Use a local web server (not `file://`) because browser modules and Bluetooth APIs require a secure context or localhost. With Node installed, run:

```bash
npx serve . -l 3000
```

Then open `http://localhost:3000`. Or just deploy to Vercel.

## 4. Bluetooth wristband

Web Bluetooth support varies by browser and OS; Chrome/Edge on compatible devices are typical options, while Safari does not currently provide the same Web Bluetooth API. HTTPS is required outside localhost.

When the physical wristband firmware is ready:
1. Set `BLE_SERVICE_UUID` and `BLE_CHARACTERISTIC_UUID` in `config.js` to the exact UUIDs advertised by the hardware.
2. Confirm whether readings arrive through notifications and document their byte format, endian order, units, and versioning.
3. Implement `parseDevicePacket(value)` in `app.js` using that documented format.
4. Set `BLE_PACKET_FORMAT_CONFIRMED: true`.
5. Test with real hardware and compare decoded values against a known test packet.

No live readings, heart rate, sleep stages, or oxygen values are fabricated by this app.

## 5. Included features

- Responsive moonlit UI and animated The Void scene
- Email/password auth, account session, profile edit and logout
- Sleep log create/update by date; data stored in Supabase
- Favorite tips saved to account
- Find a friend by registered email and account-to-account messaging
- Export profile, sleep logs and favorites as JSON
- AI chat endpoint that verifies the session and passes the user's saved sleep logs to the model
- Account deletion endpoint using Supabase Admin API
- Educational links for health sources and YouTube search results
