# Monitoring baseline (mostly free)

Phase 7 asks you to **wire alerts outside the repo**. Below is a practical stack that costs **$0** at small scale and covers web, worker, billing, and AI spend.

Do **not** commit API keys or webhook URLs into git.

## 1. Web app (Next.js)

| Qué | Dónde | Gratis | Para qué sirve |
|-----|--------|--------|----------------|
| **Uptime** | [UptimeRobot](https://uptimerobot.com) (50 monitores en plan gratuito) o [Better Stack Uptime](https://betterstack.com/uptime) | Sí | HTTP(S) cada 5 min a `https://tu-dominio/api/v1/health` (o la ruta pública que uses). Email si cae. |
| **Errores de front/back** | [Sentry](https://sentry.io) (plan Developer) | Sí (cuota mensual) | Stack traces, releases, alertas por email/Slack. Integra bien con Next.js. |
| **Hosting** | Si usas **Vercel**: panel *Deployments* + *Runtime Logs* | Sí (Hobby) | 5xx y logs sin coste extra; activa notificación de *failed deployment*. |

**Mejor relación esfuerzo/valor:** UptimeRobot + Sentry (o solo UptimeRobot al principio).

## 2. Worker (FastAPI)

| Qué | Dónde | Gratis | Para qué sirve |
|-----|--------|--------|----------------|
| **Uptime** | Mismo UptimeRobot: `GET` a la URL pública del worker (p. ej. `/health` o `/docs` si está expuesto) | Sí | Saber si el proceso/respondedor HTTP murió. |
| **Plataforma** | **Fly.io** / **Railway** / etc. | Tier gratuito limitado | Health checks y reinicios automáticos suelen incluirse; revisa la doc del proveedor. |
| **Errores** | Sentry SDK en Python (opcional) | Misma cuota Sentry | Unifica errores worker + web en un sitio. |

Si el worker **no** tiene URL pública, el uptime HTTP no aplica: entonces confía en logs del proveedor + alertas de **fallos de análisis** vía Supabase/DB o correos del worker (Resend).

## 3. Stripe (webhooks y cobros)

| Qué | Dónde | Gratis | Para qué sirve |
|-----|--------|--------|----------------|
| **Webhooks fallidos** | Stripe Dashboard → *Developers* → *Webhooks* → tu endpoint → historial | Sí | Reenviar eventos y ver 4xx/5xx. |
| **Avisos** | Stripe → *Settings* → notificaciones / informes (según región) | Sí | Al menos revisar semanalmente webhooks y disputas. |

**Imprescindible:** tras cada deploy, comprobar que la URL del webhook y `STRIPE_WEBHOOK_SECRET` coinciden con producción (`release-checklist.md`).

## 4. Supabase

| Qué | Dónde | Gratis | Para qué sirve |
|-----|--------|--------|----------------|
| **Estado del proyecto** | Dashboard → *Reports* / uso de DB y Auth | Sí (límites del plan) | Picos de conexiones, almacenamiento. |
| **Storage** | Límite de tamaño de subida del bucket `contracts` | — | Debe alinearse con `UPLOAD_MAX_FILE_MB` (ver README). |

Los **logs detallados** avanzados pueden ser de pago según plan; para empezar basta dashboard + errores en Sentry/Vercel.

## 5. OpenAI

| Qué | Dónde | Gratis | Para qué sirve |
|-----|--------|--------|----------------|
| **Uso y límites** | [platform.openai.com](https://platform.openai.com) → Usage / Limits | Sí (cuenta) | Ver TPM, spend, 429. |
| **Presupuesto** | *Settings* → límites / alertas de gasto (si tu cuenta lo ofrece) | Sí | Evitar sorpresas cuando suba el tráfico. |

Ajusta en el worker `OPENAI_CHUNK_MAP_CONCURRENCY` y tamaños de chunk según tu TPM (README y `.env.example`).

## 6. Resend (email “análisis listo”)

| Qué | Dónde | Gratis | Para qué sirve |
|-----|--------|--------|----------------|
| **Entregas** | Dashboard Resend → logs | Tier gratuito limitado | Ver bounces y fallos de API. |

## Orden recomendado (1 hora)

1. **UptimeRobot** (o similar): web `GET /api/v1/health` + worker si hay URL pública.  
2. **Stripe**: revisar webhook endpoint en prod y un envío de prueba.  
3. **OpenAI**: mirar Usage y límites; alinear env del worker.  
4. **Sentry** en Next.js cuando quieras errores con contexto (siguiente mejora).  
5. Leer `incident-response.md` y hacer **un rollback de prueba en staging** (criterio de cierre de fase 7).

Cuando esto esté activo, puedes marcar en `PRODUCTION_HARDENING_PLAN.md` el ítem de monitoring como cumplido en tu proceso interno (las integraciones concretas no van en el repo).
