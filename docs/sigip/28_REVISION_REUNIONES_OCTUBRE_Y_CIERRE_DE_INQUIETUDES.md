# Revisión de las reuniones de octubre y depuración de decisiones

**Incremento posterior:** el usuario autorizó implementar criterios provisionales y conservar las particularidades de Víctimas. El [informe 30](30_INCREMENTO_FUNCIONAL_PERSISTENTE_2026_10_16.md) registra los cambios y su publicación; la [solicitud 31](31_SOLICITUD_RATIFICACION_AREA_FUNCIONAL.md) sustituye el cuestionario previo. Este informe conserva la evidencia y el estado de la revisión documental antes de esa autorización.

Fecha de revisión: 16 de octubre de 2026. Áreas revisadas por separado: Investigación y Representación Judicial de Víctimas.

Las reuniones nuevas sí aclaran necesidades que no deben volver a consultarse como si estuvieran sin definir. En Investigación, la remisión puede dirigirse a la regional receptora sin devolver el trámite al defensor; la conversación corrige el conteo de ampliaciones a una prórroga adicional al término inicial. Sin embargo, la copia SD-P03 v10 disponible contempla solicitud al OSNDP y ampliaciones adicionales acordadas: no puede declararse cerrado el régimen institucional de prórrogas sin identificar el procedimiento vigente. En Víctimas, la reunión del 8 de octubre no define prórrogas ni plazos; confirma ajustes de formulario y anuncia un procedimiento nuevo aún en revisión.

Este informe modifica el diagnóstico y la matriz de decisiones. No cambia políticas activas, código funcional ni la revisión publicada en Hugging Face. Los hallazgos confirmados se separan de propuestas del presentador, acuerdos provisionales, contradicciones documentales y tareas de implementación.

## Fuentes y método

Se leyeron completas las dos transcripciones Word añadidas a `Documentos Fuente/Videos Reuniones`, con sus intervenciones y marcas de tiempo. Se procesó localmente el audio completo de ambos videos mediante faster-whisper small, español, GPU float16, beam 5, lotes de 8 y detección de voz. Se contrastaron los pasajes decisivos con la transcripción Word y se inspeccionaron 64 capturas sistemáticas, cada dos minutos desde 00:00:30, más siete capturas focalizadas. Las capturas muestran la demo en Hugging Face, no el HTML histórico de julio.

Es revisión audiovisual por transcripción completa y muestreo visual, no visionado continuo ni escucha humana certificada. El ASR sirve para contrastar, no para atribuir hablantes o resolver por sí solo una cifra. Las atribuciones provienen de las transcripciones aportadas. Las marcas siguientes son relativas a la grabación y aproximadas; las pequeñas diferencias entre segmentación ASR y Word no se interpretan como versiones distintas de una decisión.

| Área | Video y transcripción Word | Duración | Control de cobertura |
|---|---|---|---|
| Investigación | `Socialización avance herramienta tecnológica para reparto de misiones de trabajo-20261007_150517-Grabación de la reunión.mp4`; Word homónimo sin fecha en el nombre | 01:07:24,2245 | 258 párrafos, 254 intervenciones reconocidas; última intervención Word 01:07:17. ASR: 136 segmentos, 00:00:02,26–01:07:17,62; 34 capturas sistemáticas y cuatro focalizadas. |
| Víctimas | `PROPUESTA REPARTO Y ASIGNACIÓN DE PERITOS-20261008_151107-Meeting Recording.mp4`; `PROPUESTA REPARTO Y ASIGNACIÓN DE PERITOS.docx` | 01:00:08,0645 | 155 párrafos, 152 intervenciones reconocidas; última intervención Word 00:59:58. ASR: 120 segmentos, 00:00:02,19–00:59:58,80; 30 capturas sistemáticas y tres focalizadas. |

Ambos videos son 1920 × 1080, audio mono de 16 kHz. Los metadatos de creación indican 7-oct-2026 20:05:30 UTC y 8-oct-2026 20:12:25 UTC; la hora PM de los encabezados Word no se usa como hora local de Bogotá. Se conserva la fecha de cada reunión y el tiempo relativo del video.

Huellas SHA-256:

- Investigación video: `e20af0d3af35ceb95f9219b7a19602b5559603365da62c7c7a1d282a8023a09c`.
- Investigación Word: `f11d11da29d3a3143757b22f2debf6eaf0984792d27fcad5d0f2d2099bb0cf32`.
- Víctimas video: `30b2d78c0e79bda6c2063098ee606ba30465a3a6b5ff8d8456d5435e0dae55e1`.
- Víctimas Word: `9db346c1c7b23f9d283a9241216405df197e34d3a916ea988e21050ef281ac67`.

