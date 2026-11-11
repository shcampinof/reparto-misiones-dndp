# Validación documental y requisitos de Víctimas

Fecha: 8 de octubre de 2026. Alcance: módulo de Víctimas de SIGIP-DP y publicación de la demo existente en Hugging Face. Solicitud del usuario: máximo 35 minutos. Investigación conserva sus reglas, datos de prueba y recorridos.

Actualización posterior: el guion de presentación está en `24_GUION_DEMOSTRACION_VICTIMAS_10_A_15_MINUTOS.md` y los ajustes de alta consecutiva, selección documental y descarga F171 están en `25_AJUSTES_PRESENTACION_VICTIMAS_2026_10_08.md`. La publicación descrita al final de este reporte corresponde a la primera entrega; la versión más reciente se documenta en el informe 25.

## Resultado principal

El procedimiento aportado respalda el aval del PAG **antes** del reparto, la asignación con cargas equilibradas y la entrega del F171 por el perito al representante judicial. No contiene una aprobación ordinaria del PAG después de entregar el informe. La respuesta escrita confirma expresamente la improcedencia por el perito, la reserva del contenido del F171 frente al PAG y la ausencia de un máximo fijo de carga.

El instructivo **sí establece 40 días hábiles** para los informes psicológico y financiero (§3.2.4). Esto corrige la ausencia de respaldo documental que señalaba el análisis anterior. Sin embargo, es una copia de 2019 y contiene otros términos para acopio y audiencia. La reunión describe cifras diferentes: todavía se necesita confirmar la versión vigente, el supuesto aplicable y el calendario antes de activar vencimientos.

Se integraron en la demo: captura complementaria F163/F168/F169; tipos documentales y ocho leyes/programas de la respuesta; guía y metadatos F171 por disciplina; reserva del informe en API y pantalla; improcedencia motivada e idempotente con constancia disponible para el RJV. No se publicaron documentos fuente ni el directorio real de profesionales.

## Fuentes revisadas

Se extrajo el contenido de los once archivos de `Documentos Fuente/Victimas`. DOCX y PDF: texto de párrafos/tablas y páginas. XLSX: hojas y celdas no vacías. DOC y XLS antiguos: lectura con Word/Excel en segundo plano, sin habilitar macros y en modo de solo lectura. El inventario local conserva huellas SHA-256. Los archivos originales no se modificaron.

| Fuente | Qué aporta | Localizador útil |
|---|---|---|
| `DEFENSORIA DEL PUEBLO.docx` | Documento con respuestas del área; separarlas de las preguntas y propuestas que conserva el mismo archivo. | A.2 leyes; A.3 cobertura; A.5 datos de víctimas; A.6 carga; C.3 vacaciones; C.4 improcedencia; C.6 reserva. |
| `Solicitud_Informacion_Victimas.docx` | Cuestionario de levantamiento y propuestas por confirmar. No es aprobación de todas sus afirmaciones. | Secciones A–D. |
| `PROCEDIMIENTO Prestación servicio de Apoyo Pericial a los programas de Representación Judicial de Victimas (2).pdf` | SD-P06, versión 1, vigente desde 12/04/2019; 12 páginas. Advierte que la copia descargada no es controlada. | Actividades 1–16, páginas 5–11; documentos relacionados, páginas 11–12. |
| `SD-P06-I14 Parámetros prestación servicio de actividades periciales áreas Psicológica y Financiera a víctimas (3).docx` | Instructivo v1, cambio inicial 20/02/2019. Solicitud, reparto, recepción, subsanación, informes, jornadas, audiencias y estadísticas. | §§2.1, 3.1, 3.2.1–3.2.5 y 4.1. |
| `SD-P06-F163 Solicitud de Actividades Periciales Forenses… (2).doc` | Campos del caso, víctima, familia, pretensiones, audiencia, sentencia, labores requeridas, anexos y visto bueno del PAG. | Cabecera, tabla de víctimas, lista documental y firmas. |
| `SD-P06-F164 Reparto y Entrega de Actividades Periciales Forenses (1).xls` | Control por radicado interno/actividad, área, perito, ley, delito, RJV, regional, víctima, procesado, fechas, devolución, justificación y firma. | Hoja PERITOS, cabeceras filas 5–6. V1, 12/04/2019. |
| `SD-P06-F168 Liquidaciones Materiales de Daños y Perjuicios.xlsx` | Desplazamiento, hurto y secuestro; número de hecho, víctima, fecha, días, daño emergente y bases/resultados de liquidación. | Hoja1, fila 4 e instrucciones 27–33. V1, 12/04/2019. |
| `SD-P06-F169 Liquidación de daño material…homicidio y desaparicion forzada.xls` | Víctima directa/indirectas, parentesco, nacimientos, fecha del hecho, ingreso, daño emergente, actualización y lucro cesante. | Hoja2, filas 4–5 e instrucciones 27–36. V1, 12/04/2019. |
| `SD-P06-F170 Atencion Pericial - Jornadas de acopio documental.xlsx` | Jornada, lugar, fechas, postulado/bloque/frente, perito, instrumento, persona atendida, firmas y entrega de formatos. | Hoja1, filas 6–12 y 34–42. V1, 12/04/2019. |
| `SD-P06-F171 Informe de Actividades Periciales Forenses…Víctimas.doc` | Informe común con desarrollo técnico diferente para psicología y financiera. | Cabecera y apartados de cada disciplina. |
| `Libro1.xlsx` | Directorio de 12 peritos, disciplina, sede, leyes y cobertura. Contiene datos personales reales y una segunda hoja de ejemplo. | Hoja1, columnas B y E–J, filas 2–13. No importar Hoja2 como directorio validado. |

