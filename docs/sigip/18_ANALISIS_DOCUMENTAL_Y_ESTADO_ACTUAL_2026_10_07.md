# Análisis documental y estado actual de SIGIP-DP

Fecha de revisión: 7 de octubre de 2026, hora de Colombia. Revisión acotada a un máximo de diez minutos. Este informe describe evidencias, contradicciones y prioridades; no constituye aprobación institucional de reglas ni certificación de producción.

La solución tiene avances funcionales verificables en ambos flujos, pero conserva persistencia demostrativa, operaciones pendientes de definición y una brecha en la información que devuelve la API al ejecutor. La prioridad es terminar el contrato funcional y su autorización antes de iniciar Oracle. No conviene reconstruir la aplicación a partir del prototipo HTML ni implementar literalmente las 32 HU.

## 1. Alcance y evidencia revisada

Se inventariaron 59 archivos en `Documentos Fuente`: 38 DOCX, 7 PDF, 1 XLSX, 4 MP4, 2 ZIP, 3 HTML, 2 TXT, 1 Markdown y 1 DOC. Se extrajo texto de 49 archivos sin errores de extracción reportados. Extraer texto no equivale a revisar íntegramente cada documento ni valida firmas o contenido en imágenes.

La revisión priorizó:

- Los siete documentos obligatorios `00` a `06`, la matriz de brechas/RACI, el contrato pre-Oracle y el registro de decisiones.
- Los criterios de aceptación de las 32 HU originales y su correspondencia con las salvedades consolidadas.
- El diccionario de datos, el levantamiento con respuestas, el BPMN, el plan de transformación, la propuesta de arquitectura y la propuesta GLPI.
- Las transcripciones parciales de Investigación y reparto de peritos; la transcripción de gobernanza de Víctimas fue extraída y situada como fuente del proceso relacionado de IRIS.
- El backend, las estrategias de reparto, la autorización, la presentación de solicitudes y las pruebas existentes.
- Los metadatos públicos del Space, su salud, README y comparación de cinco archivos fuente publicados.

El manual de identidad visual fue extraído, pero no recibió una auditoría visual completa. El PDF de medidas de utilidad pública tiene apenas 37 caracteres extraíbles y requiere revisión visual/OCR. El formulario legado `.doc` no se convirtió. Los videos y ZIP se inventariaron; no se realizó transcripción ni visionado integral. Los textos extraídos y los scripts de comprobación quedaron en `tmp/analisis_sigip` como material local de trabajo, no como documentación institucional para publicar.

### Novedad documental

El video de socialización del 14 de julio de 2026 **sí está ahora presente** en `Documentos Fuente/Videos Reuniones`. También están disponibles el ZIP y el directorio extraído de las HU. Los documentos anteriores que los califican como no disponibles describen una situación histórica y deben actualizarse tras una revisión efectiva de las nuevas fuentes. Su presencia no significa que este análisis haya revisado las reuniones completas.

Los archivos disponibles incluyen HU-01 a HU-32. No se identificaron originales de HU-33 a HU-55. Las ampliaciones del backlog no deben presentarse como historias aceptadas solo porque las menciona el contexto.

## 2. Versión local y publicación

| Evidencia | Resultado observado |
|---|---|
| Rama local | `fix/vista-version-aprobada-por-item` |
| HEAD local | `76c027cd299c3d6eab29fc57622bca4c99784a09` |
| Fecha y asunto del commit | 10-sep-2026, 15:36:42 COT; `fix(victimas): habilitar corrección real versionada (#4)` |
| Cambios preexistentes sin commit | Servicio demo, pruebas API, PortalPage, estilos y pruebas de navegador; además, documento de revisión no versionado |
| Space | [SIGIP-DP](https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp) |
| Commit del Space | `5b680a7fbfda5734e99dca7d6f4c084485a15e85` |
| Última modificación informada por Hugging Face | 10-sep-2026, 15:38:23 COT |
| Runtime | `RUNNING`, Docker, una réplica |
| Salud remota | HTTP 200, `ok: true`, servicio `sigip-dp-api` |

Los SHA del repositorio y del Space pertenecen a repositorios distintos y no se comparan directamente. Se contrastó el contenido, normalizando finales de línea, de cinco archivos: servicio demo, router demo, PortalPage, capacidades y repositorio demo. Los cinco coinciden con HEAD local. El servicio demo y PortalPage difieren del árbol de trabajo actual; los otros tres coinciden también con él.

