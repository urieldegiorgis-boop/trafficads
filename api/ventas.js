// api/ventas.js  —  Función serverless de Vercel
// Devuelve las ventas del rango pedido, leídas de la tabla "ventas" de Supabase.
// El HTML llama:  /api/ventas?from=2026-06-01&to=2026-06-30
// Usa las MISMAS variables de entorno que state.js (ya configuradas en Vercel):
//   SUPABASE_URL  y  SUPABASE_SERVICE_ROLE_KEY
//
// Filtra por la fecha de la venta (columna "fecha"). El panel ya descarta los refunds por su cuenta,
// así que aquí se devuelven todas las del rango (incluido el campo "refund") y el panel filtra.

const URL  = process.env.SUPABASE_URL;
const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Campos que necesita el panel. Incluye "acqchannel" (el canal: VSL, Dollardorado, etc.).
// NO se incluye "facturacion" a propósito: lleva datos personales (DNI, dirección…) que el panel no necesita.
const FIELDS = [
  "id", "fecha", "cash", "revenue", "refund", "email", "nombre", "pais",
  "source", "acqchannel", "utm", "offer", "tipo_pago", "deal", "vertical",
  "closer", "setter", "cold_caller"
].join(",");

export default async function handler(req, res) {
  if (!URL || !SKEY) {
    return res.status(500).json({ error: "Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de Vercel." });
  }

  const { from, to } = req.query;

  let url = `${URL}/rest/v1/ventas?select=${encodeURIComponent(FIELDS)}&order=fecha.desc&limit=10000`;
  if (from) url += `&fecha=gte.${encodeURIComponent(from)}`;
  if (to)   url += `&fecha=lte.${encodeURIComponent(to)}`;

  const headers = { apikey: SKEY, Authorization: `Bearer ${SKEY}`, Accept: "application/json" };

  try {
    const r = await fetch(url, { headers });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: `Supabase devolvió ${r.status}`, detail: t.slice(0, 500) });
    }
    const rows = await r.json();
    const ventas = Array.isArray(rows) ? rows : [];
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ventas, count: ventas.length, from: from || null, to: to || null });
  } catch (e) {
    return res.status(500).json({ error: "Error consultando ventas.", detail: String(e).slice(0, 500) });
  }
}
