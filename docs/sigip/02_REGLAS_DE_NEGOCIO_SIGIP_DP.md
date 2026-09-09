# Reglas de negocio consolidadas — SIGIP-DP

Versión propuesta: 1.0  
Fecha de corte: 1 de septiembre de 2026

## 1. Convenciones de validación

| Marca | Significado | Uso en desarrollo |
|---|---|---|
| **C** | Confirmada en más de una fuente o expresamente acordada en reunión. | Puede implementarse y probarse. |
| **B** | Línea base documentada, incluida en las 32 HU, pero sin aprobación funcional firmada o con fuente normativa pendiente. | Implementar de forma parametrizable; validar antes de producción. |
| **D** | Decisión de diseño recomendada para resolver el modelo común. | Puede implementarse en el modelo técnico, con revisión del dueño funcional. |
| **P** | Pendiente o contradictoria. | No codificar como constante ni cerrar criterios de aceptación. |

Las marcas reflejan la evidencia disponible, no sustituyen la aprobación institucional.

## 2. Alcance y conceptos

| ID | Regla | Estado |
|---|---|---|
| RN-ALC-001 | El sistema atenderá dos áreas: Investigación para la Defensa y Representación Judicial de Víctimas. | C |
| RN-ALC-002 | Cada área tendrá su propio formulario, política de reparto, estados habilitados, términos y permisos. | C |
| RN-ALC-003 | El flujo general de atención de Víctimas en IRIS no forma parte del reparto de peritos, salvo integración expresamente aprobada. | C |
| RN-ALC-004 | La unidad común será la `SOLICITUD`; cada servicio técnico solicitado se manejará como `ITEM_SOLICITUD`. | D |
| RN-ALC-005 | En Investigación, el ítem representa una especialidad/radicado; en Víctimas representa un tipo de peritaje. | D |
| RN-ALC-006 | El área de una solicitud será obligatoria e inmutable después de radicar. Una corrección de área exigirá anulación y nueva solicitud. | D |
| RN-ALC-007 | Los registros no se eliminarán físicamente por operación funcional; se anularán o inactivarán con motivo y trazabilidad. | D |

### 2.1 Glosario operativo pre-Oracle

| Concepto | Definición vigente para el diseño |
|---|---|
| Caso | Contexto jurídico o de representación que puede originar varias solicitudes. |
| Solicitud | Radicación del Defensor o RJV que agrupa datos comunes y uno o más ítems. |
| Ítem de solicitud | Servicio específico con estado, plazo, asignación y producto propios. |
| Servicio | Necesidad elegible del portafolio institucional. No equivale a una especialidad. |
| Especialidad/disciplina | Conocimiento que determina qué ejecutores pueden atender un servicio. |
| Asignación | Vinculación versionada de un ítem con un investigador o perito. |
| Producto | Informe de Investigación, F-171 u otro entregable versionado. |
| Actuación | Actividad objetiva registrada durante la ejecución; no es un porcentaje subjetivo. |
| Ampliación | Nueva necesidad vinculada a un encargo cerrado; no borra su cierre original. |
| Reasignación | Cambio del ejecutor de un ítem. |
| Transferencia | Cambio del Defensor/RJV titular; no es reasignación. |
| Novedad | Evento con vigencia que modifica disponibilidad o capacidad de recibir trabajo. |
| Problema/incidente | Situación reportada sin cambio silencioso del estado principal. |
| Catálogo de Servicios | Portafolio versionado que describe oferta, alcance, requisitos, exclusiones y producto. |
| Dato maestro | Clasificación o parámetro con responsable, vigencia e historial. |
| Oportunidad | Resultado objetivo de comparar eventos y plazo vigente; es distinto del estado y del semáforo. |

## 3. Reglas comunes

### 3.1 Identidad, roles y visibilidad