Las abreviaciones de nombres en la tabla corresponden a los archivos de esa carpeta; el inventario local registra sus nombres completos. Las respuestas no identifican de manera inequívoca fecha de aprobación y vigencia de cada definición. Se usan como evidencia funcional aportada, sin certificar actualización del SGC.

## Procedimiento que debe representar la solución

1. El RJV identifica proceso, víctimas, pretensiones y labor requerida; diligencia F163 y aporta los documentos aplicables. SD-P06, actividad 1; I14 §3.2.1.
2. El PAG emite visto bueno previo. La remisión y recepción central son funciones diferentes del aval de origen; no crear un PAG central universal por analogía con Investigación.
3. Coordinación o delegado territorial registra radicado interno y actividad y realiza reparto equilibrado, con explicación de elegibilidad y carga. F164 y SD-P06, actividad 4; I14 §§3.2.2 y 4.1.1.
4. El perito recibe, verifica requisitos y comunica su asignación al RJV/PAG. Si faltan datos, solicita subsanación y, si no se subsana, devuelve mediante constancia justificada. SD-P06, actividades 5–6; I14 §3.2.3. El mecanismo posterior al reparto requiere completar su contrato en la aplicación.
5. El perito ejecuta las actividades, conserva evidencia de entrevistas/consentimiento y documentos examinados. El RJV es responsable de localizar a la víctima y de la carga probatoria. F163 e I14 §2.1.4.
6. Entrega F171 al RJV mediante comunicación oficial; actualiza el control F164 y descarga la actividad de la carga del perito. SD-P06, actividades 8–9. El cierre ordinario no añade una revisión final PAG.
7. Si el encargo no procede, el perito registra estado IMPROCEDENTE, causal y constancia y el RJV es notificado. Respuesta escrita C.4. Esta rama ya está habilitada en la demo; correo institucional aún requiere integración.
8. Si procede, hay sustentación en audiencia. Estadísticas F173/F174 y control de gestión se llevan aparte de la transacción de reparto. SD-P06, actividades 10–16.

## Necesidades y requisitos funcionales

Clasificación: **C** = regla ya confirmada en el paquete o respuesta explícita aportada; **B** = línea base documental cuya vigencia se debe cotejar; **D** = diseño de la solución/demo; **P** = decisión no resuelta. Una fuente histórica no convierte automáticamente una cifra en parámetro vigente.

