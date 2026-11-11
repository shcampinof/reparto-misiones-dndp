# Entorno Linux y preparación de Oracle

Fecha: 11 de noviembre de 2026. Alcance: desarrollo, núcleo común de persistencia y despliegue. No constituye aceptación institucional ni certificación contra la base Oracle real.

## Decisión y fuentes

El usuario autorizó instalar dependencias, clonar el repositorio en el Linux de desarrollo y preparar Oracle dejando las credenciales faltantes fuera de Git. El cambio es **D técnica**: conserva los flujos y no ratifica reglas P. Se apoya en AGENTS.md, el plan 03, los prompts 07 y la transición 32.

Reglas preservadas: RN-ALC-004/005 (D), RN-COM-003/005 (D), 016/022 (C), 031/033/034 (C/D), 041 (C), 050/052/053 (D) y 060–067 (C/D). La concurrencia y confirmación se extienden al adaptador; no se cambian términos, autorizadores, cobertura, estados ni criterios de reparto.

## Servidor de desarrollo

Oracle Linux 9.8 x86_64; 2 CPU; aproximadamente 5,2 GiB de RAM; 19 GiB libres inicialmente en `/`. Se utiliza el usuario de desarrollo existente, sin alterar archivos personales de Windows ni desactivar SELinux/firewall.

1. Git instalado mediante DNF por el usuario con sudo.
2. Node 24.22.2 instalado desde la distribución oficial y comprobado con SHA-256, en `~/.local/opt/`; enlaces en `~/.local/bin/`.
3. Repositorio en `~/reparto-misiones-dndp`, con dependencias backend/frontend y frontend compilado.
4. Servicio de usuario `sigip-dp.service`, administrado con systemd; `linger` habilitado por el usuario para conservarlo después de cerrar SSH.
5. API y frontend juntos en `127.0.0.1:4000`. No se abre una interfaz de red ni se requiere Nginx para este acceso por túnel SSH.

Comandos habituales:

```bash
export PATH="$HOME/.local/bin:$PATH"
cd ~/reparto-misiones-dndp
systemctl --user status sigip-dp.service
journalctl --user -u sigip-dp.service -n 50 --no-pager
curl --fail http://127.0.0.1:4000/api/ready
systemctl --user restart sigip-dp.service
```

`deploy/linux/install-node.sh` instala Node sin sudo; conserva ejecutables existentes y no elimina descargas. `configure-user-service.sh` crea archivos de entorno sólo si no existen, genera JWT aleatorio sin imprimirlo y conserva copia de cualquier unidad systemd que reemplace. No es un despliegue productivo.

## Configuración privada y activación de Oracle

La configuración `.env` permite utilizar la demostración persistente SQLite en loopback mientras Oracle no esté accesible. La configuración separada `.env.oracle` contiene el destino entregado por el usuario y deja **comentadas** las líneas `ORACLE_USER` y `ORACLE_PASSWORD`. Ambas están ignoradas por Git y se crean con permisos 600. El ejemplo versionado usa un hostname genérico.

1. Obtener del DBA un esquema **dedicado de desarrollo**, usuario/contraseña, versión, puerto/listener y requisitos TLS/wallet. La prueba TCP inicial rechazó el puerto proporcionado en las tres direcciones devueltas por DNS; esto requiere revisión del DBA/red, incluso después de recibir credenciales.
2. Descomentar y completar `ORACLE_USER` y `ORACLE_PASSWORD` en `.env.oracle`. El instalador completa `STATIC_DIR`, el secreto JWT y la conexión conocida; no contiene una contraseña ficticia operativa.
3. Mantener `ORACLE_SEED_DEMO=false` y `ENABLE_DEMO_ACCOUNTS=false` para no insertar personas sintéticas sin decisión explícita. Para probar la interfaz actual con identidades sintéticas, habilitar **ambas** únicamente en el esquema de pruebas aislado. En producción, las semillas demo se rechazan.
4. Conservar `ENABLE_PROVISIONAL_RULES=false` salvo habilitación expresa de políticas provisionales para pruebas. No equivale a aprobación funcional.
5. Ejecutar desde la raíz:

