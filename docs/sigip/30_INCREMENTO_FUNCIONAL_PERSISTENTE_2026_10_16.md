# Incremento funcional persistente — 16 de octubre de 2026

## Decisión de implementación y fuentes

El usuario indicó tomar la referencia más reciente de Investigación, implementar criterios lógicos ante incertidumbres y redactar la solicitud de ratificación al área; para Víctimas conservar P06 y sus particularidades aunque se integre documentalmente al procedimiento de Investigación. También solicitó completar funcionamiento, verificar UI/UX y publicar en Hugging Face.

Esto autoriza **decisiones D provisionales de implementación**, no cambia a C los pendientes institucionales. Fuentes B/C contrastadas: reuniones del 7/8-oct y transcripciones (informe 28), SD-P03 v10 actividad 9 como referencia anterior, P06/I14 y respuesta escrita C.6 para Víctimas. La solicitud queda en el [documento 31](31_SOLICITUD_RATIFICACION_AREA_FUNCIONAL.md), redactada y no enviada.

## Reglas y resultado

| Área / regla | Implementación para pruebas | Ratificación pendiente |
|---|---|---|
| Investigación, RN-INV-032 / prórroga | Investigador asignado solicita en ejecución y antes del vencimiento; soporte y motivo; gestor de la regional decide días hasta el término inicial; una prórroga ordinaria. Rechazo no cambia fecha; devolución no renueva automáticamente. | Autoridad/delegación frente al OSNDP, excepción adicional y término de corrección. |
| Investigación, términos | Referencia provisional de 25 calendario para servicios de campo y 45 calendario para los demás; cálculo desde asignación. Políticas por servicio, vigencia, fuente y calendario conservados. | Tabla definitiva por servicio y procedimiento vigente. No se presentan como cifras institucionalmente aprobadas. |
| Investigación, RN-INV-006/007 | Derivada en el mismo caso/SPOA/beneficiario; tareas realizadas y pendientes, destino, recepción regional PG/PAG y reparto automático explicable. Sin paso central obligatorio ni libre selección del investigador. | Matriz institucional de alcance del receptor y tratamiento de excepciones. |
| Víctimas, RN-VIC-020/040 | Aprobación antes de reparto; referencia P06/I14 de 40 hábiles desde la última radicación completa del ítem; calendario separado del ejemplo de Investigación. | Ratificar evento y referencias del instructivo. |
| Víctimas, prórroga D | Perito asignado solicita en ejecución; PAG decide días hábiles hasta término inicial, con soporte y observación. No se impone límite de una ni cinco: cada prórroga exige decisión expresa. | Límite, autoridad y eventual régimen especial. No es ampliación de personas/labor. |
| Víctimas, RN-VIC-043 a 049 / actualización | RJV crea continuación de encargo cerrado, con motivo/soporte y personas adicionales cuando corresponda. Nueva versión sometida, aprobación previa, mismo perito revalidado por elegibilidad; si no es elegible queda excepción, no se escoge otro. Término completo, origen y F171 anterior conservados. | Confirmar si actualización sólo financiera requiere el mismo aval y término que nueva labor/personas. No se calcula una indemnización automáticamente. |
| Víctimas, catálogo / reserva | Retiro del servicio psicológico duplicado de nuevas solicitudes, conservando históricos. Ingresos/soportes opcionales. F171 reservado al RJV titular y perito asignado; PAG sólo metadatos. | Revisión interna de formulario; no revocar C.6 por una frase del presentador. |
| Común, RN-COM-021/024/060 | PDF de radicación y producto con validación, hash, almacenamiento y descarga por ítem/versión. Radicación, actuaciones, entrega, prórroga y continuación con reintento idempotente; intento de contenido distinto con mismo envío produce conflicto. | Repositorio institucional, antivirus, retención y límites oficiales. |
| Caso / solicitud en Víctimas | Un caso judicial puede tener varias solicitudes con consecutivos independientes; se conserva el identificador como texto y la referencia común de caso. Reintentar el mismo envío devuelve la misma solicitud. | Formato institucional del identificador, separado de la invariante caso/solicitud. |
| Común, transacciones / historial | SQLite real con bloqueo de escritor, rollback, revisión persistida, FKs y claves únicas. Dos migraciones; auditoría/documentos/historial protegidos. Outbox se confirma con la operación, sin simular correo enviado. | Adaptador y esquema Oracle, identidad institucional e integraciones. |

