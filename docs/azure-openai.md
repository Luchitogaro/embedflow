# Guía: Azure OpenAI para el worker de Embedflow

El worker usa el SDK oficial de OpenAI en modo **Azure** cuando defines `AZURE_OPENAI_ENDPOINT`. Las variables `OPENAI_MODEL`, `OPENAI_MODEL_CHUNK` y `OPENAI_MODEL_MERGE` deben coincidir con el **nombre del deployment** en Azure, no necesariamente con el nombre comercial del modelo en el catálogo.

**No configures `OPENAI_BASE_URL`** si usas Azure: el cliente se resuelve por `AZURE_OPENAI_ENDPOINT`.

---

## 1. Requisitos en Azure

1. Cuenta de Azure con permiso para crear recursos.
2. Suscripción activa.
3. Acceso al servicio **Azure OpenAI** (en algunas regiones hace falta **solicitar acceso** o usar **Azure AI Foundry** según el flujo actual del portal).

La interfaz exacta cambia con el tiempo; busca en el portal **“Azure OpenAI”** o **“Azure AI Foundry”** → creación de recurso y despliegues de modelos.

---

## 2. Crear el recurso y los deployments

1. **Crear recurso** Azure OpenAI (o proyecto en Foundry) en la **región** que quieras (ten en cuenta residencia de datos y latencia).
2. En **Model deployments** (o equivalente), crea **tres deployments** como mínimo, alineados con el pipeline del worker:

   | Uso en Embedflow | Variable de entorno | Ejemplo de deployment name |
   |------------------|---------------------|----------------------------|
   | Extracción “merge”, contratos cortos, pitch | `OPENAI_MODEL`, `OPENAI_MODEL_MERGE` | `gpt-4o` |
   | Fase “map” por chunks (más barata) | `OPENAI_MODEL_CHUNK` | `gpt-4o-mini` |

   Los nombres de la columna derecha son **ejemplos**: en Azure el **deployment name** lo eliges tú (p. ej. `embedflow-merge`, `embedflow-chunk`). Ese nombre es el que va en las variables `OPENAI_*`.

3. Asegúrate de que cada deployment tenga **cuota / TPM** suficiente. El worker hace **varias llamadas** por documento largo (map en paralelo con `OPENAI_CHUNK_MAP_CONCURRENCY`, luego merge y pitch). Si ves **429**, baja concurrencia o sube límites en Azure.

---

## 3. Endpoint y clave API

1. En el recurso: **Keys and Endpoint** (o sección similar).
2. **Endpoint** (`https://TU_RECURSO.openai.azure.com`): sin barra final. Ese valor es `AZURE_OPENAI_ENDPOINT`.
3. **Key 1** o **Key 2**: `AZURE_OPENAI_API_KEY` (o puedes reutilizar `OPENAI_API_KEY` si prefieres una sola variable; el worker acepta ambas).

No publiques estas claves en el frontend: solo en el **worker** (Railway, VPS, etc.).

---

## 4. Versión de API

El worker usa por defecto:

`AZURE_OPENAI_API_VERSION=2024-02-01`

Si Azure te indica una versión distinta compatible con Chat Completions en tu región, puedes sobreescribirla. Si las llamadas fallan con error de API version, revisa la [documentación actual de Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/) para tu tipo de recurso.

---

## 5. Variables de entorno del worker (resumen)

Copia y ajusta en Railway, `.env` local o tu orquestador:

```bash
# Obligatorio para modo Azure
AZURE_OPENAI_ENDPOINT=https://TU_RECURSO.openai.azure.com
AZURE_OPENAI_API_KEY=tu-clave
# Opcional si la predeterminada no sirve en tu región
# AZURE_OPENAI_API_VERSION=2024-02-01

# Nombres de deployment en Azure (los que creaste en el portal)
OPENAI_MODEL=nombre-deployment-calidad
OPENAI_MODEL_CHUNK=nombre-deployment-barato
OPENAI_MODEL_MERGE=nombre-deployment-calidad

# NO uses OPENAI_BASE_URL con Azure
# OPENAI_API_KEY puede sustituir a AZURE_OPENAI_API_KEY si quieres unificar
```

El resto (`OPENAI_CHUNK_*`, timeouts, etc.) sigue igual que en `worker/.env.example`.

---

## 6. Comprobar que funciona

1. Despliega el worker con las variables anteriores.
2. Sube un PDF de prueba desde la app.
3. Revisa logs del worker: no debería aparecer `OPENAI_API_KEY not set` en modo Azure si la clave Azure está bien.
4. Si el error menciona **deployment not found**, el nombre en `OPENAI_MODEL*` no coincide con el deployment en Azure.

---

## 7. Privacidad y contrato (B2B)

- Revisa el **DPA** y las condiciones del plan Azure aplicable a tu suscripción.
- Elige **región** y opciones de **retención / logging** acordes a tu política y a lo que prometes a clientes.
- El texto del consentimiento en la app (`aiProcessingConsent`) debe ser coherente con que el procesamiento puede hacerse vía **proveedor configurado** (incluido Azure).

---

## 8. Volver a OpenAI público o a un gateway privado

- **OpenAI (api.openai.com):** elimina `AZURE_OPENAI_ENDPOINT` y define solo `OPENAI_API_KEY` y los modelos por nombre (`gpt-4o`, etc.).
- **VPS / vLLM / LiteLLM:** elimina `AZURE_OPENAI_ENDPOINT`, define `OPENAI_BASE_URL` y `OPENAI_API_KEY` según tu gateway.

---

## Referencias en el repo

- Lógica del cliente: `worker/services/extractor.py` (`AzureOpenAI` vs `OpenAI`).
- Lista completa de variables: `worker/.env.example`.
- Despliegue del worker: [deploy-railway.md](./deploy-railway.md).
