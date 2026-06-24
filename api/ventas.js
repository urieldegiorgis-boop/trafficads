// api/ventas.js — Lee las ventas (cash) desde la tabla "ventas" de Supabase
const URL  = process.env.SUPABASE_URL;
const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (!URL || !SKEY) return res.status(500).json({ error: "Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY." });

  const { from, to, source } = req.query;
  const cols = "email,fecha,utm,source,cash,revenue,refund,deal,vertical,closer,setter";
  let q = `${URL}/rest/v1/ventas?select=${encodeURIComponent(cols)}&order=fecha.desc`;
  if (from)   q += `&fecha=gte.${encodeURIComponent(from)}`;
  if (to)     q += `&fecha=lte.${encodeURIComponent(to)}`;
  if (source) q += `&source=eq.${encodeURIComponent(source)}`;

  try {
    const r = await fetch(q, { headers: { apikey: SKEY, Authorization: `Bearer ${SKEY}` } });
    if (!r.ok) { const t = await r.text(); return res.status(r.status).json({ error: t.slice(0, 400) }); }
    const rows = await r.json();
    const ventas = (Array.isArray(rows) ? rows : []).map(v => ({
      email: v.email || "", fecha: v.fecha || "", utm: v.utm || "", source: v.source || "",
      cash: parseFloat(v.cash) || 0, revenue: parseFloat(v.revenue) || 0,
      refund: v.refund || "", deal: v.deal || "", vertical: v.vertical || ""
    }));
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ventas, count: ventas.length, from, to });
  } catch (e) {
    return res.status(500).json({ error: String(e).slice(0, 400) });
  }
}
