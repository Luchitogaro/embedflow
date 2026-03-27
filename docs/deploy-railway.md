# Desplegar Embedflow en Railway (worker + web)

Guía paso a paso para un monorepo con **dos servicios** desde el mismo repositorio: **FastAPI** (`worker/`) y **Next.js** (`web/`).

## Antes de empezar

- Cuenta [Railway](https://railway.app) y proyecto **GitHub** con este repo.
- Proyecto **Supabase** con migraciones aplicadas (`supabase/migrations/` en orden).
- **OpenAI API key**.
- (Opcional) Stripe / Mercado Pago / Resend — no son obligatorios para probar el flujo Free.

## Paso 1 — Proyecto en Railway

1. En Railway: **New project** → **Deploy from GitHub repo** → elige `embedflow`.
2. Railway creará un primer servicio; **no** lo uses tal cual: lo reconfiguramos abajo o créalo vacío y añade dos servicios manualmente.

## Paso 2 — Servicio **worker** (FastAPI)

1. **Add service** → **Empty service** (o duplica desde el repo).
2. Abre el servicio → **Settings**:
   - **Root Directory**: `worker`
   - **Build**: debe detectar `worker/Dockerfile` (o `railway.toml` con `builder = DOCKERFILE`).
3. Pestaña **Variables** — añade como mínimo:

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (Dashboard → Settings → API) |
| `SUPABASE_JWT_SECRET` | JWT Secret (Settings → API → JWT) |
| `OPENAI_API_KEY` | Tu clave OpenAI |
| `WORKER_SHARED_SECRET` | Cadena larga aleatoria (la **misma** luego en la web) |
| `ENVIRONMENT` | `production` |
| `APP_URL` | URL **pública** de la app Next (ej. `https://web-production-xxxx.up.railway.app` o tu dominio). Puedes actualizarla después del paso 3. |

Opcionales: `RESEND_*`, modelos OpenAI, límites de chunk (ver `worker/.env.example`).

4. Pestaña **Settings → Networking → Generate domain** (o asigna dominio). Si Railway pide **puerto**, indica el mismo puerto en el que escucha el proceso **dentro del contenedor**:
   - Mira en **Variables** el valor de **`PORT`** (Railway suele inyectar **`8080`** en Docker).
   - Si no hay `PORT` y el contenedor usa el valor por defecto del Dockerfile, suele ser **`8000`**.
   - El número del formulario debe coincidir con ese puerto (no uses 80 ni 443 ahí).

5. **Deploy**. Comprueba en el navegador: `https://<tu-worker>.up.railway.app/health` → JSON con `status: healthy`.

**Nota:** Railway inyecta `PORT`; el `Dockerfile` del worker usa `uvicorn ... --port ${PORT}`. No hace falta fijar `WORKER_PORT` en producción.

## Paso 3 — Servicio **web** (Next.js)

1. **Add service** → de nuevo desde el **mismo repo**.
2. **Settings**:
   - **Root Directory**: `web`
3. **Variables** — obligatorias para build **y** runtime:

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Misma URL que en Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (solo servidor; no es `NEXT_PUBLIC_`) |
| `WORKER_URL` | URL pública del worker del paso 2 (**https**, sin barra final) |
| `WORKER_SHARED_SECRET` | **Idéntica** a la del worker |
| `NEXT_PUBLIC_APP_URL` | URL pública de **esta** app web (la generarás en el paso 4) |

Para un demo sin cobros, Stripe/Mercado Pago pueden omitirse. La página de facturación muestra **“pronto disponible”** mientras `EMBEDFLOW_BILLING_COMING_SOON` no sea el string `false` (comportamiento por defecto si no defines la variable). Cuando tengas checkout listo, pon `EMBEDFLOW_BILLING_COMING_SOON=false` en el servicio web.

Si más adelante activas billing, añade también las variables de `web/.env.example` (Stripe/Mercado Pago).

4. **Build en Docker y `NEXT_PUBLIC_*`:** el `web/Dockerfile` declara `ARG` para `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. En Railway, con las variables definidas en el servicio, suelen pasarse al build; si el build falla con valores vacíos en el cliente, revisa en la documentación de Railway **Docker build arguments** / variables disponibles en la fase de build.

5. **Deploy** y espera a que el build termine.

6. **Networking → Generate domain** para la web. Copia la URL (ej. `https://web-production-yyyy.up.railway.app`).

7. Vuelve al **worker** y actualiza `APP_URL` con esa URL pública de la web. **Redeploy** el worker si hace falta.

8. Opcional: en la **web**, fija `NEXT_PUBLIC_APP_URL` igual a la URL pública de la web (útil para enlaces, OG y checkout; si no, en servidor a veces ayuda `RAILWAY_PUBLIC_DOMAIN` vía `getSiteUrl()`).

## Paso 4 — Supabase (Auth y redirects)

1. **Authentication → URL configuration**:
   - **Site URL**: URL pública de la web en Railway.
   - **Redirect URLs**: añade la misma URL y `https://<tu-web>/auth/callback` si aplica a tu flujo.
2. **Storage**: bucket `contracts` con límite de subida acorde a la app (véase README principal).

## Paso 5 — Probar el flujo

1. Abre la URL de la web → registro / login.
2. Sube un PDF con texto seleccionable.
3. Si el análisis no arranca: revisa logs del **worker** y que `WORKER_URL` + `WORKER_SHARED_SECRET` coincidan con el worker.

## Paso 6 — Cloudflare (tu dominio)

1. En Cloudflare DNS: **CNAME** de `app.tudominio.com` → el hostname que te da Railway para la **web** (o el target que indique Railway para custom domain).
2. En Railway (servicio web): **Settings → Networking → Custom domain** → añade `app.tudominio.com` y completa la verificación.
3. Actualiza en Supabase y en variables `NEXT_PUBLIC_APP_URL` / `APP_URL` del worker a `https://app.tudominio.com`.
4. SSL: en Cloudflare suele usarse **Full (strict)** si el origen (Railway) ya sirve HTTPS.

## Archivos relevantes en el repo

- `worker/Dockerfile`, `worker/railway.toml`, `worker/.dockerignore`
- `web/Dockerfile`, `web/railway.toml`, `web/.dockerignore`
- `web/next.config.ts` — `output: "standalone"` para la imagen Docker

## Cron / cola (avanzado)

Si usas `POST /worker/poll` para drenar cola con un cron externo, configura ese ping contra la URL del **worker** con el mecanismo que uses (Railway Cron, GitHub Actions, etc.). Muchos despliegues procesan jobs en **BackgroundTasks** dentro del mismo proceso al encolar; revisa `worker/services/queue.py` según tu modo de operación.
