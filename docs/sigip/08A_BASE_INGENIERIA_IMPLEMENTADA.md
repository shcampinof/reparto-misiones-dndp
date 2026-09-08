# Base de ingeniería implementada — SIGIP-DP

> Nota de evolución (8-sep-2026): este documento conserva la fotografía de la fase anterior. `15_MAPEO_MODELO_ORACLE.md` y la rama de persistencia dual sustituyen las afirmaciones vigentes sobre memoria y versión de Node.

**Fase:** PROMPT 1  
**Rama:** `refactor/sigip-mvp`  
**Alcance funcional:** ninguno nuevo; reorganización técnica compatible con el prototipo.

## Decisiones aplicadas

- Se mantiene React + Express porque `08_LINEA_BASE_TECNICA.md` no encontró bloqueo técnico.
- El backend continúa como un único despliegue, con fronteras para `core`, `investigacion`, `victimas`, `assignment`, `reporting` e `integrations`.
- Las fronteras vacías no se presentan como funcionalidades implementadas.
- El reparto existente se conserva únicamente por compatibilidad y queda etiquetado como prototipo. PROMPT 1 no define elegibilidad ni resuelve reglas P.
- La persistencia continúa temporalmente en memoria; esta fase no crea persistencia operativa nueva. Su reemplazo y las migraciones Oracle corresponden a PROMPT 2.

## Estructura resultante

```text
backend/src/
  app/create-app.js
  config/{index,load-env}.js
  infrastructure/demo/demo-users.js
  modules/
    core/{auth,health,portal}/
    investigacion/
    assignment/
    victimas/
    reporting/
    integrations/
  shared/
    errors.js
    logger.js
    middleware/
  server.js
backend/test/{unit,api}/
```

`createApp` compone el proceso sin abrir un puerto, por lo que la API se prueba en memoria. `server.js` queda limitado a cargar ambiente, validar configuración, crear logger, escuchar y atender cierre por `SIGINT`/`SIGTERM`.

## Configuración y modo demo

La configuración valida ambiente, puerto, nivel de log, CORS, secreto JWT, modo demo, roles y credenciales demo mínimas.

- Producción exige `JWT_SECRET` de 32 caracteres o más.
- Producción rechaza `ENABLE_DEMO_ACCOUNTS=true`.
- Desarrollo/test puede generar un secreto efímero si no se proporciona uno.
- Demo está deshabilitado por defecto y necesita contraseña suministrada por ambiente.
- Las contraseñas fijas se retiraron de `backend/src/data.js` y del README.
- `.env.example` no contiene secretos ni contraseñas utilizables.

El proveedor demo permanece separado en `infrastructure/demo`. No reemplaza al adaptador institucional requerido por PROMPT 3.

## Servicios transversales

- Errores centrales con código estable, mensaje y `requestId`.
- Manejo uniforme de ruta inexistente, token inválido, CORS y JSON mal formado.
- Correlación mediante `x-request-id`: se conserva un valor seguro recibido o se genera UUID.
- Logs JSON de finalización y error sin registrar cuerpos, credenciales, narraciones o documentos.
- `GET /api/health` compatible con el contrato anterior y enriquecido.
- `GET /api/health/ready` con comprobaciones explícitas; informa `demo-memory` para no ocultar la deuda de persistencia.
- Configuración CORS por lista de orígenes del ambiente.
- Cabecera `x-powered-by` deshabilitada.

## Compatibilidad de API

Las 15 rutas inventariadas en PROMPT 0 conservan método y URL. Se agregó únicamente `GET /api/health/ready`.

Los errores manejados por el middleware central usan:

```json
{
  "error": {
    "code": "TOKEN_REQUIRED",
    "message": "Token requerido",
    "requestId": "..."
  }
}
```

Las validaciones heredadas todavía usan `{ "message": "..." }`. `frontend/src/api.js` admite ambos contratos durante la migración. La futura normalización completa debe versionarse o caracterizarse antes de retirar el formato legado.

## Calidad y CI

Backend incorpora ESLint, Prettier, `node:test` y Supertest. Las pruebas cubren:

- secreto efímero de desarrollo;
- secreto obligatorio y rechazo de demo en producción;
- salida JSON del logger;
- health, readiness y correlación;
- login demo, selección de cuenta, perfil y bootstrap;
- rechazo de acceso sin token;
- 404 y JSON inválido mediante error central.

Frontend incorpora ESLint y Prettier; `npm run check` termina con build Vite. El workflow `ci.yml` ejecuta checks separados de backend/frontend con Node 20. El workflow de Pages ahora verifica lint y formato antes del build.

## Reglas y módulos afectados

- Arquitectura común: decisiones D de monolito modular, validación backend y trazabilidad técnica.
- RN-COM-000/001/003: solo se endurece la base demo y la autorización existente; identidad institucional y alcance siguen pendientes de PROMPT 3.
- RN-COM-067: se prepara correlación/log técnico, pero no se declara implementada la auditoría de negocio.
- Investigación: se preservan rutas y UI actuales sin afirmar cumplimiento completo.
- Víctimas: solo se crea la frontera modular; no se implementan estados, formularios ni reglas.
- Assignment: solo se aísla la ruta heredada; RN-COM-050 a RN-COM-058 no están implementadas aún.

## Verificación final

- `npm ci` se ejecutó correctamente desde los lockfiles en backend y frontend.
- `npm run check` de backend pasó: lint, formato y 9/9 pruebas unitarias/API.
- `npm run check` de frontend pasó: lint sin advertencias, formato y build Vite de 39 módulos.
- Los smoke tests confirmaron health, readiness, correlación, login demo explícito, selección de cuenta y bootstrap con 4 misiones/17 especialidades del fixture.
- La SPA compilada respondió HTTP 200 mediante `vite preview`.
- `npm audit --omit=dev` del backend reportó 0 vulnerabilidades.
- No se hizo push, despliegue ni modificación de infraestructura externa.

## Migraciones

No se crearon migraciones ni esquema. Oracle, repositorios persistentes, auditoría y outbox corresponden a PROMPT 2. Los arreglos existentes permanecen identificados como fixture/prototipo y no deben crecer como persistencia operativa.

## Deuda pendiente

- Separar por completo el fixture operativo de `data.js` mediante repositorios.
- Sustituir autenticación demo por adaptador institucional y autorización por recurso/área.
- Reemplazar asignación elegida por cliente con el motor transaccional de PROMPT 5.
- Parametrizar plazos, calendarios, semáforos, catálogos y coberturas.
- Normalizar el contrato de errores heredado.
- Añadir OpenAPI, métricas, trazas y health checks de Oracle/adaptadores cuando existan.
- Backend quedó en 0 vulnerabilidades después de `npm audit fix` sin cambios mayores.
- Frontend conserva 4 hallazgos en la auditoría completa (3 moderados y 1 alto) y 2 moderados en dependencias de producción. Corresponden a Vite/esbuild y React Router; las correcciones disponibles migran a Vite 8 y React Router 7. No se aplicó `npm audit fix --force` porque son cambios mayores que requieren una fase de migración y pruebas específica.

## Operación local

No hay pasos de despliegue ni infraestructura externa. Para desarrollo:

1. copiar `.env.example` a `.env`;
2. activar demo explícitamente y definir una contraseña local si se necesita login;
3. ejecutar `npm ci && npm run check` en backend y frontend;
4. iniciar API y SPA según el README.

No se debe activar modo demo ni usar el proveedor en un ambiente institucional.
