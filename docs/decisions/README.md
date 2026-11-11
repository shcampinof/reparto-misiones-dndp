# Registro de decisiones funcionales pendientes — SIGIP-DP

Fecha de actualización: 16 de octubre de 2026. Una entrada `PENDIENTE` no es una regla autorizada para producción. Esta revisión corrige contradicciones y comportamiento técnico y registra incertidumbres de fuentes; no inventa aprobación institucional.

**Actualización posterior a la respuesta del usuario:** autorizó implementar criterios lógicos provisionales usando la referencia reciente de Investigación y conservando P06 y particularidades de Víctimas. Se habilitan políticas `PROVISIONAL` para términos/prórrogas independientes, remisión regional y continuaciones de Víctimas; esto constituye D para pruebas, no C institucional. El [informe 30](../sigip/30_INCREMENTO_FUNCIONAL_PERSISTENTE_2026_10_16.md) prevalece sobre los bloqueos históricos de esas funciones. La [solicitud 31](../sigip/31_SOLICITUD_RATIFICACION_AREA_FUNCIONAL.md) agrupa exactamente las ratificaciones restantes, sin pedir nuevamente la alternativa de remisión regional ya explicada.

| Código | Estado | Decisión requerida | Comportamiento pre-Oracle |
|---|---|---|---|
| DEC-RACI-INV | PENDIENTE | revisión previa, actor, alcance y efecto en Investigación | no se agrega aprobación previa; la radicación dispara reparto ordinario automático |
| DEC-RACI-VIC | PENDIENTE | alcance territorial y suplencia del PAG de Víctimas | solo se usa el PAG del perfil demostrativo |
| DEC-RACI-PROBLEMAS-VIC | PENDIENTE | autoridad operativa receptora y tratamiento de problemas reportados por peritos | el reporte se conserva con estado `PENDIENTE_CONFIGURACION`; no habilita decisión operativa |
| DEC-RACI-OPERACIONES | PENDIENTE | responsable de reasignación y continuidad operativa | perfiles de presentación consultan bandejas; las actuaciones permanecen bloqueadas |
| DEC-RACI-TRANSFERENCIA | PENDIENTE | actor, causal y efecto de transferir titularidad | operación bloqueada |
| DEC-CAT-GOB | PENDIENTE | responsables de proponer, aprobar, publicar y retirar catálogos | perfiles propuestos deshabilitados |
| DEC-REG-001 | PENDIENTE | fuente maestra y vigencia de regionales | presentación usa territorios de la labor; no afirma que 33 territorios sean 34 regionales institucionales |
| DEC-COB-INV | PENDIENTE | matriz territorial oficial de Investigación | cobertura de semilla marcada como revisable |
| DEC-COB-VIC | PENDIENTE | matriz territorial oficial de Víctimas | cobertura de semilla marcada como revisable |
| DEC-PLZ-001 | D PROVISIONAL; RATIFICACION PENDIENTE | tabla por servicio, tipo de día, inicio, pausas, calendario y vigencia institucionales | políticas provisionales versionadas habilitan términos y métricas para pruebas: Investigación desde asignación; Víctimas desde radicación completa. Informe 30 y solicitud 31. |
| DEC-TURNO-001 | PENDIENTE | estados que cuentan, límites y balance de carga | reparto usa carga relativa sin umbral fijo |
| DEC-ASG-EXC | PENDIENTE | autorizador y restricciones no excepcionables | asignación manual bloqueada |
| DEC-NOV-001 | PENDIENTE | tipos, autorizador y efecto sobre asignaciones activas | novedad bloqueada |
| DEC-AMP-001 | VICTIMAS D PROVISIONAL; INVESTIGACION PENDIENTE | confirmar corte entre actualización, personas adicionales y nueva labor | Víctimas crea continuación de encargo cerrado, aprobación previa, mismo perito revalidado y término completo; Investigación no recibe esa regla por analogía. Informe 30. |
| DEC-VIC-F171 | D PROVISIONAL; RATIFICACION PENDIENTE | régimen de actualización exclusivamente financiera y fecha de corte | continuación vinculada, aval previo, mismo perito, F171 anterior conservado y cierre directo del nuevo producto; no se agrega aprobación final PAG. Solicitud 31. |
| DEC-VIC-IMPROCEDENCIA | RESUELTA PARCIALMENTE PARA DEMO | Respuesta escrita C.4: el perito declara estado propio con constancia y se notifica al RJV. Catálogo de causales y correo institucional pendientes. | Habilitada solo al perito asignado, con causal/constancia/soporte e idempotencia; constancia en bandeja RJV. Fuente y diseño en informe 23. |
| DEC-VIC-RADICADO | FORMATO PENDIENTE; INVARIANTE APLICADA | formato institucional, fuente y vigencia del identificador judicial | identificador como texto; un caso admite varias solicitudes con consecutivos independientes. Reintento idempotente impide duplicar el mismo envío; política institucional aprobada puede agregar validaciones. |
| DEC-VIC-MASIVA | PENDIENTE | plantilla, validaciones y gobierno de carga masiva | no se habilita carga masiva |
| DEC-IND-001 | PENDIENTE | fórmulas oficiales y dimensiones de indicadores | conteos centralizados para PAG Investigación y territoriales para Defensor Regional, autorizados en API; sin fórmulas de oportunidad inventadas |
| DEC-HU-033 | PENDIENTE | existencia, versión y aprobación de HU-33 | no se infieren requisitos |
| DEC-INV-GRADO | PENDIENTE | aplicabilidad del grado exacto/mínimo por servicio y vigencia de funciones | no se agrega filtro de grado mientras falta validación |
| DEC-VIC-MULTIITEM | PENDIENTE | combinaciones de servicios periciales admitidas institucionalmente | la demo muestra ítems independientes con datos ficticios; no certifica aprobación de combinaciones |
| DEC-INV-PRORROGA-202610 | D PROVISIONAL; RATIFICACION PENDIENTE | ratificar gestor regional frente a OSNDP, límite excepcional y duración por servicio; reunión 7-oct frente a SD-P03 actividad 9 | solicitud motivada antes del vencimiento/informe; gestor regional decide días hasta término inicial, una prórroga ordinaria. Política PROVISIONAL autorizada por usuario, sin aprobación institucional ficticia. No renovación automática por devolución. Informe 30/solicitud 31. |
| DEC-INV-REMISION-202610 | RUTA ACLARADA; IMPLEMENTADA PARA PRUEBAS | alcance institucional del receptor y excepciones | ruta REGIONAL operativa: mismo caso/SPOA/beneficiario, tareas diferenciadas, recepción PG/PAG y reparto automático. No paso central obligatorio ni nueva radicación del defensor. Permisos/estado/idempotencia/concurrencia probados. Informe 30. |
| DEC-PROC-VIGENCIA-202610 | RATIFICACION PENDIENTE; D PROVISIONAL | nuevo procedimiento común anunciado para revisión; versión/vigencia no confirmadas | usuario autoriza referencia reciente de Investigación y conserva P06 y particularidades de Víctimas. Implementación provisional sin fusionar flujos; solicitud 31 concreta los puntos por ratificar. |
| DEC-VIC-CAT-PSICOLOGIA | ACLARADA; IMPLEMENTADA | reunión 8-oct 21:19–22:19 retira duplicación de evaluación y dictamen | SVC_VIC_DICTAMEN_PSICOLOGICO retirado para nuevas solicitudes con historial de catálogo conservado. No se eliminan otros servicios por extrapolación. Informe 30. |
| DEC-VIC-INGRESOS | OPCIONAL PROVISIONAL; REVISION INTERNA PENDIENTE | Reunión 8-oct, 47:44–49:15, tras desacuerdo: mantener ingreso y soporte opcionales mientras se revisa formulario. | los campos ya son opcionales; no borrar por la propuesta intermedia ni calcular salario mínimo automáticamente. |
| DEC-INV-F147 | PENDIENTE | formato completo y modificación de procedimiento | control tabular y Excel de datos existentes; no se certifica reemplazo institucional |
| DEC-INV-VERIFICACION | PARCIAL PARA DEMO | Ajustes §3.6 exige verificación pero falta checklist oficial | constancia referenciada y confirmación autenticada; no se inventa formulario oficial ni firma digital |
| DEC-INV-ENVIO | D PARA DEMO | Ajustes §3.6 distingue aprobación PAG de envío por investigador al defensor; implementación solicitada 16-oct | `APROBADO_PENDIENTE_ENVIO` seguido de constancia del investigador y cierre, sin correo real implícito |
| DEC-INV-TEXTO | PENDIENTE FUNCIONAL | Observación 3 pregunta por umbral razonable | límite técnico configurable de 10.000 en demo, sin declararlo umbral institucional |
| DEC-INV-ASISTIDA | PENDIENTE | Observaciones 8/10/11 preguntan por edición PAG, reparto asistido y revisión previa | se conserva reparto automático explicable; no se agregan ediciones ni overrides operativos |
| DEC-INV-IRIS | PENDIENTE TICS | Ajustes §3.8 solicita evaluación de viabilidad | referencia IRIS sin verificar, sin API conectada ni sustitución del expediente |
| DEC-INV-CORREO | PENDIENTE CONFIGURACION | Ajustes §3.7 requiere correo al investigador al asignar y al defensor al finalizar | avisos en outbox/bandeja personal; proveedor no configurado; no se simula envío exitoso |