| ID | Necesidad o requisito | Estado y respaldo | Integración actual / trabajo restante |
|---|---|---|---|
| VIC-DOC-01 | Aval antes de repartir; entrega directa al RJV. | C/B: RN-VIC-001/020/052; I14 §3.2.1; SD-P06 act. 8. | Ya existente y conservado. No se añade aprobación final PAG. |
| VIC-DOC-02 | Registrar autoridad judicial, procesado/postulado, pretensiones, lugar de audiencia y fecha de sentencia. | B/D: F163. | Integrado en alta, corrección, historial y consulta. Campos adicionales opcionales; obligatoriedad pendiente del área. |
| VIC-DOC-03 | Capturar identidad, nacimiento, hecho/fecha/lugar, núcleo, parentesco y ubicación actual por persona. | B/D: F163, F169; respuesta A.5. | Integrado. Valida fechas reales y nacimiento anterior al hecho; no transforma documentos de identidad en números. |
| VIC-DOC-04 | Capturar ingreso **a la fecha del hecho**, soporte, daño emergente documentado y días de desplazamiento. | C/B/D: respuesta A.5; F168/F169. | Integrado como bases financieras opcionales. Cero se conserva; valores negativos e intervalos fraccionarios de días se rechazan. No se exige ingreso para psicología. |
| VIC-DOC-05 | Evitar exigir contacto propio a una víctima directa fallecida/desaparecida. | D: caso permitido por F169 y responsabilidad de localización en F163. | Integrado: admite ausencia motivada de contacto directo si existe persona localizable en el mismo núcleo. No presume fallecimiento ni fusiona personas automáticamente. |
| VIC-DOC-06 | Catálogo de documentos por finalidad y disciplina. | B/D: F163 y SD-P06 act. 7. | Integrados F163, sentencia, historia clínica, entrevista colateral, certificado terapéutico, soporte financiero, F168/F169, F167 y F172. Se registran referencias; no se implementa aún carga/versionado completo de anexos de solicitud. |
| VIC-DOC-07 | F168/F169 solo en la ruta de Ley 975 indicada por el área; conservar formatos oficiales. | C/B: respuesta A.4; I14 §2.1.3. | Validación de ley en servidor. F163 satisface el requisito de formulario existente. No se recrearon ni modificaron fórmulas financieras. |
| VIC-DOC-08 | Habilitar las leyes/programas del directorio, con restricción de quien solo atiende Ley 975. | C/D: respuesta A.2 y Libro1 Hoja1 H/J. | Catálogo con Leyes 975, 1098, 1257, 1448, 1719, 1761, 1773 y 985. Elegibilidad en servidor. Profesionales ficticios generales cubren estas leyes; se conserva el candidato restringido a 975. Ley 906 se menciona en la narrativa, pero el cuadro entregado no la lista de igual forma: su relación con programas debe validarse. |
| VIC-DOC-09 | Repartir con carga equilibrada, sin máximo fijo de seis. | C: respuesta A.6; I14 §§3.2.2/4.1.1. | Ya existente y conservado. Estados contables, ponderación de jornadas, rotación y desplazamientos siguen requiriendo política aprobada. |
| VIC-DOC-10 | Reservar el F171 al RJV titular y al perito asignado; PAG solo ve metadatos. | C/D: respuesta C.6; mínimo privilegio AGENTS. | Integrado en API y pantalla: PAG/administración no reciben referencia, enlace, nombre, archivo ni metadatos técnicos del contenido. Descarga responde 403. Acceso del administrador regional se respondió “NO ENTENDEMOS”; se aplica denegación conservadora hasta definirlo. |
| VIC-DOC-11 | Identificar número de informe, autor, asignación, entrega, programa, proceso, RJV y personas; distinguir disciplina. | B/D: cabecera F171. | Número y fecha de valoración capturables; entrega/autor registrados por servidor; contexto de encargo existente. Guía por disciplina del perito asignado. Se carga el informe elaborado por el profesional; no se genera un F171 oficial completo ni se valida semánticamente el contenido del PDF. |
| VIC-DOC-12 | Declarar improcedencia por el perito asignado con causal, constancia y soporte. | C/D: respuesta C.4; RN-VIC-054. | Integrado desde ASIGNADA o EN_EJECUCION; estado terminal propio, auditoría, conservación de otros ítems y reintento idempotente. La selección exacta de estos dos estados es diseño D. Catálogo institucional de causales pendiente. |
| VIC-DOC-13 | Comunicar al RJV improcedencia y entregas; alertar sobre asignación a perito y RJV. | C/P: respuesta C.4; SD-P06 act. 6/8; reunión. | Constancia de improcedencia en bandeja RJV, con destinatario registrado. **No se envían correos reales**: faltan servidor, plantillas y bandeja de salida durable. Entrega/asignación siguen consultables en el aplicativo. |
| VIC-DOC-14 | Radicado de proceso, radicado interno y número de actividad son entidades/identificadores diferentes. | B/D/P: SD-P06 act. 4, F163/F164; invariantes del dominio. | Backlog prioritario: CASO → SOLICITUD → ITEM → ASIGNACION, identificación y política de duplicados. La unicidad externa de la demo sigue siendo una limitación para varias solicitudes por proceso. |
| VIC-DOC-15 | Subsanación después de asignar con comunicación y devolución justificada. | B/P: I14 §3.2.3; SD-P06 act. 5. | Reporte de problema ya existe; falta definir actor de corrección, estados, plazo vigente, nueva versión y reanudación. No se habilitó una edición libre por el perito. |
| VIC-DOC-16 | Ampliaciones por nuevas víctimas y actualizaciones posteriores de cifras/F171. | C/P: reunión; respuestas C.1/C.2 sin completar; sección D “por confirmar”. | Backlog: vínculo al encargo original, mismo perito salvo excepción, documento nuevo y auditoría. Punto de corte, autorizador y plazo permanecen pendientes; no se impone límite de cinco. |
| VIC-DOC-17 | Carga masiva de hechos/víctimas sin convertir cada fila en una solicitud duplicada. | C/D/P: reunión; A.4 pendiente; F168/F169. | Backlog: plantilla, prevalidación por fila, referencias a persona/hecho, duplicados y confirmación. Unidad de agrupación por hecho/familia/solicitud aún no resuelta. |
| VIC-DOC-18 | Cobertura por residencia, disciplina, sede y vigencia, con explicación. | C/B/P: respuesta A.3 vs Libro1 I7/I12. | No se amplía automáticamente cobertura en esta entrega. Finanzas Antioquia es consistente entre fuentes; psicología Atlántico/Caribe es contradictoria. Falta matriz territorial aprobada y municipios normalizados. |
| VIC-DOC-19 | Vacaciones impiden nuevos repartos, conservando encargos previos. | C/P: respuesta C.3; RN-VIC-033. | Disponibilidad de candidatos ya existe. Registro de novedad, actor, vigencia y efecto temporal pendiente; no se reasignan casos activos automáticamente. |
| VIC-DOC-20 | Acopio, valoración y entrega son resultados diferentes; registrar jornada y evidencia F170. | B/C/P: I14 §2.1; F170; reunión. | Backlog separado del reparto ordinario: autorización, fechas, lugar, participantes, instrumentos y firmas; vínculo al encargo posterior pendiente sin declarar todo acopio cerrado. |
| VIC-DOC-21 | Estadísticas mensuales y control F164/F173/F174 sin duplicar encargos. | B/P: SD-P06 act. 9/11–16; I14 §§3.1/4.1.4. | Backlog: registro de fechas de asignación/valoración/entrega/audiencia/devolución, exportación F164, consolidación mensual por canal, disciplina y sede. F173/F174 no fueron aportados. |
| VIC-DOC-22 | Asistencia a audiencia como actividad ligada al informe previo. | B/P: I14 §3.2.5; SD-P06 act. 10. | Servicio demostrativo existente; falta encargo original, citación, comisión, constancia e informe de participación. No exigir siempre un nuevo dictamen F171 para una mera asistencia. |
| VIC-DOC-23 | Versionado, reserva, auditoría y persistencia institucional. | C/D/P: AGENTS; F171; respuesta C.6. | Versionado PDF/entrega y controles de API existentes reforzados. Oracle, archivo institucional, SSO, antimalware, auditoría durable y correo quedan fuera de esta demo y son necesarios antes de piloto. |