```bash
bash deploy/linux/activate-oracle.sh
```

El script comprueba conexión, aplica migraciones e inicializa el repositorio antes de sustituir `.env`; si falla una de esas operaciones, mantiene la configuración SQLite. Antes de sustituirla crea `.env.pre-oracle.FECHA`. No migra datos SQLite automáticamente ni borra la base previa.

Para ejecutar pasos separados:

```bash
cd backend
export SIGIP_ENV_FILE="$(pwd)/../.env.oracle"
npm run oracle:check
npm run oracle:migrate
npm run oracle:init
```

`oracle:check` sólo consulta identidad del esquema, versión y nombres de tablas SIGIP. `oracle:migrate` exige un esquema dedicado; si detecta tablas ajenas se detiene antes del DDL con `ORACLE_SCHEMA_REQUIRES_REVIEW`. Sólo un DBA que haya revisado el mapeo debe habilitar `ORACLE_ALLOW_EXISTING_SCHEMA=true`. SYS y SYSTEM se rechazan en configuración. El usuario de migración necesita `CREATE SESSION`, `CREATE TABLE`, `CREATE TRIGGER` y cuota en el tablespace asignado; no necesita DBA. Separar dueño de esquema y usuario de ejecución con permisos DML es un paso de endurecimiento previo al piloto.

