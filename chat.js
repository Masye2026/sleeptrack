export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: 'OPENAI_API_KEY is missing in Vercel environment variables' });
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Please log in again.' });
  const base = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return res.status(503).json({ error: 'Supabase server configuration is missing.' });
  const token = auth.slice(7);
  const verify = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!verify.ok) return res.status(401).json({ error: 'Your session could not be verified.' });
  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages.slice(-10).filter(m => ['user','assistant'].includes(m.role) && typeof m.content === 'string').map(m => ({role:m.role,content:m.content.slice(0,2000)})) : [];
  if (!messages.length) return res.status(400).json({ error: 'Write a message first.' });
  const logs = Array.isArray(body.sleepLogs) ? body.sleepLogs.slice(0,60) : [];
  const system = `You are SleepTrack's gentle, grounded sleep-education assistant. Be warm and concise, never shame or diagnose. You may summarize only the sleep log data included below, and clearly distinguish observed patterns from possibilities. Do not claim access to live wristband data or any other private data. General health education only, not a doctor. Encourage a trusted adult and healthcare professional for persistent or concerning sleep issues, especially for a young user. Never recommend medication doses. If a user may be in immediate danger, encourage contacting local emergency help and a trusted person. User's saved sleep logs (may be empty): ${JSON.stringify(logs).slice(0,12000)}`;
  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST', headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:process.env.OPENAI_MODEL || 'gpt-4o-mini',messages:[{role:'system',content:system},...messages],temperature:0.5,max_tokens:650})
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(502).json({error:data.error?.message || 'AI provider request failed.'});
    return res.status(200).json({reply:data.choices?.[0]?.message?.content || 'I could not form a reply just now.'});
  } catch { return res.status(502).json({error:'Could not reach the AI provider.'}); }
}