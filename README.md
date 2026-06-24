# Lathos · Panel VSL — Guía de despliegue

Panel de métricas VSL conectado a Close CRM, desplegado en Vercel con histórico en Supabase.

```
lathos-vsl/
├── index.html        ← el panel (se sirve en la raíz de la web)
├── package.json      ← marca el proyecto como ES modules
├── schema.sql        ← tabla de Supabase (ejecutar una vez)
└── api/
    ├── close.js      ← lee leads de Close (la API key vive aquí, no en el navegador)
    └── state.js      ← guarda/lee el histórico en Supabase
```

El orden recomendado es: **Supabase → datos de Close → GitHub → Vercel**. Así, cuando llegues a Vercel ya tienes todas las claves que hay que pegar.

---

## 1) Supabase (base de datos del histórico)

1. Entra en https://supabase.com → **New project** (elige nombre y una contraseña; región la más cercana).
2. Espera a que termine de crearse (1-2 min).
3. Menú lateral → **SQL Editor** → **New query** → pega el contenido de `schema.sql` → **Run**.
   - Debe decir "Success. No rows returned" → la tabla `panel_state` ya existe.
4. Menú lateral → **Project Settings** → **API**. Apunta dos valores:
   - **Project URL** → será `SUPABASE_URL` (algo como `https://xxxx.supabase.co`).
   - **service_role** secret (en "Project API keys") → será `SUPABASE_SERVICE_ROLE_KEY`.
   - ⚠️ La `service_role` es secreta. No la pongas nunca en el HTML ni la subas a GitHub. Solo va en las variables de entorno de Vercel.

---

## 2) Datos de Close (la key y los 2 campos)

1. **API key**: en Close → Settings → Integrations → **API Keys** → "+ New API Key". Cópiala → será `CLOSE_API_KEY`.
2. **Los dos campos personalizados** (Call date y utm_term). Saca sus `cf_...` con este comando (sustituye TU_API_KEY; ojo a los dos puntos finales tras la key):

   ```bash
   curl -s -u "TU_API_KEY:" https://api.close.com/api/v1/custom_field/lead/
   ```

   Te devuelve una lista de campos con su `id` (empieza por `cf_`) y su `name`. Busca:
   - el de **Call date** → su `id` será `CLOSE_FIELD_CALL_DATE`
   - el de **utm_term** → su `id` será `CLOSE_FIELD_CREATIVE`

   (Si prefieres, también puedes verlos en Settings → Custom Fields.)

---

## 3) GitHub (subir el código)

1. Crea una cuenta/repo en https://github.com → **New repository** → nombre `lathos-vsl` → **Private** → Create.
2. Sube los archivos. Lo más fácil sin terminal: en la página del repo vacío → **uploading an existing file** → arrastra **todo el contenido** de esta carpeta (incluida la subcarpeta `api/`) → **Commit changes**.
   - Importante: que `index.html` quede en la raíz y `close.js`/`state.js` dentro de `api/`.

---

## 4) Vercel (desplegar)

1. Entra en https://vercel.com con tu cuenta de GitHub → **Add New… → Project**.
2. **Import** el repo `lathos-vsl`.
3. Framework Preset: **Other** (no toques Build/Output; es estático + funciones).
4. Abre **Environment Variables** y añade estas (Name = Value):

   | Name | Value |
   |---|---|
   | `CLOSE_API_KEY` | tu key de Close |
   | `CLOSE_FIELD_CALL_DATE` | `cf_...` del Call date |
   | `CLOSE_FIELD_CREATIVE` | `cf_...` del utm_term |
   | `SUPABASE_URL` | URL del proyecto Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role de Supabase |
   | `CLOSE_LEAD_QUERY` | (opcional) filtro extra, p.ej. para limitar a VSL |

5. **Deploy**. En ~1 min te da una URL (`https://lathos-vsl-xxx.vercel.app`).

---

## 5) Probar

1. Abre la URL. Verás el panel.
2. Pestaña **Leads de Close** → elige rango → **↻ Sincronizar Close**.
   - Si trae leads → ✅ todo conectado.
   - Si da error → mira el "Detalle" del aviso (suele ser key mal puesta o un `cf_` equivocado).
3. Pestaña **Métricas** → las Llamadas se rellenan solas con los leads sincronizados.
4. Pestaña **Creativos** → ranking por utm_term.

### Si cambias una variable de entorno
Vercel no la aplica hasta volver a desplegar: pestaña **Deployments** → último deploy → **Redeploy**.

### Convivencia con el otro panel
Este panel guarda en Supabase con `ns=vsl`. Tu dashboard de rendimiento usa `ns=default`. Pueden compartir la misma base de datos sin pisarse.
