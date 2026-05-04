# Reset de datos en Supabase (solo cuentas operadoras)

El archivo SQL **`supabase/scripts/reset_client_data_keep_operators.sql`** vacía documentos, análisis, uso, intents, organizaciones y usuarios que **no** estén en la lista `keeper_emails` al inicio del script.

Conserva **`subscription_plan_catalog`** (precios Wompi).

## Antes

- Backup o export de Supabase.
- Editar el `INSERT INTO keeper_emails` con los correos reales (minúsculas recomendadas).

## Ejecución

1. Supabase Dashboard → **SQL Editor**.
2. Pegar el contenido del script (tras editar emails).
3. Ejecutar con un rol que pueda borrar en `public` y `auth` (típico **postgres** / service).

El bloque final borra filas en `auth.users` que ya no tienen fila en `public.users` (usuarios eliminados del lado público).

Si algo falla por FK u orden de tablas, revisa migraciones recientes y ejecuta en una transacción con rollback de prueba.

**Storage:** los archivos en el bucket de contratos pueden quedar huérfanos; si hace falta, límpialos desde **Storage** en Supabase o con la CLI.