| ID | Regla | Estado |
|---|---|---|
| RN-COM-000 | La autenticación de producción se delegará al proveedor institucional; SIGIP-DP no administrará contraseñas propias. | C/B |
| RN-COM-001 | En producción el usuario no escogerá libremente su rol; el rol y las áreas habilitadas provendrán de la identidad autenticada. | C |
| RN-COM-002 | Una persona podrá tener más de un perfil, pero deberá cambiar de contexto solo entre perfiles previamente autorizados. | D |
| RN-COM-003 | Los permisos se evaluarán en backend; ocultar botones en frontend no será un control suficiente. | D |
| RN-COM-004 | El defensor/RJV verá sus solicitudes y las que le hayan sido trasladadas formalmente. | C |
| RN-COM-005 | El ejecutor verá únicamente los ítems asignados a él, salvo permisos de consulta institucional explícitos. | D |
| RN-COM-006 | El PAG o responsable funcional verá las solicitudes bajo su ámbito; el alcance exacto —unidad, regional o nacional— será parametrizable. | P |
| RN-COM-007 | El administrador técnico gestionará usuarios, permisos y parámetros; no tomará decisiones operativas de reparto por el solo hecho de ser administrador. | C |
| RN-COM-008 | El retiro o inactivación de un usuario no eliminará su historial ni la autoría de actuaciones. | C |
| RN-COM-009 | El acceso a informes psicológicos o financieros deberá aplicar mínimo privilegio y registrar cada consulta/descarga. | D |
| RN-COM-009A | El cierre por inactividad advertirá al usuario y usará un tiempo definido por la política institucional de seguridad. | B/D |

### 3.2 Radicación, numeración y duplicados

| ID | Regla | Estado |
|---|---|---|
| RN-COM-010 | Una solicitud podrá guardarse como borrador antes de enviarse. | D |
| RN-COM-011 | Al radicar, el sistema generará un consecutivo único por área y año; nunca dependerá del conteo en memoria. | D |
| RN-COM-012 | Cada ítem técnico tendrá un consecutivo hijo único, ligado a la solicitud madre. | C/D |
| RN-COM-013 | El sistema verificará posibles duplicados antes de radicar y mostrará coincidencias por identificador del caso, persona, servicio y estado. | C/D |
| RN-COM-014 | Un duplicado no se fusionará automáticamente; el usuario autorizado decidirá continuar, vincular o cancelar y dejará justificación. | D |
| RN-COM-015 | La radicación y creación de todos los ítems será transaccional: o se crean todos o no se crea ninguno. | D |
| RN-COM-016 | Después de radicar, el solicitante no editará directamente la versión enviada; las correcciones se habilitarán mediante devolución o transición autorizada y conservarán historial. | C |

### 3.3 Estados e historial

| ID | Regla | Estado |
|---|---|---|
| RN-COM-020 | Cada área tendrá una máquina de estados explícita; no se aceptarán cambios arbitrarios de estado desde el cliente. | D |
| RN-COM-021 | Toda transición registrará estado anterior, estado nuevo, fecha/hora, usuario, rol, motivo y datos relevantes. | C |
| RN-COM-022 | Las correcciones conservarán la versión anterior de los campos modificados. | C |
| RN-COM-023 | Devolución, anulación, asignación manual, reasignación, improcedencia y ampliación exigirán motivo. | C |
| RN-COM-024 | Si una transición requiere soporte, se almacenará referencia documental y no solo texto libre. | D |
| RN-COM-025 | Los estados de la solicitud madre se calcularán a partir de sus ítems cuando existan varios; no deberán ocultar que un ítem está cerrado y otro activo. | D |

### 3.4 Catálogos y parámetros

| ID | Regla | Estado |
|---|---|---|
| RN-COM-030 | Especialidades, peritajes, leyes, hechos, regionales, tipos de novedad, estados, motivos y términos serán catálogos, no constantes de interfaz. | C |
| RN-COM-031 | Los catálogos tendrán vigencia (`desde`, `hasta`), estado y auditoría; inactivar un valor no alterará registros históricos. | D |
| RN-COM-032 | Los textos visibles conservarán tildes y nombres oficiales, aunque exista una columna normalizada para búsqueda. | D |
| RN-COM-033 | Los parámetros de plazo identificarán área, servicio, valor, tipo de día, vigencia y fundamento. | C/D |
| RN-COM-034 | Cambiar un plazo no recalculará silenciosamente asignaciones anteriores; se aplicará a nuevas asignaciones salvo acto explícito. | D |

