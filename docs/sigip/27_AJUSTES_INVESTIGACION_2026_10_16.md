# Ajustes de Investigación y revisión funcional del 16 de octubre de 2026

**Actualización documental posterior:** se revisaron las grabaciones y transcripciones añadidas del 7 y 8 de octubre. El [informe 28](28_REVISION_REUNIONES_OCTUBRE_Y_CIERRE_DE_INQUIETUDES.md) precisa las conclusiones de esta entrega: la remisión regional directa sí está descrita en la explicación final; la lectura de una prórroga adicional entra en conflicto con la actividad 9 de la copia SD-P03 v10 y requiere identificar el procedimiento vigente. La ruta `CENTRAL` descrita abajo es la limitación del contrato implementado, no una obligación funcional ratificada. Las [consultas reducidas por área](29_PREGUNTAS_FUNCIONALES_TRAS_REVISION_DE_REUNIONES.md) sustituyen las preguntas genéricas previas. Esta nota no cambia la revisión del aplicativo publicada ni activa políticas.

Se implementa un incremento de la **demostración pública** de SIGIP-DP a petición del usuario. Se conservan los cambios de trabajo existentes. Las preguntas y apartados «Por confirmar» de los documentos no se convierten en aprobaciones institucionales. No se modifican el reparto ni el cierre ordinario de Víctimas.

Fuentes leídas completas: `Ajustes desarrollo reparto misiones_Investigación_v2.docx` (recorrido del 8-oct-2026, §§3.1–3.8), `Observaciones para revisión funcional del aplicativo.docx` (12 observaciones) e instrucciones de `AGENTS.md`. Las fuentes están en Descargas y no se incluyen en el paquete público; el correo adjunto se usa sólo como contexto de revisión, sin enviar comunicaciones ni convocar reuniones.

## Trazabilidad de los ocho ajustes

| Ajuste y regla | Estado y alcance | Resultado verificable | Dependencia pendiente |
|---|---|---|---|
| §3.1 Prórroga; RN-COM-033/034/041, RN-INV-032 | C/D para trazabilidad y calendario; P para cifras y RACI. Investigación | Investigador asignado solicita durante ejecución, con motivo y soporte, antes del vencimiento conocido. Idempotencia y rechazo de solicitudes paralelas pendientes. Gestor regional decide únicamente con política aprobada, vigente, versionada y con evidencia. Se conservan término anterior, nuevo, actor, calendario y política. | No se elige entre 1 o 2 prórrogas ni se activan 25 días. Falta aprobador, duración, límite, reporte previo y efecto de devolución. Sin política no se aprueba ni rechaza. |
| §3.2 Remisión; RN-INV-006/007, RN-COM-050/052/056 | B para vínculo y reparto; P para ruta. Investigación | Contrato PAG → ítem derivado → cola central → reparto automático. Mismo caso/SPOA y solicitante, origen, actividades realizadas y pendientes. Varias derivadas por misión; cada una tiene estado/asignación independientes. Cobertura por servicio en radicación, incluida utilidad pública. | Crear y enrutar derivadas exige política `REMISION` aprobada. Ruta central implementada para validación; vía directa no se presume autorizada. No habilita asignación manual. |
| §3.3 Numeración; RN-COM-011/012 | B/D. Investigación | Nuevas solicitudes `INV-año-NNNNN` y presentación `año-NNNNN`. Año institucional Bogotá y consecutivo por año dentro de la transacción de demo. Registros previos conservan sus claves y se presentan con cinco dígitos. Ítem y solicitud siguen siendo identificadores distintos. | Secuencia durable Oracle e identificación institucional definitiva; no se renumeran documentos históricos INF/REF. |
| §3.4 Excel; RN-COM-004/003/068/069 | B/D. Investigación | XLSX real con hojas de control, personal autorizado y corte/filtros. Filtra regional, investigador, estado, periodo y vencidas con política; filtros de personal por nombre/especialidad/disponibilidad/cobertura. Defensor exporta sólo solicitudes propias. API valida permisos y registra auditoría. Textos como `=HYPERLINK(...)` se escriben como texto, nunca fórmulas. | Fórmulas/indicadores oficiales y Power BI; no se afirma un tablero Power BI integrado. |
| §3.5 F147; RN-COM-060/068 | D para consulta; P para sustitución formal. Investigación | Tabla y Excel con ingreso, responsable, cobertura, servicio, estado, vencimiento aprobado, origen y constancias, reutilizando la captura existente. Se retiran vencimientos ficticios de semillas sin política aprobada. | F147 completo no suministrado; no se certifica homologación total, eliminación del Excel institucional ni reemplazo del acta de informes. |
| §3.6 Verificación y envío; RN-INV-031, RN-COM-021/024 | B/D, interacción solicitada por usuario. Investigación | PAG confirma revisión y referencia constancia del formulario. Estado `APROBADO_PENDIENTE_ENVIO`. Investigador asignado acredita envío al defensor y sólo entonces cierra. Fecha/actor/producto se conservan. | Checklist oficial no suministrado; se referencia su constancia en vez de inventar criterios. Registro autenticado no es firma digital. El envío acreditado es externo al aplicativo. |
| §3.7 Notificaciones; RN-COM-064/065/066 | C/D para outbox; P para proveedor. Núcleo con eventos sólo de Investigación | Aviso de asignación al investigador y finalización al defensor, en la misma transacción de demo. Bandeja personal y constancia consultable. Clave estable evita duplicados. Contrato de emisor admite fallo y reintento con clave idempotente. | Space no envía correo real: `PENDIENTE_CONFIGURACION`. No se infiere correo de asignación al defensor. Proveedor, credenciales y política institucional pendientes. |
| §3.8 IRIS; RN-ALC-003, RN-COM-060/061 | D para referencia; P para integración. Investigación | Forma de entrega y tipo documental de referencia IRIS. Se valida sintaxis mínima y conserva versión. Etiqueta explícita: sin conexión y sin verificar. | TICs debe definir API, autenticación, expediente maestro, conservación y retención. No se afirma sincronización o sustitución del expediente IRIS. |