## Correcciones técnicas verificables de esta revisión

| Asunto | Evidencia | Resultado |
|---|---|---|
| Consulta por ítem | RN-COM-003/005, RN-COM-016/022, RN-VIC-020/021 y solicitud del usuario del 7-oct-2026 | Proyección de servidor común a bootstrap y acciones; sólo datos aprobados aplicables para el ejecutor de Víctimas; snapshots e historial filtrados por ítem autorizado |
| Estados documentados | Máquina ejecutable y contrato `17_CONTRATO_FUNCIONAL_PRE_ORACLE.md` | Se corrige sección 6 de reglas: no presenta revisión previa, improcedencia, ampliación o actualización como transiciones activas |
| Operaciones propias de Víctimas | RN-VIC-050 a 058 | Actualización F-171 e improcedencia tienen contrato exclusivo de Víctimas y permanecen bloqueadas; su ruta en Investigación responde 404 |
| Fuentes disponibles | Inventario local de `Documentos Fuente` | Video del 14-jul y paquete de HU disponibles; análisis integral de video aún pendiente |

## Agenda de validación funcional

Los responsables siguientes son funciones propuestas para convocar; deben confirmarse y no otorgan permisos al aplicativo.

| Prioridad | Decisiones | Función a convocar | Evidencia que falta |
|---|---|---|---|
| 1 | RACI por área, operaciones y transferencia | Responsables funcionales de Investigación y Víctimas | Matriz de acciones, alcance, suplencias y segregación aprobada |
| 1 | `DEC-PLZ-001` | Dueños de procedimientos y responsables funcionales | Copia vigente controlada SD-P03; memorando de utilidad pública; términos de Víctimas, inicio/pausas y calendarios |
| 1 | `DEC-TURNO-001`, `DEC-INV-GRADO`, coberturas | Coordinación de reparto y responsables de personal | Turno frente a menor carga, estados contables, funciones vigentes y matriz territorial por servicio/especialidad |
| 2 | Excepción, novedad y ampliación | Responsables funcionales de cada área | Causales, autorizador, soporte, efecto sobre trabajos activos y continuidad |
| 2 | F-171, improcedencia, multiítem y masiva | Grupo de Víctimas | Flujo de actualización, cierre causal, combinaciones y plantilla aprobados |
| 3 | Catálogos, regionales e indicadores | Dueños de datos maestros y reporting | Fuente oficial, vigencia, gobierno de publicación y fórmulas |

