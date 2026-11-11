# Entorno funcional de pruebas y transición a Oracle

Actualización del 11-nov-2026: la [guía 36](36_ENTORNO_LINUX_Y_ADAPTADOR_ORACLE.md) incorpora un primer adaptador Oracle con entidades separadas y contrato asíncrono, migración y scripts Linux. Las afirmaciones siguientes de «adaptador no implementado» describen la fase anterior. La verificación contra Oracle real, el esquema institucional y las integraciones permanecen pendientes.

Actualización del 19-oct-2026: [Informe 33](33_MEJORAS_AUTONOMAS_HUGGING_FACE.md) amplía límites configurables, borradores, soportes y recuperación. Las cifras 2/4/8 MB de este informe describen la entrega anterior; Docker ahora configura 10/30/48 MB.

## Ejecución local

Requiere Node.js 24.11 (Docker usa exactamente 24.11.0), npm y un directorio con permisos de escritura. El adaptador utiliza `node:sqlite`, disponible en esa versión, todavía marcado experimental por Node. No se instalaron controladores nativos de terceros.

Desde la raíz, copiar `.env.demo.example` a `.env`; instalar dependencias en `backend` y `frontend` con `npm ci`. Ejecutar `npm start` dentro de `backend` y `npm run dev` dentro de `frontend`. Acceder a `http://localhost:5173`.

Variables:

| Variable | Uso |
|---|---|
| `STORAGE_DRIVER=sqlite` | Persistencia transaccional. Memoria se admite para tests o demostración explícita. |
| `SQLITE_PATH=./data/sigip.sqlite` | Ruta relativa al proceso backend. Puede ser absoluta en el servidor de pruebas. |
| `ENABLE_PROVISIONAL_RULES=true` | Habilita las políticas provisionales autorizadas para pruebas. `false` deshabilita decisiones provisionales incluso sobre una base ya creada; no destruye los snapshots históricos. |
| `ENABLE_DEMO_ACCOUNTS=true` | Sólo desarrollo/pruebas con identidades sintéticas. El Space usa `DEMO_MODE=true`. |
| `JWT_SECRET` | Secreto externo robusto. Es obligatorio en producción; un secreto efímero local invalida las sesiones al reiniciar, pero no borra datos SQLite. |
| `DEMO_RESET_ON_START=false` | Documenta la conservación esperada; SQLite no reinicializa una base existente ni admite borrado desde el portal. |

La primera apertura crea la base y aplica dos migraciones idempotentes; las siguientes recuperan el estado existente. Para otro ciclo limpio, detener el proceso y seleccionar **otra ruta de base**. No borrar una base compartida desde el aplicativo.

## Persistencia y límites de este incremento

- `001-runtime.sql`: revisión de estado, casos, solicitudes, ítems, versiones documentales de productos, outbox, auditoría y restricciones de integridad.
- `002-domain-indexes.sql`: asignaciones, personas por versión sometida y documentos de radicación por versión.
- Cada operación usa `BEGIN IMMEDIATE`, relee el estado después de obtener el bloqueo y confirma estado, documentos y outbox juntos. Un error revierte todo. WAL y `synchronous=FULL` protegen la escritura confirmada.
- No existe caché de estado que pueda sobrescribir el trabajo de otro proceso. Se probaron dos conexiones y dos workers concurrentes.
- Auditoría e historial son acumulativos; los bytes, referencia y metadatos originales de los documentos se preservan. Las revisiones cambian metadatos de decisión del producto, sin sobrescribir el contenido anterior.
- El agregado JSON se mantiene como fuente transaccional de compatibilidad, con índices/tablas relacionales de integridad. **No es aún el modelo Oracle normalizado** ni un adaptador Oracle implementado. Una transacción reescribe el agregado y sus proyecciones; no se certifica capacidad para carga institucional ni escalamiento horizontal multinodo.
- Los PDF se conservan en SQLite hasta 2 MB por archivo; la suma de PDF de la radicación no supera 4 MB. La API admite hasta 8 MB de JSON para la codificación base64. Son límites técnicos de esta fase.
- Validación de tipo, contenido, tamaño y SHA-256; rechazo básico de scripts/adjuntos PDF. Esto no sustituye antivirus ni un repositorio documental institucional.