### 3.5 Términos, prioridad y semáforo

| ID | Regla | Estado |
|---|---|---|
| RN-COM-040 | La fecha límite se calculará desde el evento definido por la política del área, normalmente la asignación efectiva. | B/P |
| RN-COM-041 | El cálculo distinguirá días calendario y hábiles usando un calendario institucional versionado. | C |
| RN-COM-042 | El semáforo será parametrizable por área/servicio; no se codificarán umbrales fijos en componentes. | D |
| RN-COM-043 | Una prioridad urgente no reducirá por sí sola el plazo contractual; registrará causal, fecha requerida y responsable que aceptó el compromiso. | D |
| RN-COM-044 | La cola urgente se ordenará por fecha requerida y luego por fecha/hora de radicación, salvo regla institucional distinta. | B/D |
| RN-COM-045 | Los vencimientos se recalcularán de manera periódica y no únicamente cuando un usuario abra la pantalla. | D |

### 3.6 Asignación

| ID | Regla | Estado |
|---|---|---|
| RN-COM-050 | El reparto automático se ejecutará en backend dentro de una transacción y registrará la versión de la política aplicada. | D |
| RN-COM-051 | El motor primero excluirá candidatos no elegibles y luego ordenará los elegibles; no mezclará ambos pasos. | D |
| RN-COM-052 | El desempate será determinista y auditable, usando carga, última asignación y un criterio estable final. | D |
| RN-COM-053 | La carga se calculará desde asignaciones activas reales, no desde un número editable en el registro del funcionario. | D |
| RN-COM-054 | Las novedades vigentes impedirán nuevas asignaciones; el funcionario conservará acceso a lo ya asignado según el tipo de novedad. | C |
| RN-COM-055 | Una asignación manual será excepcional, exigirá candidato, motivo, responsable y evidencia o referencia cuando aplique. | C |
| RN-COM-056 | Si no existe candidato, el ítem pasará a `PENDIENTE_REASIGNACION` o equivalente y no quedará silenciosamente sin responsable. | C |
| RN-COM-057 | Toda reasignación conservará el ejecutor anterior, fechas, motivo, soporte y trabajo ya realizado. | C |
| RN-COM-058 | La asignación manual no omitirá silenciosamente requisitos duros de especialidad, cobertura, habilitación legal o estado. Toda excepción aprobada identificará la regla omitida, autorizador, causal y evidencia. | C/D |

### 3.7 Documentos, notificaciones y auditoría

| ID | Regla | Estado |
|---|---|---|
| RN-COM-060 | Los archivos se almacenarán en el repositorio documental autorizado; Oracle guardará metadatos, versión, hash y referencia, no necesariamente el binario. | C/D |
| RN-COM-061 | Reemplazar un informe creará una nueva versión; la versión anterior no se sobrescribirá ni desaparecerá. | C |
| RN-COM-062 | Cada versión registrará autor, fecha, motivo, tipo documental, estado y vínculo con la solicitud/ítem. | C |
| RN-COM-063 | La descarga de documentos sensibles quedará auditada. | D |
| RN-COM-064 | Las notificaciones se generarán por eventos y se enviarán mediante una cola con estados pendiente, enviada y fallida. | C/D |
| RN-COM-065 | Una falla de correo no revertirá una radicación o asignación válida; quedará visible para reintento. | D |
| RN-COM-066 | Los mensajes incluirán identificador, área, servicio, responsable, fecha límite y enlace, sin exponer datos sensibles innecesarios. | D |
| RN-COM-067 | El sistema mantendrá auditoría de autenticación, cambios de permiso, consulta sensible, exportación, asignación y modificación de datos. | D |
| RN-COM-068 | Toda exportación indicará área, filtros, periodo, fecha de corte y usuario que la generó, respetando el alcance de datos del rol. | B/D |
| RN-COM-069 | Los indicadores distinguirán solicitudes, ítems, asignaciones, personas/víctimas y productos para evitar conteos incompatibles. | D |

