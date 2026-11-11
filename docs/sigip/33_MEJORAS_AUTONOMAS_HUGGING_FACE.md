# Mejoras autónomas para el entorno de pruebas

Solicitud del usuario del 19-oct-2026: implementar las recomendaciones que no requieren acceso institucional y pueden mantenerse en Hugging Face. Alcance técnico D autorizado para pruebas, sin ratificación de reglas institucionales.

## Fuentes y reglas

RN-COM-003/004/005/009: permisos en servidor y reserva por ítem; RN-COM-010 (D): borradores privados; RN-COM-021/022/024 y 060–063 (C/D): soportes, versiones y consultas auditadas; RN-COM-064/065/067 (C/D): avisos, fallos y recuperación; HU-12/15/27/32 y E06/E07: consulta, documentos y operación. Se conserva la reserva F171 y la aprobación previa de Víctimas. No se introducen nuevas autoridades de reasignación o suplencia.

## Alcance

- Corrección de documentos en solicitudes devueltas con conservación de archivos anteriores.
- Borradores persistentes por usuario y área, con revisión optimista y recuperación explícita.
- Documentos de ejecución por ítem, reemplazos append-only, motivos, integridad e idempotencia.
- Límites técnicos configurables y visibles, progreso de carga, reintento y descargas autorizadas.
- Búsqueda combinada y constancias imprimibles generadas por servidor.
- Avisos personales leídos/no leídos y diagnóstico técnico sin simular correo enviado.
- Copia consistente y restauración verificable de SQLite, configuración de volumen persistente.

## Dependencias que continúan pendientes

SSO, Oracle, IRIS, SharePoint, correo, procedimiento/F147 y RACI institucional no se habilitan. Las ausencias, suplencias y reasignaciones siguen sujetas a las decisiones funcionales existentes. El disco ordinario de Hugging Face no ofrece durabilidad tras reemplazar el contenedor; las copias locales tampoco sobreviven a perder el mismo disco. El volumen persistente requiere configuración de la cuenta de hosting. Sólo datos sintéticos.

## Verificación

Resultados al finalizar esta entrega, abajo.

## Módulos y migración

Núcleo: `core/workspace` (API autenticada), notificaciones y permisos existentes. Persistencia: `003-workspace.sql` crea borradores e índice de versiones de soportes con restricciones y triggers de inmutabilidad. Se aplica automáticamente a bases existentes sin reinicializarlas. Las dos migraciones anteriores se conservan. Documentos: validación PDF y contrato de ClamAV local. Interfaz: pestaña Documentos, borradores, filtros, constancias y panel técnico. Investigación y Víctimas conservan sus máquinas de estados.

Los soportes adicionales se vinculan al ítem y a un tipo (anexo, actuación, problema, prórroga, verificación, envío). No sustituyen silenciosamente el producto ni la solicitud radicada; cada reemplazo crea una versión con autor, fecha, motivo, SHA-256 y política técnica aplicada. El PDF de una corrección de solicitud sí integra una nueva versión sometida al aval previo. El PAG de Víctimas recibe sólo metadatos de soportes reservados. Borradores y sus adjuntos sólo son accesibles a su propietario con permiso vigente del área.

Los bytes permanecen en SQLite como base64 para compatibilidad con la fase actual; no se declara terminada la normalización Oracle ni se certifica capacidad institucional. El límite del conjunto JSON sigue siendo una limitación conocida. Los nuevos índices separan borradores y soportes, pero no convierten las proyecciones en la fuente transaccional primaria.

## API bajo /api/workspace

