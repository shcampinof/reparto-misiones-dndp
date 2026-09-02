# SIGIP-DP

Base técnica del Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo.

El repositorio mantiene React + Express como monolito modular inicial. El flujo visible continúa siendo un prototipo de Investigación; Víctimas, persistencia Oracle y el motor real de reparto se implementarán en fases posteriores conforme a [`docs/sigip/`](docs/sigip/00_LEEME.md).

## Requisitos

- Node.js 20 LTS recomendado (mínimo declarado: 18).
- npm con soporte para `npm ci`.

## Instalación y ejecución

```bash
cd backend
npm ci
npm start
```

En otra terminal:

```bash
cd frontend
npm ci
npm run dev
```

La API usa `http://localhost:4000` y la SPA `http://localhost:5173` por defecto.

## Configuración

Copie `.env.example` a `.env` local. `.env` está ignorado y nunca debe versionarse.

- `NODE_ENV`: `development`, `test` o `production`.
- `JWT_SECRET`: obligatorio en producción y con al menos 32 caracteres. Si falta en desarrollo se genera uno efímero.
- `CORS_ORIGINS`: lista separada por comas.
- `LOG_LEVEL`: `debug`, `info`, `warn`, `error` o `silent`.
- `ENABLE_DEMO_ACCOUNTS`: solo se admite en `development`/`test` y queda deshabilitado por defecto.

Para usar el prototipo local, active explícitamente el modo demo y defina una contraseña:

```dotenv
NODE_ENV=development
ENABLE_DEMO_ACCOUNTS=true
DEMO_ADMIN_USER=admin
DEMO_ADMIN_PASSWORD=una-clave-local-no-versionada
```

Las credenciales fijas publicadas por el prototipo anterior fueron retiradas. El modo demo no puede iniciar en producción.

## Verificaciones

Backend:

```bash
cd backend
npm run check
```

Esto ejecuta lint, formato y pruebas unitarias/API. Los comandos individuales son `npm run lint`, `npm run format:check`, `npm run test:unit` y `npm run test:api`.

Frontend:

```bash
cd frontend
npm run check
```

Esto ejecuta lint, formato y build de producción.

## Arquitectura

```text
backend/src/
  app/                    composición y arranque HTTP
  config/                 carga y validación por ambiente
  modules/
    core/                 identidad demo, autorización, portal y salud
    investigacion/        compatibilidad del flujo investigativo actual
    victimas/             frontera reservada, sin flujo implementado
    assignment/           frontera del reparto; aún conserva el prototipo
    reporting/            frontera de lecturas e indicadores
    integrations/         frontera para adaptadores externos
  infrastructure/demo/    proveedor de cuentas exclusivamente local/test
  shared/                 errores, logs y middleware transversal
```

Los endpoints existentes conservan sus rutas. Los errores centrales nuevos usan `{ error: { code, message, requestId } }`; el cliente acepta también el contrato legado `{ message }` durante la migración.

`GET /api/health` conserva `ok` y `service`, y agrega versión, ambiente, uptime y correlación. `GET /api/health/ready` hace explícito que la persistencia actual sigue siendo `demo-memory`.

## Límites actuales

- La API aún usa arreglos en memoria y pierde cambios al reiniciar.
- El reparto “automático” sigue siendo la simulación del prototipo; no es un motor confiable.
- Los plazos y semáforos visibles son datos heredados pendientes de parametrización.
- No existe todavía flujo de Víctimas ni integraciones reales.
- GitHub Pages publica únicamente la SPA; no constituye un despliegue funcional de la API.

Consulte [la línea base técnica](docs/sigip/08_LINEA_BASE_TECNICA.md) y [la base de ingeniería implementada](docs/sigip/08A_BASE_INGENIERIA_IMPLEMENTADA.md) antes de continuar con la siguiente fase.