El material de trabajo, segmentos, textos y capturas está en `tmp/analisis_sigip/reuniones_octubre`, ya excluido de Git y del paquete público. No se cargaron videos, audio, transcripciones ni capturas a servicios externos.

## Investigación del 7 de octubre

### Prórroga de términos

| Evidencia temporal y autor | Lectura que corresponde | Estado |
|---|---|---|
| 19:41–19:59, María Carmenza pregunta cómo solicita el investigador una ampliación durante ejecución | Se trata de término para terminar el encargo, no de nuevas actividades solicitadas por el defensor. | C: distinguir ambos conceptos. |
| 20:50–22:00, Sebastián muestra el perfil de gestor operativo regional, señala los reportes de problemas y dice que allí se aprobaría; reconoce que falta la acción | El aprobador propuesto en la demo es el gestor operativo regional. No hay que volver a preguntar qué perfil mencionó la presentación. Esto no identifica aún su delegación institucional ni reemplaza por sí solo al OSNDP del procedimiento. | B para propuesta de interfaz; P para habilitación institucional. |
| 22:00–22:22, Sonia corrige que la solicitud se presenta antes de entregar el informe | La prórroga no se origina automáticamente después de entregar. La devolución para corregir un informe es una operación distinta. | C. |
| 22:22–22:42, Sonia dice dos ampliaciones; María Carmenza corrige «Una sola, una sola»; Sonia reformula como término de 25 días más otra prórroga | La lectura más consistente de la corrección es **un término inicial más una prórroga adicional**, no dos prórrogas adicionales. La mención de 25 días describe el término inicial del ejemplo; no fija expresamente la duración de la prórroga ni el tipo de día. | B para lectura de la reunión; P para límite operativo definitivo por conflicto con SD-P03 v10. |
| 20:50–22:00 frente a 22:00–23:31 | La ampliación automática por devolución fue explicación del presentador, seguida de una corrección de Sonia sobre pedirla antes del informe. No hay cierre que permita renovar automáticamente los términos por cada devolución. | Mantener separadas corrección y prórroga. |

Se verificó en el PDF original `Documentos Fuente/Reparto misiones de trabajo investigadores/Levantamiento de información/3. SD-P03 (6).pdf`, página 10, actividad 9:

- El investigador solicita al **OSNDP** la ampliación con argumentación, a través del SGDEA o canal transitorio previsto.
- La primera ampliación es **máximo por un término igual al inicialmente concedido**. «Máximo» no equivale a conceder siempre el plazo completo.
- Si se necesita una ampliación adicional, se acuerda con el OSNDP la fecha límite.
- En ambos casos se informa al responsable del control de misiones para su registro.

La misma copia, página 5, política 6, menciona 25 días calendario para campo y 45 días calendario para labores periciales. Son referencias de esa versión, no una regla que se active para todos los servicios en octubre de 2026. El PDF se identifica como versión 10, vigente desde 18-oct-2023, y advierte que la copia descargada es no controlada.

Por tanto, la incertidumbre real **ya no es entender si el término inicial cuenta como prórroga**. Se necesita reconciliar el régimen que describe la reunión con la actividad 9 del procedimiento: quién autoriza, qué límite ordinario/excepcional rige, cómo se determina la duración y qué versión está vigente. Activar `maxExtensions = 1` como barrera absoluta o dar siempre 25 días reproduciría una interpretación incompleta.

### Remisión y actividades en otra regional

| Evidencia temporal | Conclusión |
|---|---|
| 39:50–42:24, Blanca expone una misión de utilidad pública con entrevista en Bogotá y arraigo en otra ciudad | El apoyo territorial puede pertenecer al mismo encargo. No exige dividir artificialmente la necesidad ni obligar al defensor a repetir los datos comunes. |
| 42:24–43:56, Luis Felipe plantea envío a central o directamente a la regional y deja la alternativa abierta | Este pasaje aislado no era suficiente para imponer una sola ruta. |
| 44:51–47:40, Sonia explica que al leer el informe se detectan actividades pendientes en otra regional | El PG/PAG puede originar la remisión al revisar lo realizado; el investigador no tiene que ser quien la solicite siempre. |
| 46:44–48:18, el presentador propone devolver al defensor para nueva solicitud | Es una propuesta intermedia, no la conclusión final. |
| 48:49–51:36, Nancy describe remitir a Barranquilla para que el PG/PAG de destino asigne, rechaza devolver al defensor, permite varias misiones relacionadas y precisa mismo SPOA y usuario; Sebastián acepta ajustar | **Se aclara la remisión a la regional receptora sin nueva radicación del defensor. No procede hacer obligatorio nivel central para todas las remisiones.** La gestión central de excepciones sigue siendo distinta de esta remisión ordinaria. |
| 49:10–50:20, ejemplo de médico disponible en Barranquilla | La necesidad territorial también puede detectarse al repartir inicialmente, no sólo al revisar un informe final. |
| 50:20–51:13, actividades ya hechas y pendientes | La regional receptora debe conocer qué se ejecutó y qué le corresponde, sin repetir labores. |