La copia SD-P03 v10 disponible contiene 25/45 **días calendario**, asignación hasta 3 **hábiles** y reglas de suspensión por novedades. Las HU contienen otros valores. Se registran como evidencia por verificar, no se programan hasta comprobar vigencia y alcance. El levantamiento con respuestas indica turno por especialidad y revisión de funciones de cargos, lo que impide dar por definitivo el desempate demostrativo o el grado. Las fechas objetivo de aprobación y los nombres de firmantes no han sido suministrados.

Para cerrar una decisión deben registrarse dueño, participantes, fecha, alternativa aprobada, evidencia, alcance, vigencia, reglas afectadas y pruebas de aceptación. Cambiar este archivo sin esa evidencia no habilita la función.


## Entregas y actuaciones para presentación (7-oct-2026)

Decisión de interacción D autorizada por petición del usuario: permitir PDF o enlace SharePoint, conservar versiones y confirmar actuaciones de forma visible. No modifica el proceso C/B de revisión posterior en Investigación ni cierre directo ordinario de Víctimas. Límite de 2 MB técnico, no institucional. Integración SharePoint, almacenamiento institucional y antimalware permanecen P. Detalle y evidencia: [21_ACTUACIONES_Y_ENTREGA_DOCUMENTAL_2026_10_07.md](../sigip/21_ACTUACIONES_Y_ENTREGA_DOCUMENTAL_2026_10_07.md).