- `GET /policy`: límites técnicos públicos para la sesión; no expone rutas del escáner.
- `GET /:area/drafts`, `GET/PUT/DELETE /:area/drafts/:id`: borradores del titular, revisión optimista y archivo lógico.
- `GET/POST /:area/items/:id/documents`: soportes adicionales y nuevas versiones. POST requiere `submissionId`, `type`, `reason`, `file`; reemplazo agrega `documentId` y `previousVersion`.
- `GET /:area/items/:id/documents/:documentId`: descarga de una versión autorizada, con auditoría.
- `GET /:area/items/:id/receipt`: constancia HTML descargable e imprimible, fechas de Bogotá y advertencia de alcance. No acredita firma digital ni entrega de correo.
- `POST /notifications/:id/read` y `/retry`: sólo avisos del destinatario. Reintento sólo de fallidos, conservando clave de idempotencia.
- `GET /maintenance`, `POST /maintenance/backup`: sólo administración técnica; estado agregado sin documentos ni credenciales y solicitud de copia verificada. No permite descargar una copia de todos los documentos ni eludir reserva F171.

## Configuración del contenedor

Docker y ejemplos configuran 10 MB por PDF, 30 MB sumados en radicación, 50 MB de soportes por ítem contando todas sus versiones y 48 MB de JSON. Son decisiones técnicas D para datos sintéticos. El servidor conserva valores conservadores de 2/4 MB si no se configura el ambiente. `FILE_POLICY_VERSION`, `FILE_MAX_MB`, `INTAKE_MAX_MB`, `ITEM_FILES_MAX_MB`, `JSON_MAX_MB` permiten versionar/cambiar límites; se rechaza una combinación incoherente.

`ANTIMALWARE_COMMAND` debe indicar el ejecutable `clamscan` instalado en el mismo host, con firmas actualizadas. No se usa shell ni un servicio público de análisis. `REQUIRE_ANTIMALWARE=true` bloquea la carga si no puede confirmarse el análisis; la operación de negocio no se confirma. Sin motor configurado, sólo se acredita validación básica y la interfaz lo dice. No se instaló ni se declara activo un motor antivirus en el Space; su contrato limpio/infectado/fallo se prueba con un adaptador controlado. No hay cuarentena persistente ni archivos rechazados publicados: el temporal de análisis se elimina y el usuario conserva el original para corregir/reintentar.

El emisor de correo sigue sin proveedor. La outbox recupera trabajos cuyo bloqueo temporal expiró y usa espera creciente tras fallos. La bandeja muestra leídos, no leídos y fallos; nunca convierte un aviso local en correo enviado. Víctimas también recibe avisos de asignación, devolución y cierre, sin contenido de víctimas o documentos.

## Copia y restauración

`BACKUP_DIRECTORY` establece el destino, `BACKUP_INTERVAL_MINUTES=360` la frecuencia y `BACKUP_KEEP=3` la retención técnica. La copia usa la API de backup de SQLite con el servicio activo, verifica integridad y claves foráneas y rota sólo archivos propios. Docker deja el destino en `/app/data/backups`; comparte el carácter efímero del disco hasta montar un volumen duradero. La administración puede iniciar una copia desde el panel técnico. No se exportan documentos reservados a usuarios administrativos por HTTP.

Desde la carpeta backend:

```powershell
node src/infrastructure/persistence/backup.js backup data/sigip.sqlite copias/respaldo.sqlite
node src/infrastructure/persistence/backup.js restore copias/respaldo.sqlite data/restaurada.sqlite
```

Restaurar con el servicio detenido en una ruta nueva. Cambiar `SQLITE_PATH` a esa ruta y reiniciar. No se sobrescribe una base existente. Conservar una copia fuera del disco del contenedor; probarla antes de un cambio de infraestructura. Montar almacenamiento duradero en Hugging Face requiere configurar la cuenta de hosting y comprobar compatibilidad de bloqueo/WAL para SQLite; no basta con apuntar la base a cualquier bucket montado. No se contrató almacenamiento de pago.

## Pendientes y decisiones

No se implementan Oracle/SSO/IRIS/SharePoint ni envío de correo sin sus servicios y credenciales. Ausencias, suplencias y reasignaciones requieren cerrar RACI y sus efectos sobre trabajos activos; por ello siguen bloqueadas, sin selección libre de ejecutor. La sustitución formal F147 y los términos siguen sujetos a ratificación funcional. No se ofrecen formatos de archivo adicionales a PDF sin validadores adecuados y una necesidad definida.