## Respuesta a las doce observaciones

| N.º | Tratamiento |
|---|---|
| 1 SPOA | Texto de exactamente 21 dígitos en API y formulario. Se rechaza un número JSON por pérdida de precisión/ceros. No se convierte a `Number`. El tipo OTRO sigue separado. |
| 2 Audiencia | Aviso informativo en la radicación; no se bloquea por anticipación numérica no aprobada. Sin política no se promete entrega anterior a audiencia. |
| 3 Textos | Contadores y límite técnico configurable `investigationTextPolicy.maxLength` (10.000 en demo) validado también en API. Es una protección técnica, no un umbral funcional aprobado. |
| 4 Portafolio | Alcance, actividades y exclusiones de cada servicio seleccionado consultables durante el paso Servicios; conserva catálogo general completo y versionado. |
| 5 Radicación y trazabilidad | Identificador estable de solicitud, hijos identificables e historial de informe devuelto/corregido. No se crea otro número por asignación. Numeración visual de cinco dígitos sin destruir claves previas. |
| 6 Ampliación del defensor | Continúa bloqueada por `DEC-AMP-001`: nueva labor es diferente de prórroga de término. No se impone continuidad de Investigación por extrapolación de la regla de Víctimas. |
| 7 Documentos | Se conserva PDF hasta 2 MB por entrega en memoria de demo, referencia SharePoint con permisos externos y ahora referencia IRIS. Versiones y descargas autorizadas existentes permanecen. No hay repositorio institucional conectado ni límite total institucional aprobado. |
| 8 Correcciones PAG | PAG no edita la solicitud original; devuelve el informe con observaciones y conserva versiones. Permisos de corrección inicial por campo siguen pendientes; no se crean a partir de preguntas. |
| 9 Actuaciones adicionales | Contrato de derivada por especialidad/cobertura con origen, justificación y tareas. Se activa sólo con política de remisión aprobada. No se permite escoger otro investigador/perito. |
| 10 Reparto asistido | Se conserva la explicación de candidatos, exclusiones, métricas y desempate. Aceptación/modificación humana previa al reparto y excepciones manuales requieren decisión de RACI; no se sustituye el reparto automático actual por una pregunta. |
| 11 Devolución inicial al defensor | Revisión/devolución previa de Investigación continúa en `DEC-RACI-INV`. Devolución de informe es un evento distinto y permanece habilitada con historial. No se traslada el flujo previo de Víctimas. |
| 12 Seguimiento | Control tabular, Excel, responsables, fechas, carga, regional/especialidad y bandeja de avisos. Vencimientos sólo cuando existe política aprobada y calendario conservado. |

## Datos y contratos técnicos

Se agregan al repositorio de demostración `investigationPolicies`, `calendars`, `outbox`, `investigationTextPolicy` y contador anual `counters.investigationByYear`. En ítem: `termExtensions`, `originItemId`, `originRequestId`, `referral`, `verification`, `dispatch`, `calendarSnapshot` y recibos idempotentes internos. La proyección omite recibos internos. Las fechas de eventos son UTC; fechas institucionales usan `America/Bogota`.

No se crean migraciones Oracle ejecutables: aún no existen conexión ni esquema base institucional en esta demostración. Estos campos son el contrato que deberá trasladarse a tablas/constraints/secuencias/outbox persistentes cuando se suministre ese ambiente. El almacén de demo permanece volátil y no es un piloto institucional.

Rutas nuevas autenticadas bajo `/api/demo`:

- `GET /reportes/investigacion.xlsx`.
- `POST /investigacion/items/:id/solicitar-prorroga` (`submissionId`, `reason`, `supportReference`).
- `POST /investigacion/items/:id/decidir-prorroga` (`submissionId`, `extensionId`, `decision`, `observation`).
- `POST /investigacion/items/:id/remitir-actividad` (`submissionId`, `service`, `region`, `reason`, `completedActivities`, `pendingActivities`).
- `POST /investigacion/items/:id/enrutar-actividad` (`submissionId`, `observation`).
- `POST /investigacion/items/:id/registrar-envio` (`submissionId`, `evidence`).
- `POST /investigacion/items/:id/aprobar-entrega` ahora exige `verificationReference` y `confirmReviewed: true`.