«Mismo usuario» en este ejemplo se refiere al beneficiario/procesado del encargo, no a imponer el mismo investigador ni a confundirlo con el usuario autenticado de la aplicación. El SPOA y las personas del caso enlazan las actuaciones; cada actividad puede tener investigador y regional diferentes.

Queda suficientemente definido el comportamiento funcional de remisión y no se vuelve a plantear una pregunta genérica de «¿siempre central?». El detalle de permisos, recepción y excepciones se materializa en una política territorial trazable, sin libre elección de investigador. El contrato actual de la demo sólo acepta ruta `CENTRAL`; **eso es una limitación de implementación que debe corregirse al abordar este incremento, no evidencia de que la reunión haya impuesto esa ruta**.

### Otros puntos que sí se pueden dejar aclarados

| Tema | Tiempo aproximado | Lectura consolidada |
|---|---|---|
| Verificación y envío | 22:42–25:01 y 36:28–37:31 | Informe → revisión/verificación PG/PAG → constancia/formulario → envío del investigador al defensor. No es cierre automático al cargar. La captura vigente del aplicativo ya separa aprobación y constancia de envío. |
| Cinco dígitos | 52:54–53:24 | Nancy solicita explícitamente cinco dígitos; el equipo acepta. Ya está implementado en la revisión publicada. |
| F147 y consulta | 27:15–36:28 | Debe aprovecharse la captura para control y seguimiento sin doble digitación. La sustitución del Excel requiere producción, pruebas, datos completos y ajuste de procedimiento; no se declara eliminado con la demo pública. |
| Excel y reportes | 25:29–27:02 y 32:47–34:03 | Se ofrece exportación; reportes particulares/Power BI se refinan posteriormente. La descarga básica ya está disponible; las fórmulas oficiales no se infieren. |
| Notificaciones | 37:32–39:48 | Compromiso expreso de correo al investigador al asignar y al defensor al finalizar; consulta de asignación dentro del aplicativo. No queda expresamente cerrado el correo de asignación al defensor. |
| Enrutamiento documental e IRIS | 53:24–01:03:00 | Repartir dentro de SIGIP no equivale a radicar/enrutar en IRIS ni a conformar allí el expediente. La integración no estaba disponible y se solicita reunión con TICs; una referencia IRIS no acredita sincronización. |
| Resultado pendiente de TICs | 01:02:41–01:03:00 | Se informaría en una reunión posterior. La reunión nueva de Víctimas no aporta ese resultado. |

## Víctimas del 8 de octubre