## Incertidumbres documentadas al revisar la reunión del 23-jul (8-oct-2026)

Fuente y método: [22 — Análisis de la grabación de reparto de peritos](../sigip/22_ANALISIS_VIDEO_REPARTO_PERITOS_2026_10_08.md). Transcripción automática local y revisión visual por muestreo; las referencias temporales son aproximadas. Ninguna entrada siguiente autoriza un cambio operativo ni cierra decisiones previas.

| Código | Estado | Decisión requerida y evidencia | Tratamiento actual |
|---|---|---|---|
| DEC-VIC-AGRUPACION | PENDIENTE | Unidad institucional de solicitud: hecho, familia, persona o lote; combinación de hechos dentro de una audiencia. En 11:08–22:18 se pide captura masiva; en 27:58–28:22 se describe una solicitud por hecho en el procedimiento de entonces. Confirmar procedimiento vigente y posibles modificaciones. | La lista de personas y los ítems de la demo no acreditan aprobación de agrupaciones. No imponer 25 como umbral de importación. |
| DEC-VIC-IDENTIDAD-CASO | INVARIANTE IMPLEMENTADA; FORMATO PENDIENTE | separar identidad judicial del caso y consecutivo de cada solicitud | el incremento provisional conserva casos y solicitudes diferentes, permite varios encargos del mismo caso y evita duplicados de envío con idempotencia. Validación del formato institucional permanece separada. Informe 30. |
| DEC-VIC-ACOPIO-RESULTADO | PENDIENTE | Diferenciar acopio documental, valoración en terreno e informe entregado y definir la ruta de un trabajo financiero que queda pendiente después de una brigada. En 41:40–44:18 se aclara que no toda jornada produce una pericia inmediata. | Canal BRIGADA sigue separado del reparto ordinario; no contar todo acopio como F-171 entregado ni como encargo cerrado. |
| DEC-VIC-ACCESO-PRODUCTO | RESUELTA PARCIALMENTE PARA DEMO | Respuesta escrita C.6: PAG no puede ver contenido, sí metadatos; administrador regional no aclarado. Confirmar acceso extraordinario y funciones centrales. | F171 reservado al RJV titular y perito asignado en proyección y descarga; denegación conservadora a administración. Informe 23 documenta evidencia y alcance. |

Precisiones para decisiones existentes:

- `DEC-RACI-VIC`: 03:19–04:13 distingue coordinador central de PAG supervisor; 27:32–27:58 describe visto bueno del PAG del RJV antes de remitir a Bogotá. Separar aval de origen, recepción central y excepciones, confirmar ámbito y suplencias. No dar por universal un perfil de Investigación.
- `DEC-VIC-MASIVA`: validar las plantillas institucionales y errores por fila; la petición de menor digitación no aprueba retirar formatos o modificar el procedimiento.
- `DEC-COB-VIC`: separar disciplina, sede, territorio del caso y prioridad de cobertura local/central. Las explicaciones de 05:19–07:29 no sustituyen una matriz territorial vigente ni resuelven la contradicción posterior de Atlántico.

