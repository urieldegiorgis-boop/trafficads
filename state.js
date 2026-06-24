// api/state.js  —  Persistencia en Supabase, separada por panel con ?ns=
//
// Crea esta tabla una vez en Supabase (SQL Editor):
//   create table if not exists panel_state (
//     ns text primary key,
//     data jsonb,
//     updated_at timestamptz default now()
//   );
//
// El panel VSL usa  ns=vsl.  Tu dashboard de rendimiento, al no enviar ns, usa "default".
// Así NO se pisan entre ellos aunque compartan la misma función y base de datos.

const URL  = process.env.SUPABASE_URL;
const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (!URL || !SKEY) return res.status(500).json({ error: "Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY." });

  const ns = (req.query.ns || "default").toString();
  const base = `${URL}/rest/v1/panel_state`;
  const headers = { apikey: SKEY, Authorization: `Bearer ${SKEY}`, "Content-Type": "application/json" };

  try {
    if (req.method === "GET") {
      const r = await fetch(`${base}?ns=eq.${encodeURIComponent(ns)}&select=data`, { headers });
      const rows = await r.json();
      return res.status(200).json((rows && rows[0] && rows[0].data) || {});
    }
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const r = await fetch(`${base}?on_conflict=ns`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([{ ns, data: body, updated_at: new Date().toISOString() }])
      });
      if (!r.ok) { const t = await r.text(); return res.status(r.status).json({ error: t.slice(0, 300) }); }
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: String(e).slice(0, 300) });
  }
}