Por tanto, las mejoras locales de presentación de la versión aprobada todavía no están publicadas en esos archivos. Esta comprobación no demuestra igualdad de todos los archivos ni de la configuración del despliegue.

El README publicado define el Space como presentación pública, con información preparada, reconstruida al iniciar el contenedor, sin datos personales reales, documentos institucionales ni Oracle. Que `/api/health` indique `environment: production` describe el modo de ejecución, no la madurez institucional.

## 3. Qué fuentes deben gobernar el desarrollo

El orden documental propuesto sigue siendo adecuado: procedimiento institucional vigente y aprobado, HU aceptada, decisión funcional explícita, respuesta oficial, reglas/modelo consolidados y, finalmente, prototipo/código. La fecha de un archivo por sí sola no resuelve una contradicción.

Las marcas **C, B, D y P** expresan el grado de evidencia: C puede sustentar implementación; B necesita parametrización y validación; D representa diseño sujeto a revisión; P no autoriza una regla operativa definitiva. Ninguna sustituye una aprobación institucional.

Los textos de septiembre que afirman que no hay Víctimas, reparto backend o pruebas son diagnósticos históricos. En el estado revisado esas capacidades existen. La persistencia en memoria sí continúa vigente.

### Contradicciones que requieren cierre trazable

| Tema | Evidencias en conflicto | Tratamiento recomendado |
|---|---|---|
| Plazos de Investigación | HU-07: 25/45 hábiles; BPMN y respuestas: 25/45 calendario; copia SD-P03 v10: 25/45 calendario | Confirmar versión oficial vigente y configurar políticas por servicio y evento |
| Plazo de asignación | La copia SD-P03 señala hasta 3 días hábiles entre recepción y asignación | Separar esta medición del término de ejecución; validar vigencia |
| Utilidad pública | Respuestas mencionan 15 calendario y memorando específico; adjunto requiere OCR | Incorporar una excepción documentada solo con evidencia verificada |
| Plazos de Víctimas | 40 hábiles en HU/diccionario frente a otras referencias a 30 hábiles/45 calendario | Mantener `DEC-PLZ-001`; no transferir términos de Investigación |
| Turno y carga | Respuestas: turno dentro de especialidad; motor: menor carga, última asignación e ID | Resolver `DEC-TURNO-001` y conservar versión de política |
| Grado | HU propone competencia/grado; respuestas piden no vincular todavía reglas al cargo por revisión de funciones | Validar aplicabilidad y vigencia; no introducir filtro arbitrario |
| Cobertura | HU usa misma regional; respuestas contemplan regional próxima, macroregiones y equidad nacional | Definir matriz territorial por área y especialidad, incluida derivación |
| Regionales | HU: 15; diccionario: 34; revisión posterior menciona 42 | Catálogo oficial con fuente y vigencia; ninguna cantidad fija |
| Víctimas | HU-23 incluye misma regional/carga menor a seis; fuentes posteriores usan cobertura y balance | Reescribir HU-23 según estrategia propia |
| Excepción manual | HU-26 permite cualquier activo sin regional/grado | Definir autorizador y requisitos no excepcionables antes de habilitar |
| Modelo Oracle | Diccionario centra especialidad, ejecutor y estado en solicitud; contrato actual requiere varios ítems | Revisar cardinalidades antes de mapear o conectar Oracle |

La copia local de SD-P03 es versión 10, con fecha de vigencia impresa 18-oct-2023, y se advierte como copia no controlada. Se observó su contenido; **no se verificó su vigencia actual en el SGC**. Los valores anteriores se registran como evidencia documental, no como constantes aprobadas.

## 4. Flujos realmente implementados

### Investigación

La radicación crea los ítems y dispara reparto backend por cada uno. El recorrido es `RADICADA → ASIGNADA → EN_EJECUCION → INFORME_ENTREGADO → CERRADA`. Si no hay candidato queda `PENDIENTE_EXCEPCION`. PAG puede devolver un informe a ejecución con observación; una nueva entrega crea otra versión.

No se ha agregado una aprobación previa del Administrador Regional. Es coherente con mantener pendiente su RACI, pero obliga a reescribir HU-11/17/22 y sus criterios antes de aceptación formal.

