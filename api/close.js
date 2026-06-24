// api/close.js  —  Función serverless de Vercel
// Conecta el panel VSL con Close CRM. La API key vive SOLO aquí (servidor), nunca en el navegador.
// El HTML llama:  /api/close?from=2026-06-01&to=2026-06-30&view=leads

const BASE = "https://api.close.com/api/v1";

export default async function handler(req, res) {
  const KEY = process.env.CLOSE_API_KEY;
  if (!KEY) return res.status(500).json({ error: "Falta CLOSE_API_KEY en las variables de entorno de Vercel." });

  const { from, to, view } = req.query;
  if (!from || !to) return res.status(400).json({ error: "Faltan parámetros from/to." });

  // ─────────── CONFIGURA AQUÍ tus campos de Close ───────────
  // IDs de campos personalizados (Settings → Custom Fields, o GET /custom_field/lead/). Empiezan por "cf_".
  const CF_CALL = process.env.CLOSE_FIELD_CALL_DATE || ""; // campo "Call date" (fecha de la llamada agendada)
  const CF_CREA = process.env.CLOSE_FIELD_CREATIVE  || ""; // campo "Creativo / Ad / ángulo"
  const CF_SRC  = process.env.CLOSE_FIELD_SOURCE    || ""; // campo "Source"
  const SRC_VAL = process.env.CLOSE_SOURCE_VALUE    || "VSL"; // valor de Source que se queda (p.ej. "VSL")
  const EXTRA   = process.env.CLOSE_LEAD_QUERY       || ""; // filtro extra opcional (p.ej. limitar a leads de VSL)
  // Se filtra el rango por el Call date si está configurado; si no, por la fecha de creación del lead.
  const dateField = CF_CALL ? `custom.${CF_CALL}` : "date_created";
  // ───────────────────────────────────────────────────────────

  const auth = "Basic " + Buffer.from(KEY + ":").toString("base64");
  const headers = { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" };

  let query = `${dateField} >= "${from}" and ${dateField} <= "${to}"`;
  if (EXTRA) query += ` and (${EXTRA})`;

  const fields = "id,display_name,status_label,contacts,date_created,custom";
  const leads = [];
  let skip = 0, guard = 0;

  try {
    while (guard++ < 50) {
      const url = `${BASE}/lead/?_limit=200&_skip=${skip}&_fields=${encodeURIComponent(fields)}&query=${encodeURIComponent(query)}`;
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const txt = await r.text();
        return res.status(r.status).json({ error: `Close devolvió ${r.status}`, detail: txt.slice(0, 500) });
      }
      const json = await r.json();
      for (const lead of (json.data || [])) {
        const contact = (lead.contacts && lead.contacts[0]) || {};
        const email = (contact.emails && contact.emails[0] && contact.emails[0].email) || "";
        leads.push({
          id: lead.id,
          name: contact.name || "",
          email: email,
          company: lead.display_name || "",
          status: lead.status_label || "",
          created: lead.date_created || "",
          call_date: CF_CALL ? (lead["custom." + CF_CALL] || "") : "",
          creative:  CF_CREA ? (lead["custom." + CF_CREA] || "") : "",
          source:    CF_SRC  ? (lead["custom." + CF_SRC]  || "") : ""
        });
      }
      if (!json.has_more) break;
      skip += 200;
    }

    // Refiltrado exacto por Call date en el servidor (Close puede devolver alguno de más).
    let out = leads;
    if (CF_CALL) {
      const lo = from, hi = to; // 'YYYY-MM-DD'
      out = out.filter(l => {
        if (!l.call_date) return false;
        const d = String(l.call_date).slice(0, 10); // normaliza a YYYY-MM-DD
        return d >= lo && d <= hi;
      });
    }

    // Solo leads cuyo Source coincide (p.ej. "VSL").
    if (CF_SRC) {
      const want = SRC_VAL.trim().toLowerCase();
      out = out.filter(l => String(l.source || "").trim().toLowerCase() === want);
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ leads: out, count: out.length, from, to, view: view || "leads" });
  } catch (e) {
    return res.status(500).json({ error: "Error consultando Close.", detail: String(e).slice(0, 500) });
  }
}