## Resultados de verificación

- Backend: `node --test`, 92/92 pruebas correctas. Después de reforzar la reserva exclusiva del nombre de backup y verificar la rotación, `node --test test/api/workspace.test.js`, 11/11 correctas.
- Navegador persistente: 10/10 recorridos funcionales correctos, con tamaños 360/768/1440. Se repitieron las cuatro funciones nuevas después del ajuste visual; se corrigió una dependencia del test de filtros respecto del encargo creado por un test anterior y su ejecución aislada pasó.
- Regresión histórica: 23/23 recorridos correctos, con almacenamiento en memoria explícito de prueba para no tocar bases del usuario. La configuración funcional conserva SQLite temporal.
- Lint y formato correctos en backend/frontend; build de producción correcto. Las dos pruebas del publicador pasan; un BUILD_ERROR dentro de esas pruebas es un escenario simulado esperado, no un despliegue real fallido.
- PDF de corrección de Víctimas: descarga binaria exacta del original y del corregido, cada uno en su versión, comprobada desde navegador.
- Paquete saneado de 87 archivos; fuentes comparadas por hash con el workspace. Sin Word, PDF institucional, videos, bases SQLite, respaldos locales ni archivos .env. El paquete está en `.space-package` y no se agrega al repositorio.
- Publicación: **autorizada explícitamente por el usuario y completada** en `shcampinof/reparto-misiones-dndp`. Revisión activa verificada `76b76441b639d7f0e1d70fe80d863482ff9e5782`, estado RUNNING. El bloqueo automático del intento anterior quedó resuelto con esa autorización; se utilizó el mismo publicador y destino.

## Pasos manuales de despliegue

1. Autorizar expresamente la publicación del paquete verificado en el Space canónico; reutilizar el publicador existente y confirmar que el SHA activo coincida con el commit publicado.
2. Comprobar `/api/ready`, política de archivos, guardar/recuperar/archivar un borrador sintético y descarga autorizada de soportes. Verificar el estado de la primera copia en Administración.
3. Para durabilidad entre reemplazos del contenedor, configurar almacenamiento apropiado y un destino independiente de backup en la cuenta de hosting; comprobar compatibilidad SQLite/WAL. La aplicación no compra almacenamiento ni configura credenciales institucionales.
4. Para activar antivirus, instalar/configurar clamscan y firmas vigentes, establecer `ANTIMALWARE_COMMAND` y, cuando deba bloquearse toda carga sin análisis, `REQUIRE_ANTIMALWARE=true`. Mientras no exista motor, la interfaz informa validación básica.

## Comprobación de la versión publicada

La publicación del 19-oct-2026 fue autorizada por el usuario con «sí, publica». El publicador confirmó la coincidencia exacta del SHA activo. La API publicada respondió correctamente a salud/readiness SQLite, denegación sin sesión, política de 10/30 MB, borrador privado guardado/recuperado/archivado, conflicto de revisión, dos versiones de soporte con bytes íntegros y reintento idempotente, constancia HTML y denegación por área.

Se verificó la reserva de un soporte ficticio de Víctimas frente al PAG, sin nombre ni contenido en su listado y con descarga 403. Administración confirmó copia local verificada y el solicitante no pudo acceder al mantenimiento. La comprobación dejó sólo evidencias ficticias, sin borrar historiales: dos versiones en `INV-2026-0001` / `MT-2026-0001` y un soporte reservado de prueba en `SVP-2026-0002`. El borrador de comprobación se archivó mediante su operación autorizada. Evidencia técnica local en `tmp/analisis_sigip/live-autonomous-result.json`; no contiene tokens. Los límites del disco efímero y las conexiones institucionales siguen vigentes.

Guion para exponer los cambios uno por uno: [34 — Presentación de cambios](34_GUION_PRESENTACION_CAMBIOS.md).
