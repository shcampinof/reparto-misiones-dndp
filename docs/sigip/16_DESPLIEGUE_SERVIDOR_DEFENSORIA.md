# Despliegue en servidor de la Defensoría — SIGIP-DP

Esta guía prepara un esquema **no productivo**. No autoriza despliegue productivo ni migración de tablas existentes.

## 1. Perfiles

| Variable | Presentación | Institucional |
|---|---|---|
| `APP_PROFILE` | `presentation` | `institutional` |
| `PERSISTENCE_DRIVER` | `sqlite` | `oracle` |
| Datos | ficticios y reproducibles | suministrados por integraciones institucionales |
| Identidad | accesos de presentación explícitos | proveedor institucional pendiente de integración |
| Disco | puede reiniciarse en Hugging Face | persistencia Oracle administrada por TI |

La lógica funcional depende de puertos de repositorio. El perfil se decide al componer la aplicación; no se distribuyen condicionales `presentation/oracle` por los casos de uso.

## 2. Prerrequisitos

- Node.js 24 o posterior y npm compatibles con el lockfile;
- Oracle Database 12.1 o posterior para `node-oracledb` Thin; TI debe confirmar la versión exacta antes de usarlo;
- esquema no productivo dedicado, distinto de `SYS`, `SYSTEM` y de propietarios compartidos;
- conectividad/TLS y secretos inyectados por el servicio o almacén institucional;
- backup restaurable y ventana aprobada antes de DDL;
- ningún objeto `SIGIP_` ajeno a estas migraciones.

Oracle Thin es el modo predeterminado y esta base no llama `initOracleClient`. Si la versión o autenticación institucional exige Thick, detenga el despliegue y tramite un cambio técnico específico.

## 3. Variables

Requeridas para el proceso institucional:

```text
APP_PROFILE=institutional
PERSISTENCE_DRIVER=oracle
ORACLE_USER
ORACLE_PASSWORD
ORACLE_CONNECT_STRING
JWT_SECRET                         # obligatorio si NODE_ENV=production
```

Operativas con valores aprobados por TI:

```text
ORACLE_POOL_MIN
ORACLE_POOL_MAX
ORACLE_POOL_INCREMENT
ORACLE_POOL_TIMEOUT
ORACLE_QUEUE_TIMEOUT
ORACLE_STATEMENT_CACHE_SIZE
ALLOW_ORACLE_MIGRATION
```

No guarde valores reales en `.env.example`, historial de PowerShell, Git, imagen Docker ni logs. El servicio no registra contraseña o connect string.

## 4. Validación local de presentación

```powershell
Set-Location C:\ruta\reparto-misiones-dndp\backend
npm ci
$env:APP_PROFILE = 'presentation'
$env:PERSISTENCE_DRIVER = 'sqlite'
$env:SQLITE_PATH = 'data/sigip-presentation.sqlite'
npm run migrate:sqlite
npm test
```

El archivo SQLite no se versiona. En el Space se usa una ruta efímera y la información ficticia puede reconstruirse.

## 5. Secuencia exacta para Oracle no productivo

Los secretos deben estar inyectados antes de abrir la consola. Los siguientes comandos validan su presencia sin mostrarlos:

```powershell
Set-Location C:\ruta\reparto-misiones-dndp\backend
npm ci

$env:NODE_ENV = 'production'
$env:APP_PROFILE = 'institutional'
$env:PERSISTENCE_DRIVER = 'oracle'
$env:ENABLE_DEMO_ACCOUNTS = 'false'
$env:DEMO_MODE = 'false'
$env:PORT = '4000'

$required = 'ORACLE_USER','ORACLE_PASSWORD','ORACLE_CONNECT_STRING','JWT_SECRET'
$missing = $required | Where-Object { [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_)) }
if ($missing) { throw "Faltan secretos/variables Oracle requeridos" }
if ($env:ORACLE_USER -in 'SYS','SYSTEM') { throw 'Cuenta Oracle prohibida' }

$env:ALLOW_ORACLE_MIGRATION = 'true'
npm run migrate:oracle
$env:ALLOW_ORACLE_MIGRATION = 'false'

$env:RUN_ORACLE_CONTRACT_TESTS = 'true'
npm run test:oracle-contract
$env:RUN_ORACLE_CONTRACT_TESTS = 'false'
```

Para validar el servicio después de una migración aprobada:

```powershell
npm start
```

En otra consola del mismo servidor:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/health
Invoke-RestMethod http://127.0.0.1:4000/api/ready
```

Readiness solo responde `200` si obtiene una conexión del pool y ejecuta una consulta real. Una conexión ausente o incompatible produce fallo; no se sustituye con una respuesta simulada.

## 6. Migración y reversa

1. ejecutar inventario y backup;
2. comparar checksums y objetos existentes;
3. aplicar en esquema vacío no productivo con `ALLOW_ORACLE_MIGRATION=true`;
4. devolver inmediatamente la variable a `false`;
5. ejecutar integridad, contrato, concurrencia y reconciliación;
6. ensayar restauración.

Oracle confirma DDL implícitamente. Ante un fallo parcial, no afirme que `ROLLBACK` retiró las tablas: detenga el proceso, preserve evidencias y aplique la restauración o el script compensatorio revisado por DBA. Las migraciones de esta fase no contienen `DROP`, renombres ni cambios sobre tablas de negocio preexistentes.

## 7. Puesta en producción pendiente

Antes de producción faltan autenticación institucional, catálogos oficiales, decisiones RACI, clasificación documental, monitoreo, backup/DR, dimensionamiento del pool, pruebas de carga, revisión de seguridad y aprobación del plan de migración descrito en `15_MAPEO_MODELO_ORACLE.md`.