### Víctimas

El recorrido es `PENDIENTE_APROBACION_PAG → APROBADA_REPARTO → ASIGNADA → EN_EJECUCION → CERRADA`. La devolución conduce a `DEVUELTA`, seguida de corrección y reenvío versionados. La aprobación ocurre por ítem y dispara el reparto. Si no hay candidato queda `PENDIENTE_EXCEPCION`. El cierre ordinario exige referencia al F-171 y no recibe aprobación final PAG.

La corrección de otro ítem conserva el vínculo del ítem ya aprobado a su versión anterior. Esto está probado. La restricción de información enviada al perito todavía presenta la brecha descrita a continuación.

Los estados agregados distinguen solicitudes parcialmente cerradas. El caso, la solicitud, las personas, los ítems, asignaciones y productos son conceptos del contrato; aún no existe un modelo persistente normalizado que los materialice integralmente.

## 5. Hallazgos prioritarios

### H-01 Información de otro ítem y correcciones no aprobadas en la respuesta al perito

**Prioridad inmediata. Reproducido localmente.** `visibleRequests` filtra `request.items`, pero conserva los demás campos de la solicitud; `presentRequest` devuelve el objeto completo, incluidas las versiones. El snapshot aprobado también conserva los datos de todos los ítems de esa versión.

La comprobación local creó una solicitud con psicología y financiera, aprobó psicología, devolvió financiera y corrigió sus hechos sin aprobarla. Al consultar bootstrap como perito de psicología se observó:

- Solo el ítem de psicología en `request.items`.
- Los hechos corregidos todavía no aprobados en `request.caseData`.
- Las versiones 1 y 2 completas en `request.versions`.
- El ítem financiero no asignado al perito dentro de `approvedRequestData.items`.
- Los hechos originales correctamente conservados en el snapshot aprobado de psicología.

La corrección local de la interfaz oculta información actual para ese perfil, pero el JSON sigue exponiéndola. Ocultar campos no satisface RN-COM-003/005 ni el requisito de ejecutar únicamente sobre información aprobada aplicable al ítem. La comprobación usa datos ficticios y no modifica el Space.

**Corrección siguiente:** construir una proyección del servidor específica por capacidad y por ítem; entregar al ejecutor únicamente datos y documentos autorizados de la versión aprobada, y filtrar también snapshots, versiones, observaciones y metadatos anidados. Añadir una prueba negativa que asegure ausencia de datos de correcciones ajenas sin aprobar. La política de acceso a datos comunes y versiones históricas requiere definición explícita.

### H-02 Persistencia y auditoría demostrativas

`InMemoryDemoRepository` clona el estado y confirma una operación síncrona dentro de un proceso. El reinicio/restablecimiento reconstruye la semilla. Esto permite una demostración coherente, pero no satisface persistencia operativa, auditoría durable ni concurrencia entre procesos.

La prueba de dos repartos concurrentes pasa en una instancia y comprueba que no se pierde la carga en ese entorno. No acredita bloqueos transaccionales de una base de datos o despliegue con múltiples trabajadores. Mantenerlo documentado como límite; no iniciar Oracle en esta revisión.

### H-03 Reparto explicable pero todavía basado en parámetros demostrativos

Hay estrategias separadas, exclusiones por disciplina/especialidad, cobertura, disponibilidad y, en Víctimas, ley/programa. La explicación conserva candidatos, métricas, exclusiones y versión de política. El desempate es determinista.

Sin embargo, la carga incorpora `demoBaseLoad`, las coberturas provienen de semilla y la disponibilidad es un booleano. No existe gestión vigente y completa de novedades ni una matriz institucional con vigencia por especialidad. La política también debe cerrar turno frente a menor carga. Estos elementos impiden calificar el reparto como aprobado para operación real.

### H-04 Documentos y comunicaciones incompletos

La entrega y versionado conservan referencias textuales. No equivalen a subir, almacenar, validar tipo/tamaño/hash, analizar o descargar un archivo real. Faltan control de acceso documental y trazabilidad de consulta/descarga. Tampoco se observó una bandeja de salida persistente, envío real de correo ni sus reintentos idempotentes.

### H-05 Autenticación institucional y sesión pendientes