La comprobación `/api/ready` consulta la base y declara `sqlite-transactional`; `/api/health` es la comprobación de vida del proceso. La API no entrega bytes documentales dentro del bootstrap: la descarga usa una consulta autorizada por ítem y versión, con registro de acceso.

## Copia y recuperación

Para una copia consistente, detener el backend y copiar la base y sus archivos acompañantes `-wal`/`-shm` si existen; conservarlos juntos. Alternativamente usar la API oficial de backup de SQLite con el servicio activo. No copiar sólo el archivo principal mientras existen escrituras o WAL pendiente.

Probar la restauración en una ruta distinta y consultar `/api/ready`, solicitudes, productos y outbox. No ejecutar procesos de escritura sobre una carpeta compartida de red: el bloqueo local de SQLite no sustituye una base multiusuario de servidor.

## Hugging Face

El contenedor guarda la base en `/app/data/sigip.sqlite`, sin restablecimiento desde la interfaz. El estado sobrevive a reinicios del proceso cuando se conserva ese directorio. **El disco ordinario de un Space es efímero**: un rebuild, reemplazo o parada del contenedor puede descartar el archivo. No se contrató almacenamiento ni se montó un bucket de pago. La publicación sigue limitada a información sintética.

Documentación oficial consultada: [almacenamiento de Spaces](https://huggingface.co/docs/hub/spaces-storage), [SQLite en Node 24](https://nodejs.org/download/release/v24.11.0/docs/api/sqlite.html). Para el servidor de pruebas, montar un volumen local persistente y establecer una política de backup. Mantener el Space como presentación pública separada.

## Integración institucional pendiente

1. Implementar el esquema Oracle normalizado y el adaptador transaccional: `CASO`, `SOLICITUD`, `ITEM_SOLICITUD`, `ASIGNACION`, `PERSONA_SOLICITUD`, `DOCUMENTO`, catálogos, políticas, calendario, outbox y auditoría. Adaptar el contrato síncrono actual a operaciones asíncronas del driver Oracle y probar rollback/bloqueo con dos conexiones reales. No limitarse a cambiar una URL de conexión.
2. Conectar identidad institucional y aprovisionamiento de capacidades con alcance/vigencia. La selección pública de perfiles sintéticos y el API `/api/demo` siguen siendo exclusivos de la presentación; no sirven como autenticación institucional.
3. Migrar históricos por versión, conservar identificadores y validar referencias con el área. Las dos migraciones de este incremento corresponden a SQLite, no a Oracle.
4. Ratificar la [solicitud funcional](31_SOLICITUD_RATIFICACION_AREA_FUNCIONAL.md); publicar nuevas versiones de políticas con vigencia sin alterar snapshots existentes. Validar calendario institucional; la configuración inicial cubre 2026–2027 y falla expresamente fuera de su cobertura.
5. Configurar correo real mediante un emisor idempotente de outbox; IRIS y SharePoint necesitan adaptadores, identidad y permisos documentados. Las referencias actuales no acreditan sincronización ni envío.
6. Conectar almacenamiento documental y antimalware; definir retención, cifrado, restauración, límites y observabilidad. Evaluar capacidad con volumen representativo antes del piloto.

Las operaciones pendientes de autoridad institucional (excepción manual libre, novedad/reasignación/transferencia y carga masiva sin plantilla aprobada) no se convierten en automatismos a partir de esta autorización de criterios provisionales sobre términos. Los flujos nuevos habilitados están enumerados y probados en el [informe 30](30_INCREMENTO_FUNCIONAL_PERSISTENTE_2026_10_16.md).