## Estructura del F171 que debe conservarse

La cabecera identifica asignación, entrega, perito, número de informe, programa, radicado, procesado, usuario, delitos, RJV y regional. Ambos informes tienen motivo, resumen/descripción de hechos, metodología, documentos recibidos, actividades, conclusiones, referencias y firma/tarjeta profesional.

**Psicología:** aproximación psicobiográfica y datos de la persona evaluada; historia personal/familiar, académica/laboral, social, física/mental, apoyos y expectativa del proceso; cambios posteriores al hecho, examen mental, interpretación, discusión forense y recomendaciones. Fecha de valoración, sesiones, duración e informantes pertenecen al contenido técnico reservado. No trasladarlos indiscriminadamente a dashboards de supervisión.

**Financiera:** desarrollo, instrumentos y fórmulas de daño emergente, lucro cesante, IPC/intereses, salario devengado y renta depurada; resultados/análisis y conclusiones. Las columnas de actualización y resultados de F168/F169 son de uso del perito financiero. El sistema no debe atribuirle al RJV cálculos ni conclusiones del perito.

La integración realizada orienta y registra la entrega del archivo, conserva su versión y restringe el acceso. No convierte una referencia demostrativa en una firma institucional ni verifica automáticamente que un PDF contiene todas las secciones. Para operación institucional debe exigirse archivo/enlace controlado, definir firma y establecer una política de comprobación del producto.

## Plazos encontrados y decisiones que faltan