Thin no instala Instant Client. La compatibilidad de Oracle 12.1 o posterior y cualquier requisito de TLS, wallet, autenticación o cifrado de red deben comprobarse contra el servidor real. [Driver oficial](https://node-oracledb.readthedocs.io/en/stable/user_guide/installation.html).

## Mapeo técnico

Migración nueva: `backend/src/infrastructure/persistence/oracle/migrations/001-domain.sql`; ejecución y registro con SHA-256 a través de `oracle:migrate`. El checksum no permite modificar una migración ya aplicada. Oracle confirma DDL implícitamente: ejecutar **un único proceso de migración por esquema**; una falla puede retomarse, sin DROP/TRUNCATE ni eliminación de datos.

| Dominio | Tablas |
|---|---|
| Caso y solicitud | `SIGIP_CASO`, `SIGIP_SOLICITUD`, `SIGIP_VERSION_SOL` |
| Ítem y reparto | `SIGIP_ITEM_SOLICITUD`, `SIGIP_ASIGNACION`, `SIGIP_TRANSICION` |
| Personas por solicitud/versión | `SIGIP_PERSONA_SOLICITUD` |
| Documentos y versiones | `SIGIP_DOCUMENTO`, `SIGIP_VERSION_DOCUMENTO` |
| Identidad sintética de desarrollo | `SIGIP_USUARIO`, `SIGIP_PERFIL`, `SIGIP_EJECUTOR` |
| Catálogos, políticas y calendario | `SIGIP_CATALOGO`, `SIGIP_PARAMETRO`, `SIGIP_CALENDARIO` |
| Borradores, avisos y auditoría | `SIGIP_BORRADOR`, `SIGIP_OUTBOX`, `SIGIP_AUDITORIA` |
| Estado auxiliar y control | `SIGIP_AUXILIAR`, `SIGIP_CONTROL`, `SIGIP_MIGRACION` |

Son entidades relacionadas mediante claves foráneas, unicidad e índices. Los campos extensibles de cada entidad se conservan en CLOB JSON, incluidos los bytes documentales base64 de esta etapa; no se guarda el agregado completo de solicitudes en una fila de estado. No es un diseño institucional completamente descompuesto en columnas: quedan pendientes el mapeo contra tablas reales, la extracción de atributos para consultas institucionales y el almacenamiento documental autorizado.

## Contrato transaccional

- Pool de conexiones con límites y tiempos configurables; zona de sesión UTC; consultas enlazadas con bind variables. No se imprimen contraseñas ni mensajes completos del driver.
- Escritura: bloqueo `SELECT ... FOR UPDATE WAIT 15` en `SIGIP_CONTROL`; lectura del estado **después** del bloqueo; validación de historia; MERGE/INSERT de entidades cambiadas; auditoría y outbox en la misma transacción; `commit` antes de responder a HTTP.
- Lectura: transacción de sólo lectura para conservar un SCN consistente entre tablas. No existe caché transaccional de estado entre operaciones.
- Pool: rollback de trabajo no confirmado y devolución de conexión también al fallar. Conflictos de bloqueo se traducen a un error reintentable, conservando la clave idempotente del envío.
- Documentos, asignaciones, personas/versiones anteriores, transiciones y auditoría se conservan. Triggers protegen tablas históricas y contenido documental/radicado; los metadatos de revisión pueden cambiar sin alterar el contenido sometido.
- Las operaciones del catálogo, solicitudes, documentos, borradores y outbox esperan el repositorio asíncrono. SQLite/memoria de pruebas mantienen compatibilidad.
- Las copias de SQLite se deshabilitan al usar Oracle; su endpoint responde 409. Los backups/restauración Oracle se acuerdan con DBA, no se simulan como copias SQLite.

El bloqueo global es una estrategia inicial de corrección y serialización; **no certifica capacidad institucional**. Cada operación todavía materializa el conjunto de entidades en el backend para utilizar el contrato existente. Se debe medir rendimiento y particionar las unidades de trabajo antes de escalar. No se introdujeron microservicios.

## Validación y pendientes reales

Pruebas existentes de API y navegador para ambas áreas, más contrato del adaptador: descomposición/reconstrucción sin perder PDF/campos, corrección versionada, dos conexiones, reintento concurrente, fallo de commit sin éxito HTTP, rollback, autorización y reserva F171, esquema compartido rechazado antes del DDL y desactivación de backups/reset inaplicables.

El doble de Oracle comprueba el contrato y la API; **no sustituye ejecutar SQL contra Oracle**. La prueba real permanece omitida hasta que se habilite expresamente un esquema de integración:

```bash
cd backend
SIGIP_ENV_FILE=../.env.oracle SIGIP_ORACLE_TESTS=true npm run test:oracle
```

Esa prueba deja una marca técnica con UUID en el esquema de pruebas; no borra registros. Comprueba dos conexiones reales, rollback y reapertura. No ejecutarla en una base operativa.

Pendientes: conectividad/listener; credenciales y versión; aprobación/mapeo del esquema; pruebas reales de migración, bloqueo, integridad, carga y recuperación; SSO y aprovisionamiento institucional; correo/SharePoint/IRIS; antimalware y almacenamiento documental. Las rutas de negocio actuales siguen siendo las de la demostración y requieren el modo de desarrollo explícito; agregar una contraseña Oracle no habilita identidad institucional.

Se actualizaron dependencias transitivas del backend y se fijó `qs` 6.16.2 mediante override compatible para cerrar alertas verificadas por `npm audit`. La publicación web continúa sirviendo archivos compilados, no el servidor Vite expuesto.

### Evidencia del despliegue de desarrollo

El commit de código `9d009da` se instaló en Linux desde la rama `codex/oracle-linux-development`. En Windows y Linux pasaron 104 pruebas backend; se omitió expresamente una prueba Oracle real. En Windows pasaron las 23 pruebas generales y las 11 pruebas persistentes de navegador. Lint, formato y build completados; `npm audit` backend sin vulnerabilidades.

El servicio quedó `active` y `enabled`, con `.env` y `.env.oracle` en modo 600. Una prueba sobre la instancia Linux verificó reinicio del servicio, conservación del JWT, recuperación de borrador y PDF sin alterar su hash, reserva del F171, CORS y backup SQLite confirmado. El borrador de verificación se archivó mediante API, conservando su auditoría. Evidencia privada en `~/sigip-verificacion.json` y `~/sigip-backend-verification.log` del usuario del servidor.

El chequeo `oracle:check` se detuvo correctamente por usuario/contraseña pendientes, sin intentar autenticarse ni aplicar DDL. El diagnóstico TCP siguió rechazado para las tres direcciones del hostname proporcionado. La preparación del adaptador no se presenta como conexión Oracle validada.