| Tema y evidencia | Conclusión de revisión | Efecto frente al árbol de trabajo |
|---|---|---|
| 07:54–10:37, Edna explica que un procedimiento que incluirá Investigación y Víctimas se entregaría el viernes 9-oct para revisión; no conoce inicio de vigencia. El presentador reconoce que debe solicitarlo. Se retoma en 57:34–59:08. | Hay un nuevo procedimiento anunciado, no evidencia de que estuviera aprobado o vigente. Un documento común no fusiona las máquinas de estados de las dos áreas. | Solicitar únicamente versión controlada/vigencia para resolver conflictos, no repetir una lista genérica de preguntas ya documentadas. |
| 10:59–15:02, Álvaro, Teresa y Luz Helena distinguen identificador interno, número del proceso y delito; el presentador acepta explicitar delito. | Se deben separar el consecutivo interno de solicitud y el identificador judicial. El delito no sustituye al radicado ni queda sólo en hechos. Los identificadores se conservan como texto aunque tengan contenido numérico, para no perder ceros/precisión. | Campo de delitos ya existe tras la corrección 26. Sigue pendiente homologar etiquetas y validación del identificador judicial según el régimen; no imponer SPOA de 21 dígitos a todos los casos de Víctimas. |
| 21:19–22:19, Edna aclara que en psicología se realiza una única actividad; el presentador acepta retirar «Dictamen pericial psicológico» como opción separada. | **No tratar dictamen y evaluación psicológica como dos servicios independientes que duplican la misma labor en Víctimas.** | La semilla actual aún contiene `SVC_VIC_DICTAMEN_PSICOLOGICO`. Es un ajuste identificado, no una duda para volver a preguntar. Debe retirarse de nuevas solicitudes con catálogo versionado y conservar registros históricos. No se eliminan sin evidencia todos los servicios financieros ni la asistencia a audiencia. |
| 22:30–26:54, Mercedes pregunta por víctima directa/indirectas y el presentador muestra filas múltiples. | Personas múltiples, tipo y vínculo familiar dentro de la solicitud, sin repetir datos del caso. | Ya cubierto en el modelo de demo; no define un máximo ni un umbral obligatorio de carga masiva. |
| 27:17–33:34, ingreso/soporte y anexos; 33:54–47:37 desacuerdo sobre quitar o conservar; 47:44–49:15 solución provisional del presentador. | La última solución es **mantener opcionales ingreso y soporte**, mientras se revisa internamente el formulario. No es correcto cerrar el análisis en la propuesta previa de borrarlos. Los anexos se pueden adjuntar y no debe impedirse el trámite porque no exista certificado laboral en todos los casos. | Los campos actuales ya son opcionales. Mantener dato aportado por RJV separado de liquidación del perito; no convertir presunción de salario mínimo en cálculo automático universal. |
| 49:15–52:43, validación previa, devolución con observación, aprobación y reparto explicable. | Se sostiene aprobación previa, devolución para corregir y reparto posterior. El presentador corrige expresamente «rechazar» por «devolver». | Mantener el flujo separado de Investigación. El nombre del perfil demo no aprueba un RACI institucional único para todas las regionales. |
| 53:15–55:42, ejecución/improcedencia/F171 y cierre. | La entrega ordinaria del F171 cierra sin nueva aprobación final PAG. | Ya cubierto; no agregar una revisión final por analogía con Investigación. |
| Aproximadamente 54:42–55:12, el presentador dice que PAG también podría descargar el F171. | Esa frase contradice la respuesta escrita `DEFENSORIA DEL PUEBLO.docx`, C.6: PAG sólo metadatos, no contenido. No es una nueva decisión explícita del dueño funcional que revoque la reserva escrita. | Conservar acceso de contenido al perito asignado y RJV titular. No abrir el informe a PAG como resultado de la demostración. No se vuelve a consultar una reserva ya respondida por escrito. |
| Revisión de toda la transcripción y contraste con ASR | No se establece duración/límite de prórrogas, nuevo término estándar ni ruta territorial de remisiones. | No trasladar la corrección «una prórroga» o el ejemplo de 25 días de Investigación a Víctimas. |

La referencia SD-P06-I14 ya disponible contiene un plazo de 40 días hábiles y evento de radicación completa, según el contraste previo del informe 23. La reunión de julio habla de otras referencias temporales y la de octubre no las reconcilia. El procedimiento nuevo anunciado podría resolverlo; no se afirma que ya lo haya hecho. La revisión de octubre, por sí sola, no autoriza un plazo productivo distinto.

## Preguntas que realmente quedan para cerrar

Las preguntas reducidas y listas para remitir están en [29 — Preguntas funcionales después de revisar las reuniones](29_PREGUNTAS_FUNCIONALES_TRAS_REVISION_DE_REUNIONES.md). El núcleo es:

1. **Investigación:** identificar procedimiento vigente y reconciliar la actividad 9 del SD-P03 v10 con la propuesta de una prórroga/gestor regional de la reunión. Si rige la v10, no se pregunta de nuevo por una duración arbitraria: se modela máximo igual al término inicial, con acuerdo adicional del OSNDP cuando corresponda. Si la sustituyó otra versión, se requiere su regla aprobada.
2. **Víctimas:** identificar la versión vigente del procedimiento/instructivo que regula plazos y, si existe prórroga, su regla propia. La reunión nueva no permite responder esos datos.

No hace falta una nueva confirmación genérica sobre solicitud previa al informe, posibilidad de remitir a la regional sin devolver al defensor, cinco dígitos, distinción de personas, aprobación previa de Víctimas, cierre directo del F171 u opcionalidad provisional de los ingresos. Son temas con evidencia o tratamiento conservador ya identificados. Quedan aparte los entregables de configuración/integración (TICs, formatos oficiales, catálogos) que no pueden extraerse de una conversación si no fueron entregados.

## Disciplina y alcance del cambio

Se crean este informe y el documento 29; se actualizan índice, registro de decisiones y referencias de la línea base de ajustes. Los auxiliares de extracción se guardan en una ruta ya ignorada. No se modifica código del aplicativo, no se crean migraciones, no se cargan documentos institucionales al Space y no se ejecuta una nueva publicación.

Comprobaciones: lectura íntegra de ambos Word; procesamiento completo de ambos archivos audiovisuales; 136/120 segmentos ASR con principio y final verificados; 34/30 capturas sistemáticas y cuatro/tres focalizadas; página 10 del PDF SD-P03 original renderizada e inspeccionada; contraste de reserva C.6, catálogos y validadores actuales. No se reejecuta la suite del aplicativo por una modificación exclusivamente documental.