No se cambian las marcas C/B/D/P de las reglas consolidadas ni las aprobaciones vacías de las HU. Los códigos nuevos registran incertidumbres del análisis y no conceden capacidades en la API.

## Validación documental de Víctimas del 8-oct-2026

Corrección y correspondencia con F163: [Informe 26](../sigip/26_CORRECCION_F163_Y_DELITOS_2026_10_08.md). Diseño D: campo documental de solicitud fijo y reconocimiento de sus denominaciones equivalentes. Línea base B: datos separados de proceso/radicado y delito(s) en F163. Pendiente P: obligatoriedad y catálogo institucional de delitos para Víctimas. No se cierran decisiones de plazos, cobertura ni roles.

La posterior entrega de `Documentos Fuente/Victimas` aporta respuestas explícitas C.4/C.6 y SD-P06/I14/F163–F171. [Informe 23](../sigip/23_VALIDACION_DOCUMENTAL_VICTIMAS_2026_10_08.md) registra fuente, regla, alcance exclusivo de Víctimas y diseño D. Este incremento habilita improcedencia motivada por el perito asignado y reserva documental F171. Amplía campos y catálogos en la demo sin aprobar obligatoriedades, cobertura o plazos. La cobertura Atlántico/Caribe sigue contradictoria; I14 v1 sí contiene 40 días hábiles, pendiente de cotejo SGC y reconciliación con la reunión. No cierra RACI, ampliación, actualización F171, traslado ni masiva. Los textos históricos anteriores sobre improcedencia bloqueada deben leerse con esta actualización; Investigación permanece intacta.

## Revisión de las reuniones del 7 y 8 de octubre (16-oct-2026)

Se leyeron ambas transcripciones completas, se procesó todo el audio localmente y se revisaron capturas sistemáticas/focalizadas. Evidencia, método, tiempos y diferencias entre propuestas y decisiones: [informe 28](../sigip/28_REVISION_REUNIONES_OCTUBRE_Y_CIERRE_DE_INQUIETUDES.md). Las dos consultas restantes sobre procedimiento vigente, separadas por área, están en [informe 29](../sigip/29_PREGUNTAS_FUNCIONALES_TRAS_REVISION_DE_REUNIONES.md).

En Investigación no se vuelve a preguntar si toda remisión debe pasar por central: la explicación final contempla ruta regional directa. La lectura de una prórroga adicional sí se contrasta con la actividad 9 del SD-P03 v10 disponible; no resuelve por sí sola vigencia, autoridad institucional ni excepción adicional. La referencia de 25 días no determina la duración de todas las prórrogas.

En Víctimas no hay decisión nueva de términos o prórrogas. Se identifica la opción psicológica duplicada como ajuste pendiente y la opcionalidad de ingresos como solución provisional. Se mantiene la reserva escrita C.6 del contenido F171 frente al comentario del presentador sobre descarga PAG; ese comentario no constituye revocación funcional de la respuesta escrita. La aprobación sigue antes del reparto y el cierre ordinario F171 no incorpora aprobación final PAG.

Esta actualización documental no activa políticas ni cambia el aplicativo publicado. Los estados históricos anteriores se interpretan con estas precisiones y no como decisiones nuevas contradictorias.

## Mejoras técnicas autónomas del 19 de octubre de 2026

La solicitud posterior del usuario autoriza retirar etiquetas generales de pruebas y moderar la presentación visual en ambas áreas, incluido el detalle de caso centrado. Decisión D de interfaz, sin cambio del estado C/B/D/P de las reglas ni de las integraciones: [Informe 35](../sigip/35_AJUSTE_INTERFAZ_INSTITUCIONAL.md).

D autorizada por el usuario: borradores, documentos adicionales versionados, corrección de PDF en devoluciones, límites técnicos, filtros, constancias y recuperación operativa sin acceso institucional. Alcance, reglas y pendientes: [Informe 33](../sigip/33_MEJORAS_AUTONOMAS_HUGGING_FACE.md). No autoriza nuevos RACI, suplencias, reasignación libre ni sustitución de F147/IRIS. El antivirus sólo acredita análisis cuando un motor configurado lo confirma; ninguna credencial de correo o identidad se inventa.
