# SIGIP-DP

Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo. Mantiene un monolito modular React + Express, flujos separados de Investigación y Víctimas y una sola base de código con persistencia intercambiable.

- Repositorio canónico: `https://github.com/shcampinof/reparto-misiones-dndp`
- Space canónico: `https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp`
- Aplicación de presentación: `https://shcampinof-reparto-misiones-dndp.hf.space`

> El perfil de presentación usa únicamente identidades, solicitudes y referencias ficticias. No contiene datos, documentos ni credenciales institucionales.

## Perfiles de ejecución

| Perfil | Driver | Uso |
|---|---|---|
| `APP_PROFILE=presentation` | `PERSISTENCE_DRIVER=sqlite` | Base local migrada, información reproducible y experiencia visible actual. El disco del Space puede reiniciarse. |
| `APP_PROFILE=institutional` | `PERSISTENCE_DRIVER=oracle` | Pool `node-oracledb` Thin, transacciones y health/readiness reales. Requiere secretos y esquema dedicado. |

La configuración rechaza combinaciones cruzadas. Los módulos consumen contratos de repositorio; la lógica de negocio no decide qué base se usa.

## Ejecución local

Requiere Node.js 24 o posterior y npm.

```powershell
Copy-Item .env.demo.example .env
Set-Location backend
npm ci
npm start
```

En otra terminal:

```powershell
Set-Location frontend
npm ci
npm run dev
```

- Aplicación: `http://localhost:5173`
- API: `http://localhost:4000`
- Salud: `http://localhost:4000/api/health`
- Readiness: `http://localhost:4000/api/ready`

SQLite aplica automáticamente las migraciones de `backend/migrations/sqlite`. Con `DEMO_RESET_ON_START=false`, la información local sobrevive reinicios; el administrador técnico puede restablecer el contenido de presentación sin adquirir permisos operativos.

## Verificación

```powershell
Set-Location backend
npm run lint
npm run format:check
npm test
npm run test:persistence

Set-Location ..\frontend
npm run lint
npm run format:check
npm run build
npm run test:browser
```

Las pruebas cubren los recorridos completos de ambas áreas, devolución/corrección/reenvío en Víctimas, permisos, titularidad, reparto calculado por el backend, multiítem, migraciones, rollback, control optimista, doble asignación, historial y auditoría. El contrato Oracle se omite si no se configura explícitamente un esquema no productivo; nunca se simula una conexión exitosa.

## Migraciones

```powershell
Set-Location backend
npm run migrate:sqlite
```

Oracle está bloqueado de forma predeterminada. Solo una ventana aprobada en un esquema no productivo debe establecer `ALLOW_ORACLE_MIGRATION=true`. No use `SYS`, `SYSTEM` ni un propietario compartido.

Consulte [el mapeo Oracle](docs/sigip/15_MAPEO_MODELO_ORACLE.md) y [la guía de servidor](docs/sigip/16_DESPLIEGUE_SERVIDOR_DEFENSORIA.md) antes de probar la conexión institucional.

## Modelo de esta fase

```text
backend/src/
  app/                              composición HTTP
  domain/                           invariantes compartidos
  infrastructure/persistence/
    sqlite/                         migrador y repositorios locales
    oracle/                         pool Thin, migrador y adaptador Oracle
  modules/core/                     identidad, autorización, salud y auditoría
  modules/investigacion/            frontera del flujo investigativo
  modules/victimas/                 frontera del flujo pericial
  modules/assignment/               decisión, candidatos, exclusiones y reparto
backend/migrations/{sqlite,oracle}/ esquemas equivalentes versionados
frontend/src/                       interfaz en español y recorridos vigentes
```

El esquema separa caso, solicitud, varios ítems, personas y relaciones, decisiones de reparto, asignaciones/reasignaciones, transiciones, documentos/versiones, productos, parámetros, novedades, auditoría y outbox. No fija cantidades de regionales, plazos, semáforos, cargas o ampliaciones pendientes de decisión.

## Límites actuales

- El perfil institucional todavía no integra SSO, IRIS, repositorio documental ni correo.
- No se ejecutó DDL ni migración sobre Oracle real.
- El perfil de presentación conserva parámetros internos no aprobados para hacer reproducible el recorrido.
- PAG Central, Administrador Regional y Defensor Regional continúan pendientes de RACI y deshabilitados.
- No se inventa una revisión previa de Investigación ni un override manual de requisitos de elegibilidad.

Consulte además [las brechas funcionales/RACI](docs/sigip/14_BRECHAS_FUNCIONALES_Y_RACI.md), [las reglas consolidadas](docs/sigip/02_REGLAS_DE_NEGOCIO_SIGIP_DP.md) y [la guía de demostración](docs/sigip/11_GUIA_DE_DEMOSTRACION.md).