## 4. Reglas específicas de Investigación

### 4.1 Solicitud y validación

| ID | Regla | Estado |
|---|---|---|
| RN-INV-001 | La solicitud será creada por un defensor público/OSNDP autorizado. | C |
| RN-INV-002 | El identificador jurídico será el SPOA de 21 dígitos numéricos. | C |
| RN-INV-003 | Se capturarán como mínimo defensor, regional de origen, PAG responsable, usuario/procesado, SPOA, delito, etapa, hechos, hipótesis, labores y especialidades. | B |
| RN-INV-004 | La lista definitiva de campos y obligatoriedad se tomará del formato SD-P03-F04 vigente. La HU-11 aporta SPOA, delito, regional, urgencia, especialidad, teoría del caso y soportes, pero no sustituye el formato oficial. | B/P |
| RN-INV-005 | Las etapas procesales se cargarán de catálogo; la línea base es Imputación, Acusación, Preparatoria, Juicio, Incidente de reparación y Casación. | B |
| RN-INV-006 | La solicitud permitirá una o varias especialidades. | C |
| RN-INV-007 | Cada especialidad generará un ítem/radicado con estado, ejecutor y plazo independiente. | C |
| RN-INV-008 | La solicitud deberá validar coherencia mínima entre hipótesis, labores y especialidad; el criterio humano final permanecerá en el rol revisor. | B/D |
| RN-INV-009 | Una devolución al defensor indicará campo o requisito afectado y permitirá corregir/reexpedir con historial. | C |

### 4.2 Portafolio y plazos

| ID | Regla | Estado |
|---|---|---|
| RN-INV-010 | La fuente enumera 17 especialidades iniciales, incluida Ingeniería ambiental. Son datos semilla ampliables, no un límite ni 17 servicios institucionales. | B |
| RN-INV-011 | Investigación de campo tiene una referencia de 25 días; debe confirmarse si son hábiles —HU-07— o calendario —reglas anteriores—. | P |
| RN-INV-012 | Labores periciales tienen una referencia de 45 días; debe confirmarse si son hábiles —HU-07— o calendario —reglas anteriores—. | P |
| RN-INV-013 | Investigación de campo bajo utilidad pública/Ley 2292 tiene como línea base 15 días calendario. | B |
| RN-INV-014 | La reducción por utilidad pública solo aplicará a los ítems de campo que cumplan la causal, no a todos los ítems de la solicitud. | B/D |
| RN-INV-015 | Los valores anteriores permanecerán parametrizados hasta contrastarlos con el procedimiento y formato vigentes; las HU no resuelven el tipo de día. | P |

### 4.3 Política de reparto de Investigación

| ID | Regla | Estado |
|---|---|---|
| RN-INV-020 | El candidato deberá estar habilitado para la especialidad solicitada. | C |
| RN-INV-021 | El candidato deberá estar activo y sin novedad que impida nuevas asignaciones. | C |
| RN-INV-022 | El reparto aplicará la regional o cobertura definida para el servicio; debe confirmarse si manda la regional del defensor, la del servicio o una macroregión. | P |
| RN-INV-023 | La competencia del delito se relacionará con grado 15 municipal, 17 circuito y 18 especializado. | C/B |
| RN-INV-024 | Debe confirmarse si el grado se exige exactamente, como mínimo, y si aplica a todas las especialidades o solo a investigación de campo. | P |
| RN-INV-025 | Entre candidatos elegibles se asignará al de menor carga y, en empate, al de asignación más antigua. | B/D |
| RN-INV-026 | El valor seis no será un límite fijo en código. La capacidad máxima será parámetro por persona/servicio; su valor inicial requiere aprobación. | P/D |
| RN-INV-027 | Si no existe candidato regional, el sistema aplicará la ruta de cobertura/macroregión aprobada o escalará a asignación manual central. | B/P |
| RN-INV-028 | El funcionario asignado no podrá modificar los datos originales de la solicitud; reportará el problema. | C |
| RN-INV-029 | El rol autorizado decidirá corregir, devolver, reasignar o escalar el reporte. | C |