| Fuente/localizador | Referencia encontrada | Interpretación y tratamiento |
|---|---|---|
| I14 §3.2.1 | Solicitud con mínimo 45 días hábiles antes de la fecha esperada de pericia. | B, sujeto a vigencia y excepciones. No es automáticamente un bloqueo de radicación. |
| I14 §3.2.2 | Asignación: 3 días hábiles. | B, requiere definir inicio, calendario y vigencia. |
| I14 §3.2.3 | Complementación: 5 días; fecha de solicitud cuando se radica completa. | B. No especifica aquí tipo de día para esos cinco; no inferirlo. |
| I14 §3.2.4 | Informes psicológico y financiero: 40 días hábiles, incluyendo actividades. | B/P frente a reunión y vigencia SGC. |
| I14 §2.1.3/2.1.4 | Acopio: información 30 días antes de audiencia; solicitud de liquidación posterior dentro de 8 días; entrega no mayor a un mes; solicitud 45 días hábiles antes de audiencia. | Supuestos diferentes y tensión interna. No unificar en una sola constante. |
| I14 §3.2.5 | Citación de audiencia con 45 días de anticipación. | Tipo de día no definido en ese pasaje. |
| I14 §3.1/4.1.4 | Reporte de peritos primeros 5 días del mes; consolidación regional primeros 7 días hábiles. | Estadísticas, no vencimiento de un dictamen. |
| Reunión y cuestionarios C.7 | 30 hábiles/45 calendario desde entrevista y tiempos administrativos aproximados. | C.7 sigue sin respuesta definitiva; contraste requerido con instructivo vigente. |

Otros pendientes explícitos: quién transfiere la titularidad entre RJV y qué historial recibe; quién corrige después de asignación; relación de coordinación central/PAG de origen; urgencias; punto de corte modificación/ampliación; acceso extraordinario a informes; catálogo completo de hechos y anexos por ley; combinación de pericias. La sección D del documento con respuestas conserva “por confirmar”, por lo que no se asumieron todas sus propuestas como aprobadas.

## Cambios técnicos y comprobación

Los cambios de este incremento están en `backend/src/modules/victimas/format-fields.js`; ramas exclusivas de Víctimas de `backend/src/modules/demo/service.js`; capacidad de improcedencia del perfil perito y contrato exclusivo de Víctimas; catálogos/semillas ficticias de Víctimas; componentes `VictimsFormatFields.jsx` y `victims-form-values.js`; ramas de Víctimas de `PortalPage.jsx`; pruebas API/navegador y documentación. `.gitignore` excluye la extracción local. Los archivos compartidos conservan los comportamientos de Investigación.

**Migraciones creadas:** ninguna. La demo sigue usando almacenamiento en memoria y se reinicia con el Space. No se presenta este incremento como persistencia institucional ni como piloto listo para producción.

**Pruebas finales:** 45/45 pruebas de backend y 17/17 recorridos Playwright aprobados, incluidos escritorio/móvil, corrección y cierre de Investigación. ESLint sin errores ni advertencias en ambos proyectos; formato de archivos modificados correcto; compilación Vite y `git diff --check` correctos. Se añadieron pruebas de campos F163 y conservación de versiones, fechas/importes inválidos, contacto familiar, reserva F171 y descarga denegada, improcedencia válida/inválida, permisos/alcance/vigencia, reintento idempotente, independencia de ítems, leyes y anexos.

**Publicación completada:** Space [shcampinof/reparto-misiones-dndp](https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp), aplicación [SIGIP-DP](https://shcampinof-reparto-misiones-dndp.hf.space). Commit remoto activo verificado: `5d445c3025c13de699bfe64bfe474bc70c0a6792`; estado RUNNING confirmado para ese SHA. El paquete contiene 59 archivos de aplicación/construcción, cero documentos fuente y cero identificadores del directorio real comprobados contra Libro1. El reporte queda local.

**Comprobación remota:** salud, ruta del portal, campos F163, elegibilidad Ley 1719, cierre directo F171, descarga permitida al RJV y denegada a PAG/administrador, proyección de metadatos, improcedencia motivada y reintentos idempotentes: correctos. Se dejaron dos solicitudes ficticias de verificación, `SVP-2026-0004` (cerrada con PDF ficticio) y `SVP-2026-0005` (improcedente con constancia ficticia). La huella de las solicitudes de Investigación antes y después coincide. No se restablecieron datos remotos de Investigación.

La entrega se completó dentro del máximo de 35 minutos solicitado, contado desde 14:13 de Bogotá. No se implementaron todos los elementos del backlog de esta tabla: se integraron los cambios identificados como realizados y se dejaron explícitas las decisiones y dependencias necesarias para los demás.

**Configuración institucional pendiente:** confirmar SGC y decisiones abiertas; suministrar matriz territorial; configurar SSO/Oracle/almacenamiento y análisis de archivos; definir firma, plantillas y servidor de correo; implementar bandeja de salida transaccional y migraciones. El Space mantiene la configuración de demo y su secreto JWT existente.
