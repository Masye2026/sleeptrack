export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!serviceKey || !url || !anon) return res.status(503).json({ error: 'Secure account deletion is not configured. Add the server-only Supabase service role key in Vercel.' });
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Please log in again.' });
  const token = auth.slice(7);
  try {
    const check = await fetch(`${url}/auth/v1/user`, { headers:{apikey:anon,Authorization:`Bearer ${token}`} });
    if (!check.ok) return res.status(401).json({error:'Session could not be verified.'});
    const user = await check.json();
    const deleted = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {method:'DELETE',headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
    if (!deleted.ok) { const info=await deleted.json().catch(()=>({})); return res.status(502).json({error:info.message||'Account deletion failed.'}); }
    return res.status(200).json({ok:true});
  } catch { return res.status(502).json({error:'Could not reach the account service.'}); }
}