Una política aplicable requiere exactamente una coincidencia por tipo/área/servicio/vigencia, `status: APROBADA`, versión y evidencia. Prórroga además requiere aprobador, límite, días, tipo de día y calendario versionado; puede exigir problema previo. Remisión requiere iniciador PAG, enrutador central y ruta CENTRAL. No hay políticas aprobadas precargadas en el Space. Los valores de las pruebas se identifican `TEST-ONLY` y no se publican como configuración.

## Configuración y publicación

El paquete público sólo incluye código, dependencias y recursos de interfaz; excluye Word, capturas adjuntas, documentación fuente y secretos. Se publica en el Space canónico por solicitud explícita del usuario. `JWT_SECRET` continúa como secreto externo.

Para activar operación institucional deben entregarse políticas aprobadas, esquema/persistencia, SSO, repositorio documental y proveedor de correo. El emisor de outbox requiere proveedor que respete la clave idempotente y mecanismo operativo de recuperación de trabajos en proceso; el worker no se conecta ni ejecuta en el Space. La referencia IRIS no necesita credenciales porque no efectúa consultas.

## Verificación

Backend: `npm run check`, 69/69 pruebas, lint y formato correctos. Frontend: compilación, lint y formato; la suite de 23 recorridos cubre ambos flujos, móvil, Excel, portafolio, prórroga pendiente y referencia IRIS. Publicador: dos pruebas unitarias verifican que no se confirme una revisión anterior y que un fallo de build no sea éxito. XLSX validado con ZIP/CRC/XML y lectura openpyxl: tres hojas, nueve ítems y veinte investigadores iniciales, sin fórmulas ejecutables. Capturas de control y prórroga revisadas visualmente.

Las pruebas nuevas cubren permisos positivos/negativos, vigencia, conflictos de idempotencia, calendarios y rollback; se conserva la regresión de Víctimas y del reparto concurrente. La configuración positiva de políticas sólo se introduce en fixtures de pruebas y nunca se publica.

## Archivos y módulos de este incremento

| Módulo | Archivos principales |
|---|---|
| Investigación | `backend/src/modules/investigacion/adjustments.js`; estados, numeración y composición en `backend/src/modules/demo/service.js` |
| Núcleo | `backend/src/modules/core/calendars/terms.js`, `core/notifications/outbox.js`, `core/auth/capabilities.js` |
| Reportería | `backend/src/modules/reporting/investigation-export.js`, `xlsx.js`, `investigation.js` |
| API y documentos | `backend/src/modules/demo/router.js`, `delivery.js`, `backend/src/app/create-app.js` |
| Datos de presentación | `backend/src/infrastructure/demo/seeds.js`, `catalog-seeds.js` |
| Interfaz | `frontend/src/components/InvestigationAdjustments.jsx`, `pages/PortalPage.jsx`, `api.js`, `styles.css` |
| Pruebas | `backend/test/api/investigation-adjustments.test.js`, actualización de `app.test.js`, `frontend/test/browser/flows.spec.js`, exclusión de resultados de navegador en `frontend/eslint.config.js` |
| Despliegue | actualización del recorrido de cierre y comprobación XLSX en `deploy/huggingface-space/smoke-test.ps1`; se reutiliza publicación saneada existente |
| Documentación | este informe; registro de decisiones; reglas, matriz de HU, índice, contrato y guía de demostración |

Migraciones creadas: ninguna. La demostración utiliza el repositorio temporal ya existente. No se reemplaza por una supuesta base institucional ni se declara persistencia Oracle.

## Publicación y comprobación en Hugging Face

Publicado en `shcampinof/reparto-misiones-dndp`, revisión `7d1e5984f619e42be4b9dcbf84e984a2736a934b`. El publicador confirmó `RUNNING` con exactamente esa revisión, no la anterior. Paquete saneado de 66 archivos. La aplicación sirve el bundle `/assets/index-iFI0pZF4.js`, coincidente con la compilación local verificada, y contiene los controles nuevos.

Comprobación ejecutada sobre `https://shcampinof-reparto-misiones-dndp.hf.space`: salud y readiness correctos; SPA y ruta interna responden 200; Investigación radica/asigna/ejecuta/entrega/verifica/envía/cierra; Excel y PDF descargables; reintento de entrega sin duplicado; descarga ajena y decisiones administrativas denegadas; Víctimas conserva devolución/corrección/aprobación previa/cierre directo; falta de candidato y proyección por ítem correctas. Se restablecieron los datos iniciales al terminar.

Resultado final: 69/69 pruebas backend, 23/23 recorridos de navegador y 2/2 pruebas de publicación; lint, formato, build, revisión visual y comprobación de despliegue correctos. No se enviaron correos ni documentos reales. Permanecen pendientes las decisiones/configuraciones funcionales identificadas en las tablas anteriores.