### 4.4 Ejecución, cambios y cierre

| ID | Regla | Estado |
|---|---|---|
| RN-INV-030 | El investigador podrá iniciar, registrar avances, anexar evidencias y entregar el informe. | B |
| RN-INV-031 | El informe de Investigación requerirá revisión/aprobación del PAG antes del cierre. | C |
| RN-INV-032 | Un rechazo de entrega devolverá el ítem a corrección con observación y plazo/fecha definidos. | D/P |
| RN-INV-033 | El cambio de investigador podrá ser realizado por el PAG delegado y no requerirá firma del Defensor Regional según la socialización disponible. La HU-21 confirma gestión de cambio, pero no define quién autoriza. | C/P |
| RN-INV-034 | El cambio de investigador exigirá motivo, observación y soporte o referencia administrativa cuando aplique. | C |
| RN-INV-035 | La sustitución del defensor actualizará el responsable del caso sin reasignar automáticamente al investigador. | C |
| RN-INV-036 | El investigador verá al defensor vigente y se conservará el historial de sustituciones. | C |
| RN-INV-037 | Una ampliación solicitada por el defensor quedará vinculada a la misión original, exigirá causal y estará disponible, como línea base HU-13, cuando la misión esté completada. | B |
| RN-INV-038 | Debe definirse si la ampliación conserva investigador, crea nuevo ítem, recibe plazo completo y requiere aprobación previa. | P |
| RN-INV-039 | Una ampliación no modificará ni reabrirá silenciosamente la misión original; conservará vínculo e historial. | D |

## 5. Reglas específicas de Víctimas — reparto de peritos

### 5.1 Solicitud, víctimas y servicios

| ID | Regla | Estado |
|---|---|---|
| RN-VIC-001 | La solicitud será creada por un RJV/defensor autorizado y enviada a aprobación previa del PAG o responsable definido. | C |
| RN-VIC-002 | La única intervención obligatoria del PAG descrita inicialmente es aprobar/devolver antes del reparto; la entrega del perito es directa. | C |
| RN-VIC-003 | El identificador del caso será el radicado del proceso; su formato definitivo debe validarse. | C/P |
| RN-VIC-004 | La solicitud capturará ley/programa, hecho victimizante, lugar/territorio, audiencia, servicio requerido, relato y anexos aplicables. | C |
| RN-VIC-005 | Una solicitud podrá vincular múltiples víctimas directas e indirectas y su parentesco. | C |
| RN-VIC-006 | Los datos comunes del caso se registrarán una vez; los datos propios de cada víctima se registrarán en filas separadas. | C/D |
| RN-VIC-007 | El sistema permitirá carga masiva controlada para casos de 25 o más víctimas mediante plantilla validada, además de captura manual. | C/D |
| RN-VIC-008 | La estructura de víctima/familia debe soportar homicidios, desapariciones, desplazamientos y otros hechos sin limitarse a una sola plantilla. | C/D |
| RN-VIC-009 | Los peritajes iniciales son psicológico y administrativo/financiero. | C |
| RN-VIC-010 | Se propone permitir uno o ambos peritajes en una solicitud madre, generando ítems independientes; requiere confirmación funcional. | P/D |
| RN-VIC-011 | La lista de leyes, hechos victimizantes, parentescos y anexos obligatorios será parametrizable y versionada. | C |
| RN-VIC-012 | El catálogo de hechos disponible es parcial y no podrá declararse completo hasta recibir la matriz oficial. | C |

### 5.2 Aprobación y corrección