Las políticas se marcan `PROVISIONAL` con autorización de implementación y fuente; no se falsifica `approvalEvidence`. `ENABLE_PROVISIONAL_RULES=false` deshabilita sus operaciones incluso sobre una base existente. No se reinterpretan los vencimientos históricos ni se reinicia su reloj al aplicar la configuración inicial.

## Archivos y módulos

- Persistencia: `backend/src/infrastructure/persistence/sqlite-repository.js`, migraciones `001-runtime.sql` y `002-domain-indexes.sql`; configuración, composición del aplicativo, salud y cierre del servidor.
- Núcleo: `core/policies/provisional.js`, `core/calendars/terms.js`, `core/operations/adjustment-context.js` y `term-extensions.js`; capacidades diferenciadas y descarga documental autorizada. Investigación conserva remisión/envío propios en `investigacion/adjustments.js`.
- Víctimas/reparto: continuación y validación de persona/documento en servicio integrado; regla de continuidad del perito en la estrategia de Víctimas, con exclusión explícita de otros candidatos.
- Frontend: formularios y detalle en `PortalPage.jsx`; `InvestigationAdjustments.jsx` comparte interacción de términos, `VictimsFollowUp.jsx` maneja continuaciones y `IntakeDocumentLink.jsx` descarga radicación. Se conserva navegación separada, foco y cierre por Escape; modal bloquea desplazamiento del fondo; horas en Bogotá.
- Pruebas: API persistente y concurrencia; navegador funcional con SQLite, adjuntos, prórroga, remisión, continuación y tamaños 360/768/1440. Suite histórica aislada con memoria para comprobar compatibilidad y modo sin políticas.
- Despliegue: Docker Node 24.11.0, SQLite por defecto, datos fuera del paquete público y reset protegido. README y ejemplos de variables actualizados.

## Verificación y publicación

Resultados finales:

| Comprobación | Resultado |
|---|---|
| Backend, `npm test` | **81/81**: regresión, API, términos/calendario, autorización, concurrencia, persistencia, documentos, idempotencia y separación de áreas. |
| Navegador, suite histórica | **23/23**: ambos recorridos anteriores, móvil, correcciones, reserva, actuaciones, Excel y modo sin política operativa. |
| Navegador con SQLite y reglas provisionales | **6/6**: PDF de radicación persistido/descargado tras recargar; continuación de Víctimas con persona nueva y mismo perito; prórroga y remisión regional; perfiles y detalle en 360/768/1440 px sin desbordamiento ni errores JavaScript. |
| Publicador | **2/2**: no confunde una revisión anterior activa con la nueva y detecta build fallido. |
| Lint, formato y build | Correctos en backend/frontend; compilación de producción correcta. |
| Paquete | 74 archivos permitidos; fuentes backend/frontend comparadas byte a byte con las publicadas. Sin documentos fuente, videos, transcripciones, bases SQLite ni secretos. |
| Revisión desplegada | `dc7a4ad8918d447524439407a40f9d1c449701cb`, estado **RUNNING** con SHA activo verificado. Bundle `/assets/index-BBT0mdEg.js`. |
| Verificación pública | Salud/ready SQLite, SPA y 401 sin sesión; radicación idempotente, descarga PDF con bytes íntegros, prórroga y remisión regional; informe/verificación/envío/cierre de origen y derivada; Víctimas devuelta/corregida/aprobada, prórroga propia, F171 cerrado y 403 al PAG sobre contenido; continuación con nueva persona al mismo perito y F171 anterior íntegro. |

Aplicación: [SIGIP-DP en Hugging Face](https://shcampinof-reparto-misiones-dndp.hf.space). La comprobación pública usó exclusivamente datos sintéticos y terminó los encargos creados: Investigación `INV-2026-00106` y su derivada; Víctimas `SVP-2026-0004` y su continuación. No se reseteó la base ni se eliminaron historiales para ocultar la verificación. Evidencia auxiliar local en `tmp/analisis_sigip/live-persistent-result.json` y capturas de navegador en rutas de pruebas ignoradas.

La [guía 32](32_GUIA_ENTORNO_PRUEBAS_Y_TRANSICION_ORACLE.md) identifica pasos manuales y límites: volumen persistente del servidor de pruebas, esquema/adaptador Oracle, identidad institucional, correo, repositorio documental e IRIS. El almacenamiento ordinario del Space es efímero frente a reemplazo del contenedor; no se contrató almacenamiento adicional.