La autorización por capacidad, alcance y vigencia está implementada y existen pruebas negativas útiles. El administrador técnico no puede repartir ni aprobar por su rol. La autenticación disponible sigue siendo de presentación; JWT y elección de cuenta no constituyen SSO institucional. No se observó aviso y cierre por inactividad configurable ni orientación operativa de recuperación institucional.

### H-06 Operaciones bloqueadas con fundamento

Reasignación, transferencia, novedad, excepción manual, prórroga, ampliación y actualización posterior de F-171 tienen contratos deshabilitados y decisiones identificadas. Improcedencia y carga masiva tampoco están habilitadas. El bloqueo evita inventar responsables, pero el ciclo completo de operación permanece pendiente: no debe contarse como funcionalidad terminada.

### H-07 Modularidad declarada y concentración de implementación

La estructura de carpetas refleja el monolito modular esperado, pero gran parte de ambos dominios sigue concentrada en `modules/demo/service.js` y `PortalPage.jsx`. Los índices de varios módulos declaran responsabilidades. La evolución debe extraer transiciones, validadores y proyecciones hacia los módulos pertinentes sin introducir microservicios.

### H-08 Presentación histórica y publicación desalineadas

La nueva presentación de datos aprobados está en cambios locales preexistentes. El Space conserva el contenido de HEAD en los archivos contrastados. Las pruebas verdes corresponden al árbol de trabajo local, no certifican automáticamente el despliegue público.

## 6. Correspondencia de las 32 HU con el estado actual

La matriz documental conserva **14 mantener, 14 ajustar y 4 replantear** —HU-10, HU-14, HU-17 y HU-23—. Esa clasificación expresa cómo refinar requerimientos, no su grado de implementación.

En esta tabla, «implementado en demo» se limita al comportamiento probado con memoria y datos de presentación; no significa cumplimiento del criterio global de persistencia del MVP.

| HU | Estado observado | Salvedad principal |
|---|---|---|
| 01 | Parcial | Login demo y perfiles; falta Directorio Activo/SSO y auditoría institucional de acceso |
| 02 | Ausente en el alcance revisado | Canal/enlace de recuperación institucional |
| 03 | Ausente en el alcance revisado | Inactividad, advertencia y política configurable |
| 04 | Implementado en demo | Áreas autorizadas y navegación contextual; preservar alcance ejecutivo autorizado |
| 05 | Parcial | Capacidades/perfiles semilla; falta administración completa de usuarios y ciclo de inactivación |
| 06 | Parcial | Especialidad/cobertura/disponibilidad demo; grados y novedades pendientes |
| 07 | Parcial y bloqueado | Catálogo/versiones consultables; gobierno y plazos sin aprobación |
| 08 | Parcial y bloqueado | Disciplina propia; no validar 40 hábiles por defecto |
| 09 | Parcial | Captura de conducta; no se verificó catálogo completo de delitos/competencia ni filtro de grado aprobado |
| 10 | Parcial; requiere replantear | Catálogo ampliable; cantidad y fuente oficial pendientes |
| 11 | Parcial | Validación y multiítem; consecutivo en memoria y hito de reparto distinto de HU original |
| 12 | Parcial | Consulta/titularidad; plazo y semáforo omitidos por decisión pendiente |
| 13 | Bloqueado | `DEC-AMP-001`; no habilitar solo por existir contrato |
| 14 | Parcial; requiere replantear | Personas/multiítem/versiones; formato institucional y combinaciones por validar |
| 15 | Parcial | Consulta y estados; resolver proyección de información aprobada y filtros definitivos |
| 16 | Bloqueado | Ampliación, continuidad y plazo pendientes |
| 17 | Contradictorio con contrato; replantear | Gestor regional consultivo; no aprobador universal |
| 18 | Parcial | Devolución/corrección de Víctimas con historial; sin correo real ni flujo previo equivalente en Investigación |
| 19 | Parcial | Historial/versiones; alcance regional y filtros deben refinarse |
| 20 | Bloqueado | Se excluye disponibilidad de semilla; falta gestión de novedades vigente |
| 21 | Bloqueado y parcialmente contradictorio | Separar reasignación/transferencia; no universalizar misma regional |
| 22 | Parcial y contradictorio con criterios originales | Reparto servidor probado; revisión previa, seis y grado no aprobados |
| 23 | Parcial; requiere replantear | Cobertura/ley y aprobación previa; no heredar umbral seis |
| 24 | Parcial | Aprobación por ítem probada; falta RACI territorial/suplencias y corregir semántica de estados HU |
| 25 | Implementado en demo | Revisión/devolución/cierre y nueva versión de informe; plazo de devolución pendiente |
| 26 | Bloqueado y contradictorio | Override irrestricto incompatible con invariantes; `DEC-ASG-EXC` |
| 27 | Parcial | Ítems propios filtrados; proyecciones anidadas y semáforo pendientes |
| 28 | Implementado en demo con ajuste | Actuaciones por ejecutor e historial; se reemplaza porcentaje subjetivo |
| 29 | Implementado en demo | Bifurcación de cierre y referencia obligatoria; archivo real pendiente |
| 30 | Bloqueado | `DEC-PLZ-001`; falta cálculo/calendario institucional |
| 31 | Parcial | Conteos por área/alcance; fórmulas oficiales y dimensiones pendientes |
| 32 | Parcial | Conteos de bandeja; no se observó reporte exportable completo con corte y filtros |