| ID | Regla | Estado |
|---|---|---|
| RN-VIC-020 | Después de radicar, la solicitud pasará a aprobación previa; no se asignará un perito antes de la aprobación. | C |
| RN-VIC-021 | La devolución previa indicará requisitos faltantes y permitirá corrección por el RJV. | C |
| RN-VIC-022 | El perito no editará los datos de la solicitud; reportará errores o improcedencia. | C |
| RN-VIC-023 | Un rol de gestión distinto del perito decidirá corregir, devolver o reasignar. Su denominación y alcance territorial deben confirmarse. | C/P |

### 5.3 Política de reparto de Víctimas

| ID | Regla | Estado |
|---|---|---|
| RN-VIC-030 | El candidato deberá estar habilitado para el tipo de peritaje. | C |
| RN-VIC-031 | El territorio del caso deberá estar incluido en la cobertura vigente del perito y no estar excluido. | C |
| RN-VIC-032 | El candidato deberá estar habilitado para la ley o programa del caso. | C |
| RN-VIC-033 | El candidato deberá estar activo; vacaciones u otra novedad impedirán nuevas asignaciones sin retirar las existentes. | C |
| RN-VIC-034 | El grado del funcionario no se utilizará como filtro de reparto en Víctimas. | C |
| RN-VIC-035 | Entre candidatos elegibles se buscarán cargas parejas; no se aplicará el umbral fijo de seis usado en el HTML. | C |
| RN-VIC-036 | La carga se comparará dentro del grupo realmente elegible por servicio, ley y cobertura, no contra todos los peritos. | D |
| RN-VIC-037 | La excepción de quien atiende solo Ley 975 debe representarse como habilitación de ley, no mediante nombre escrito en código. | C/D |
| RN-VIC-038 | La cobertura de Atlántico (departamento o región Caribe) permanece pendiente; el motor usará datos vigentes y auditables. | P |
| RN-VIC-039 | Si no existe candidato, el ítem quedará pendiente y se escalará al rol definido; no se elegirá manualmente desde el formulario del RJV. | C |

### 5.4 Plazos, urgencias y ampliaciones

| ID | Regla | Estado |
|---|---|---|
| RN-VIC-040 | El plazo estándar no se fijará todavía en 40 días hábiles. La reunión mencionó 30 hábiles o 45 calendario según procedimiento; debe confirmarse el evento de inicio. | P |
| RN-VIC-041 | La anticipación de la audiencia y la fecha requerida se capturarán y generarán alerta cuando el plazo disponible sea insuficiente. | C/D |
| RN-VIC-042 | Una solicitud tardía no se rechazará automáticamente salvo regla aprobada; deberá registrar gestión/aceptación de fecha excepcional. | D/P |
| RN-VIC-043 | Si aparece una nueva víctima antes del punto de corte y el trabajo no ha iniciado, se modificará la solicitud conservando el mismo plazo. | C/P |
| RN-VIC-044 | Si aparece después del punto de corte o tras una entrega, se creará una ampliación vinculada, con nuevo plazo completo. | C |
| RN-VIC-045 | La ampliación por nueva víctima se asignará al mismo perito por continuidad técnica y conocimiento del núcleo familiar. | C |
| RN-VIC-046 | El punto de corte exacto será un estado objetivo —propuesto: `EN_EJECUCION`— y debe aprobarse. | P/D |
| RN-VIC-047 | No existe límite normativo de ampliaciones confirmado. El valor cinco del diccionario es un horizonte técnico, no una regla aprobada. | C/P |
| RN-VIC-048 | Si se adopta un límite operativo, será parámetro con ruta de excepción y no impedirá atender una víctima legítima. | D |
| RN-VIC-049 | El perito podrá solicitar ampliación de término por imposibilidad justificada; actor aprobador, número de días y evidencia deben confirmarse. | C/P |

### 5.5 Entrega, improcedencia y actualización

| ID | Regla | Estado |
|---|---|---|
| RN-VIC-050 | El resultado se entregará mediante el formato F-171 o el formato oficial que lo reemplace. | C |
| RN-VIC-051 | El perito no podrá finalizar sin anexar la versión del informe requerida. | C |
| RN-VIC-052 | La finalización del perito no requerirá aprobación ordinaria del PAG; el RJV podrá consultar y descargar el informe. | C |
| RN-VIC-053 | Si el RJV solicita un ajuste, deberá quedar la observación y una nueva versión del informe; el área debe definir si existe una transición formal de devolución. | C/P |
| RN-VIC-054 | Cuando la actividad no proceda, el perito registrará improcedencia, causal y constancia; el RJV será notificado. | C |
| RN-VIC-055 | Las causales de improcedencia se parametrizarán y permitirán detalle técnico. | D |
| RN-VIC-056 | Una actualización de cifras años después no sobrescribirá el F-171 anterior; creará una nueva versión con fecha, motivo e índice/base usados. | C/D |
| RN-VIC-057 | El RJV verá cuál versión está vigente y podrá consultar versiones anteriores según permisos. | C/D |
| RN-VIC-058 | Una actualización que implique nueva valoración o nueva víctima se tratará como ampliación/nuevo ítem, no como simple cambio de archivo. | D/P |

### 5.6 Brigadas y acopio documental

| ID | Regla | Estado |
|---|---|---|
| RN-VIC-060 | La atención verbal o acopio resuelto en brigada no recorrerá artificialmente el flujo de solicitud pericial. | C |
| RN-VIC-061 | Las estadísticas de brigadas se incorporarán por un canal diferenciado `BRIGADA`, mediante plantilla mensual validada. | C/D |
| RN-VIC-062 | La importación validará estructura, duplicados, regional, fecha, persona y tipo de atención antes de confirmar. | D |
| RN-VIC-063 | El F-170 conservará la evidencia de asistencia/acopio según el procedimiento; el sistema almacenará la referencia que corresponda. | C |
| RN-VIC-064 | Los formatos F-173/F-174 estadísticos no se convertirán automáticamente en solicitudes; se usarán para consolidación/reportes si el área confirma el mapeo. | C/P |

## 6. Máquinas de estados propuestas

### 6.1 Investigación

`BORRADOR → RADICADA → EN_REVISION → APROBADA_REPARTO → ASIGNADA → EN_EJECUCION → INFORME_ENTREGADO → PENDIENTE_APROBACION_PAG → COMPLETADA → CERRADA`

Ramas:

- `EN_REVISION → DEVUELTA → RADICADA`.
- `APROBADA_REPARTO → PENDIENTE_REASIGNACION → ASIGNADA`.
- `EN_EJECUCION → SOLICITUD_AMPLIACION → AMPLIACION_APROBADA/RECHAZADA`.
- Cualquier estado permitido → `ANULADA`, con autorización y motivo.

### 6.2 Víctimas

`BORRADOR → RADICADA → PENDIENTE_APROBACION_PAG → APROBADA_REPARTO → ASIGNADA → EN_EJECUCION → COMPLETADA → CERRADA`

Ramas:

- `PENDIENTE_APROBACION_PAG → DEVUELTA → RADICADA`.
- `APROBADA_REPARTO → PENDIENTE_REASIGNACION → ASIGNADA`.
- `ASIGNADA/EN_EJECUCION → IMPROCEDENTE` con constancia.
- `COMPLETADA → AMPLIACION` como nuevo ítem hijo al mismo perito.
- `COMPLETADA → ACTUALIZACION_INFORME → COMPLETADA` con nueva versión.

Los nombres finales deben alinearse con catálogos institucionales; lo esencial es que las transiciones sean diferentes por área.

## 7. Eventos mínimos de notificación

- Solicitud radicada.
- Solicitud devuelta.
- Solicitud aprobada/rechazada para reparto.
- Ítem asignado o reasignado.
- No existe candidato.
- Próximo vencimiento y vencimiento.
- Problema reportado.
- Ampliación solicitada, aprobada o rechazada.
- Informe entregado.
- Informe devuelto o actualizado.
- Improcedencia.
- Cierre/anulación.