## 7. Verificaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| `npm.cmd --prefix backend test` | 34 pruebas aprobadas, 0 fallidas |
| `npm.cmd --prefix frontend run build` | Compilación aprobada; 39 módulos transformados |
| `npm.cmd --prefix frontend run test:browser` | 10 pruebas aprobadas, incluidos recorridos de escritorio y móvil |
| Salud remota del Space | HTTP 200 |
| Comparación de cinco archivos Space/HEAD/árbol de trabajo | Coincidencia con HEAD; dos difieren del árbol actual |
| Comprobación negativa de proyección al perito | Brecha H-01 reproducida con datos ficticios; script `tmp/analisis_sigip/check_projection.mjs` |

Build y navegador requirieron ejecución autorizada fuera del aislamiento por un error de acceso de Esbuild. La compilación posterior fue correcta. No se ejecutó lint/formato en esta revisión. No se probó Oracle, correo, almacenamiento real, festivos o concurrencia entre procesos. Los tests existentes pasan, pero no cubren todas las exigencias del backlog ni la ausencia de información ajena en el JSON.

## 8. Orden recomendado para el próximo incremento

1. **Corregir H-01 en servidor** y verificar ausencia de información no autorizada en bootstrap y respuestas de acciones. Mantener la visualización aprobada por ítem y ampliar las pruebas negativas.
2. **Cerrar RACI y máquinas de estado por área**: responsables, alcances, suplencias, operaciones especiales y estados equivalentes frente a las HU originales.
3. **Resolver reparto y parámetros**: turno/carga, matriz territorial por servicio/especialidad, novedades y reglas de grado; registrar decisiones y versiones.
4. **Resolver términos con fuentes verificadas**: recepción, aprobación, asignación, ejecución y revisión como eventos separados; calendarios, pausas y vigencia. Obtener copia controlada de SD-P03 y evidencia del memorando de utilidad pública.
5. **Completar Víctimas**: improcedencia, actualización de F-171, ampliaciones y carga masiva, conforme a decisiones funcionales; conservar separación de brigadas y del proceso IRIS.
6. **Actualizar HU y aceptar recorridos**: incluir autorizaciones negativas, proyecciones por ítem, conservación histórica y operaciones bloqueadas. Revisar de forma focalizada los videos ahora disponibles.
7. **Preparar el contrato de persistencia** cuando lo anterior esté trazado: entidades, cardinalidades, integridad, transacciones, auditoría, documentos y outbox. Mantener Oracle fuera de esta fase hasta la instrucción correspondiente.

Los plazos no resueltos pueden permanecer sin valor definitivo, pero el modelo debe especificar qué evento inicia el cómputo y qué política versionada se aplicará. Una decisión pendiente no se resuelve activando una acción de la interfaz.

## 9. Cambios realizados por esta revisión

Se creó este informe y material temporal de extracción/comprobación. No se modificó código funcional, reglas, matriz de decisiones ni los cambios preexistentes. No se crearon migraciones, no se conectó Oracle y no se hizo commit, push o despliegue.

No se requiere configuración manual para leer el informe. Para convertir las prioridades en implementación se necesitan decisiones funcionales documentadas y, como primera acción técnica, corregir la proyección de autorización descrita en H-01. El Space puede continuar como demostración bajo las restricciones que ya declara su README.