Destinatarios y contenido se parametrizarán por evento y área.

## 8. Controles de calidad de datos

1. Identificadores con formato y unicidad.
2. Catálogos vigentes para fecha del evento.
3. Fechas coherentes: audiencia, asignación, plazo, novedad y entrega.
4. Personas sin duplicados evidentes; coincidencia asistida, no fusión automática.
5. Coberturas sin solapamientos ambiguos o con prioridad explícita.
6. Un funcionario no elegible nunca aparecerá como candidato automático.
7. Una transición inválida deberá devolver error de negocio, no cambiar parcialmente los datos.
8. Toda exportación deberá indicar filtros, fecha de corte y zona horaria.

## 9. Conflictos que requieren acta de decisión

| Tema | Fuentes en conflicto | Decisión requerida |
|---|---|---|
| Capacidad de Investigación | Regla previa: sin límite general; HU-22/HTML/diccionario: menor a 6. | Valor inicial, estados que cuentan y alcance por persona/especialidad. |
| Semáforo | Regla previa: 7/4/3; HU-30/diccionario/HTML: 15/6/5. | Umbrales por área y tipo de día. |
| Plazos de Investigación | HU-07: 25/45 hábiles; reglas anteriores: 25/45 calendario. | Plazos oficiales por especialidad y tipo de día. |
| Plazo de Víctimas | HU-08/HTML: 40 hábiles; reunión: 30 hábiles o 45 calendario. | Plazo oficial y evento inicial. |
| Anticipación de audiencia | HU-14/HTML: 45 hábiles obligatorios; reunión: práctica cercana a 30 y frecuentes excepciones. | Regla de validación o solo alerta. |
| Ampliaciones de Víctimas | Reunión: sin límite; diccionario: máximo técnico 5. | Sin límite, límite con excepción o alerta. |
| Cobertura Atlántico | Respuesta escrita: departamento; Excel: región Caribe. | Matriz oficial firmada y vigencia. |
| Grado en Investigación | Diccionario: mapeo por competencia; HTML: mínimo y solo campo. | Exacto/mínimo y servicios afectados. |
| Multi-peritaje en Víctimas | Reunión menciona financiera y psicológica; HTML obliga una. | Uno o varios ítems por solicitud. |
| Devolución de informe de Víctimas | Preferencia por comunicación directa; necesidad de trazabilidad de versiones. | Flujo formal mínimo. |
| Roles de Víctimas | Prototipo heredó roles de Investigación; área indicó estructura distinta. | Matriz RACI definitiva. |
| Número de regionales | HU-10: 15; diccionario posterior: 34. | Catálogo institucional oficial y fuente maestra. |
| Validación previa | HU-17 asigna aprobación/devolución al Administrador Regional para ambas áreas; HU-24 y reunión de Víctimas la ubican en PAG/supervisor. | RACI y secuencia exacta por área. |
| Override manual | HU-26 permite ignorar regional y grado; reglas de elegibilidad requieren control de excepciones. | Restricciones no omitibles, autorizador y evidencia. |

## 10. Contrato implementado en el cierre pre-Oracle

El incremento `feat/cierre-funcional-pre-oracle` materializa, sin convertir pendientes en reglas aprobadas:

- autorización de servidor por capacidad, área, titularidad/asignación y vigencia;
- siete perfiles activos y perfiles adicionales propuestos pero deshabilitados;
- servicios separados de especialidades o disciplinas, con versión, vigencia e historial;
- uno o varios ítems por solicitud, con estado y reparto independientes;
- actuaciones auditables sin porcentaje subjetivo;
- estado, días restantes, semáforo y oportunidad como conceptos distintos;
- reporte de problema persistido sin alterar el estado principal;
- ampliación, prórroga, reasignación, transferencia, novedad y excepción bloqueadas mediante códigos de decisión.

El detalle contractual y la evidencia esperada están en `17_CONTRATO_FUNCIONAL_PRE_ORACLE.md`; las decisiones abiertas se centralizan en `docs/decisions/README.md`.
