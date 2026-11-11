# SIGIP-DP — Revisión integral de lógica de negocio previa a Oracle

**Nombre institucional:** SIGIP-DP — Gestión investigativa y pericial de la Defensoría del Pueblo  
**Fecha de corte:** 9 de septiembre de 2026  
**Código revisado:** `main@97927fc` del repositorio canónico `https://github.com/shcampinof/reparto-misiones-dndp`  
**Despliegue de presentación:** `https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp`  
**Propósito:** cerrar el contrato funcional antes de ejecutar el mapeo e implementación Oracle.  
**Estado:** propuesta consolidada para validación funcional; distingue reglas confirmadas, capacidades necesarias y decisiones todavía pendientes.

---

## 1. Conclusión ejecutiva

El sistema posterior al PROMPT 1 ya demuestra correctamente la separación esencial entre Investigación y Víctimas, pero todavía **no contiene la lógica de negocio completa**. No conviene ejecutar aún el PROMPT 2 de Oracle como implementación definitiva: el modelo actual sigue siendo una solicitud con un solo ítem, utiliza catálogos mínimos en código, no cubre varios ciclos operativos y representa sólo siete perfiles simplificados.

La corrección no consiste en activar indiscriminadamente `PAG Central`, `Administrador Regional` y `Defensor Regional`, ni en trasladar todas sus tareas al PAG. Las fuentes prueban que detrás de esos nombres existen necesidades diferentes:

1. supervisión técnica y aprobación;
2. control operativo de solicitudes, errores, novedades y cambios;
3. resolución excepcional del reparto;
4. consulta y seguimiento territorial;
5. administración técnica;
6. gobierno funcional de catálogos.

Algunas de estas funciones pueden recaer en la misma persona, pero no son el mismo permiso. SIGIP-DP debe modelarlas como **capacidades con alcance y vigencia**, y luego agruparlas en perfiles institucionales aprobados. Esto conserva la razón original de separar roles y evita crear perfiles artificiales para todas las regionales.

También se debe recuperar y ampliar el **Catálogo de Servicios** del HTML. No es equivalente al catálogo de especialidades ni a la administración de datos maestros: el primero orienta al solicitante sobre qué puede pedir; el segundo gobierna los datos y reglas con los que opera el sistema.

Se recomienda una fase corta denominada **Cierre funcional pre-Oracle**. Su salida no tiene que resolver por intuición todos los asuntos institucionales: debe completar el mapa, implementar únicamente reglas confirmadas y dejar cada decisión pendiente identificada, parametrizable y bloqueada para uso productivo.

---

## 2. Fuentes y criterio de precedencia

### 2.1 Fuentes revisadas

| Fuente | Fecha del contenido | Uso en esta revisión |
|---|---:|---|
| HU-01 a HU-32 del paquete “Reparto misiones de trabajo investigadores” | 13-jul-2026 | Cobertura funcional inicial; campos de aprobación sin diligenciar. |
| Documento BPMN y levantamientos de Investigación | anterior o contemporáneo a las HU | Detalle de portafolio, turnos, cobertura, excepciones y actores operativos. |
| `Mesa_Atencion_Investigativa.html` | anterior a las reuniones | Referencia de navegación, roles y Catálogo de Servicios; no fuente definitiva de reglas. |
| Socialización de Investigación | 14-jul-2026 | Aclaraciones posteriores a las HU sobre roles, ampliaciones, documentos, plazos y catálogos. |
| Reparto y asignación de peritos | 23-jul-2026 | Fuente principal del flujo pericial de Víctimas y sus diferencias frente a Investigación. |
| Presentación de flujos de Víctimas en IRIS | 12-ago-2026 | Contexto de representación judicial; no debe copiarse como flujo de reparto pericial. |
| Diccionario y explicación del modelo de datos | posterior al levantamiento inicial | Vocabulario y relaciones útiles; contiene cantidades y límites contradictorios. |
| Código y documentación `main@97927fc` | corte 9-sep-2026 | Estado funcional real posterior al PROMPT 1. |

### 2.2 Regla de precedencia

El orden correcto es: norma o procedimiento vigente aprobado → decisión funcional aprobada y trazable → HU aceptada → acta o grabación posterior que aclare la HU → levantamiento → prototipo/HTML → código actual.

La fecha de creación ayuda a reconstruir la evolución, pero **no convierte una fuente en aprobada**. Las fechas internas de los documentos son más confiables que la fecha de extracción del ZIP. Cuando una reunión posterior discute una regla sin cerrarla, la regla queda pendiente, no aprobada por ser más reciente.

### 2.3 Etiquetas utilizadas

| Etiqueta | Significado |
|---|---|
| **C — Confirmada** | Existe evidencia suficiente y coherente para incorporarla. |
| **P — Parametrizable** | La capacidad es necesaria, pero su valor, alcance o vigencia no debe quedar fijo. |
| **D — Por decidir** | Existe la necesidad, pero falta actor, regla o aprobación. |
| **X — Contradicción** | Hay fuentes incompatibles; requiere decisión registrada. |

---

## 3. Estado real después del PROMPT 1

### 3.1 Lo que ya funciona

- Flujos separados por área.
- Investigación: radicación, reparto básico, ejecución, entrega, devolución/aprobación PAG y cierre.
- Víctimas: radicación, aprobación/devolución previa PAG, corrección versionada, reparto, ejecución y cierre ordinario con F-171 sin aprobación final PAG.
- Explicación básica del reparto y cola `PENDIENTE_REASIGNACION` cuando no hay candidato.
- Restricción del Administrador del Sistema para que no tome decisiones operativas.
- Registro básico de línea de tiempo y versiones en el retorno de Víctimas.
- Siete perfiles habilitados: Administrador, Defensor, Investigador, PAG Investigación, RJV, PAG Víctimas y Perito.

### 3.2 Lo que todavía es sólo una aproximación

- Servicios, regionales, leyes y parámetros son listas mínimas incorporadas en código.
- La solicitud materializa un único ítem y una única asignación.
- El reparto usa filtros simples y ordena principalmente por carga y última asignación; no implementa todavía el turno institucional completo ni todas las excepciones.
- Investigación deja que el defensor dispare el reparto; falta confirmar el evento operativo autorizado.
- Los plazos de 20 y 30 días y las estrategias `*_DEMO_V1` son internos y no representan parámetros institucionales aprobados.
- Los porcentajes de progreso no tienen actividades objetivas que los sustenten.
- No existen gestión de novedades, reasignaciones, transferencias, ampliaciones, improcedencia, carga masiva, administración de catálogos, reportes completos, identidad real ni documentos integrados.

### 3.3 Cobertura de las 32 HU

| HU | Cobertura actual | Ajuste requerido antes o después de Oracle |
|---|---|---|
| 01–03 | No implementadas institucionalmente | AD/SSO, recuperación institucional y expiración de sesión. |
| 04 | Parcial | Cambio sólo entre contextos realmente autorizados. |
| 05 | Parcial | Sustituir lista rígida de roles por perfiles + capacidades + alcance. |
| 06 | Parcial | Vigencias, suplencias, competencia y alcance; no imponer grado. |
| 07–10 | No implementadas | Catálogo de Servicios y maestros versionados; regionales sin cantidad fija. |
| 11–12 | Parcial | Multiítem, validaciones, adjuntos, estados y filtros completos. |
| 13 | No implementada | Ampliación como solicitud hija, no reapertura destructiva. |
| 14–15 | Parcial | Personas, parentescos, núcleos, multiítem, ley/programa y carga masiva. |
| 16 | No implementada | Ampliación pericial con nueva vigencia y trazabilidad. |
| 17 | No implementada | Capacidad de revisión/triage; actor distinto por área pendiente. |
| 18–19 | Parcial en Víctimas | Causales, responsable operativo e historial general de correcciones. |
| 20–21 | No implementadas | Novedades, reasignación y transferencia como procesos distintos. |
| 22–23 | Parciales | Motor versionado, turno, cobertura, concurrencia y excepciones. |
| 24–25 | Implementadas en el alcance actual | Completar documentos, notificaciones y permisos por alcance. |
| 26 | No implementada | Excepción manual controlada; no omitir restricciones duras. |
| 27–29 | Parciales/funcionales | Completar permisos, documentos, incidentes y estados multiítem. |
| 30–31 | Parciales | Calendarios, fórmulas y semáforos versionados; KPIs por unidad de medida. |
| 32 | No implementada | Reportes con alcance, filtros, exportación y fórmula auditables. |

No existe una HU-33 verificable dentro del paquete aportado. No debe inventarse hasta recibir el archivo correspondiente.

---

## 4. Vocabulario funcional obligatorio

| Concepto | Definición propuesta |
|---|---|
| **Caso** | Contexto jurídico o de representación que puede originar varias solicitudes. |
| **Solicitud** | Radicación realizada por un Defensor o RJV; agrupa datos comunes y uno o más ítems. |
| **Ítem de solicitud** | Servicio investigativo o pericial específico con ciclo, plazo, asignación y producto propios. |
| **Servicio** | Necesidad que el solicitante elige del portafolio institucional. |
| **Especialidad/disciplina** | Clasificación de conocimiento que determina qué ejecutores pueden atender el servicio. |
| **Asignación** | Vinculación versionada de un ítem con un investigador o perito. |
| **Ampliación** | Nueva necesidad relacionada con un producto cerrado; crea ítem/solicitud hija y no borra el cierre original. |
| **Reasignación** | Cambio del ejecutor responsable de un ítem. |
| **Transferencia** | Cambio del Defensor/RJV responsable del caso o solicitud. No es reasignación. |
| **Novedad** | Evento temporal o definitivo que altera disponibilidad o capacidad de recibir trabajo. |
| **Producto** | Informe de investigación, F-171 u otro entregable versionado. |
| **Problema/incidente** | Situación reportada durante el trámite que requiere decisión o corrección sin alterar silenciosamente el original. |
| **Catálogo de Servicios** | Portafolio consultable de qué se ofrece, para qué sirve, qué exige y qué no cubre. |
| **Dato maestro** | Clasificación o parámetro administrado con vigencia, responsable y auditoría. |

Invariante principal: **una solicitud puede tener varios ítems y cada ítem puede tener varias versiones de asignación y producto**. Los estados de la solicitud se calculan a partir de sus ítems; no deben ocultar que unos pueden estar cerrados, devueltos o pendientes mientras otros continúan.

---

## 5. Roles: qué falta y cómo incorporarlo correctamente

### 5.1 Decisión de diseño

Se deben separar tres niveles:

1. **Capacidad:** acción autorizada, por ejemplo `REVISAR_SOLICITUD`, `GESTIONAR_NOVEDAD` o `APROBAR_INFORME`.
2. **Alcance:** área, nivel nacional, regional, unidad, equipo, caso o asignación propia, con vigencia.
3. **Perfil institucional:** conjunto de capacidades asignado a una persona, por ejemplo PAG Investigación o Defensor Regional.

Una cuenta puede tener más de un perfil. El cambio de rol/área sólo cambia a otro contexto previamente asignado; nunca permite escoger libremente un privilegio.

### 5.2 Matriz de capacidades comunes

| Capacidad | Necesidad | Tratamiento |
|---|---|---|
| Solicitar y consultar solicitudes propias | C | Defensor/RJV. |
| Ejecutar y consultar ítems asignados | C | Investigador/Perito. |
| Revisar técnicamente o aprobar | C, diferente por área | PAG o autoridad definida, sin heredarse entre flujos. |
| Triage y corrección operativa | C como función; D en nombre del actor | Debe estar separado del ejecutor y de administración técnica. |
| Resolver reparto excepcional | C como función; D en titular | Permiso restringido, causal y evidencia obligatorias. |
| Gestionar novedades y continuidad | C como función; D en titular/autorizador | Incluye efecto sobre trabajo activo. |
| Consultar y supervisar territorialmente | C; D en perfil final | Sólo lectura y tableros según alcance. |
| Gobernar Catálogo de Servicios y maestros | C; D en responsable de aprobación | Flujo borrador–revisión–publicación. |
| Administrar plataforma e identidades | C | Administrador del Sistema, sin decisiones del caso. |
| Auditar | C | Acceso de sólo lectura, segregado y trazable. |

### 5.3 Investigación

| Perfil/capacidad | Evidencia y necesidad | Recomendación |
|---|---|---|
| **Defensor** | Radica, consulta y solicita ampliación. La reunión de 14-jul restringe su menú a Catálogo, Nueva solicitud y Mis solicitudes. | Mantener. Debe validar vínculo activo con la entidad y, cuando exista fuente, con el proceso. |
| **Investigador/especialista** | Ejecuta, reporta problema y entrega informe. | Mantener. No puede editar la solicitud fuente ni decidir su propia elegibilidad. |
| **PAG Investigación / supervisor técnico** | Recibe el informe y decide aprobación o devolución al final. | Mantener. No asumir automáticamente que también corrige datos, gestiona novedades o administra catálogos. |
| **Gestor operativo regional** | En la socialización recibe problemas, corrige/retorna solicitudes, cambia especialidad, gestiona cambios y puede cerrar casos por causas operativas verificadas. La separación evita que el ejecutor modifique el requerimiento y que el PAG concentre decisiones incompatibles. | **La capacidad es obligatoria.** “Administrador Regional” es nombre provisional hasta validar estructura, suplencia y alcance. |
| **Gestor central de excepciones** | Las HU y el levantamiento lo requieren cuando no existe oferta regional o hay causal excepcional. | **La capacidad es obligatoria.** Confirmar si el perfil será PAG Central, Coordinación GID o servidor designado. |
| **Defensor Regional / supervisor territorial** | La reunión lo describe como consulta de todos los trámites e indicadores de su regional, sin ejecutar el caso. | Incluir capacidad de sólo lectura; habilitar el perfil sólo con RACI aprobada. No exigir su firma para cambiar investigador: la reunión ordenó retirarla. |
| **PAG de unidad operativa / administrativo delegado** | El levantamiento les asigna consulta o soporte operativo. | Representar mediante capacidades y alcance; no crear perfiles duplicados hasta saber si son equivalentes a los anteriores. |
| **Administrador del Sistema** | Identidades, configuración técnica y soporte. | Mantener segregado. No reparte, aprueba, corrige contenido ni publica reglas por sí solo. |
| **Gestor funcional de catálogos** | Se acordó que el área pueda crear/modificar servicios, productos, descripciones, alcance y plazo. | Crear responsabilidad funcional distinta de la administración técnica; puede ser una capacidad delegada a un servidor del grupo. |

**Conclusión para Investigación:** sí faltan funciones que los cuatro perfiles actuales no cubren. No es prudente esconderlas todas dentro de PAG Investigación. Deben incorporarse como capacidades y luego confirmar si originan dos perfiles adicionales —gestor operativo regional y gestor central de excepciones— y un perfil consultivo territorial.

### 5.4 Víctimas

| Perfil/capacidad | Evidencia y necesidad | Recomendación |
|---|---|---|
| **RJV/Defensor solicitante** | Radica, corrige retornos, consulta y recibe el producto. | Mantener. Debe poder recibir transferencia formal del caso con historia. |
| **Autoridad de aval previo** | La solicitud debe ser aprobada o devuelta antes del reparto. La reunión advierte que no todas las regionales tienen “PAG supervisor”; en nivel central puede ser Coordinación. | Mantener la capacidad, pero no fijar el título PAG para todos. Configurar por unidad, área, alcance y vigencia. |
| **Perito** | Ejecuta disciplina financiera o psicológica, reporta problemas/improcedencia y entrega F-171. | Mantener. No modifica datos fuente ni se autoasigna. |
| **Gestor operativo de solicitudes** | Se requiere un tercero para errores, inconsistencias y problemas reportados sin permitir que el perito reescriba la radicación. | Capacidad obligatoria; validar si recae en la autoridad de aval, apoyo administrativo o coordinador. No heredar “Administrador Regional” de Investigación sin decisión. |
| **Gestor de excepción** | Puede ser necesario si ningún candidato satisface disciplina, cobertura, ley/programa o disponibilidad. La matriz de cobertura puede resolver automáticamente gran parte del reparto. | Mantener capacidad restringida; validar si requiere perfil central independiente. |
| **Supervisor consultivo** | Seguimiento de trámites dentro de unidad/regional; acceso al contenido sensible debe limitarse. | Perfil/alcance por decidir. Distinguir metadatos de seguimiento del contenido del informe pericial. |
| **Administrador del Sistema** | Soporte técnico. | Mantener sin facultades operativas. |
| **Gestor funcional de catálogo y cobertura** | Disciplina, servicios, leyes/programas, oferta y cobertura cambian con el tiempo. | Capacidad necesaria con aprobación funcional y versiones. |

**Conclusión para Víctimas:** no se debe copiar la jerarquía de Investigación. La autoridad que avala, el gestor que corrige y el supervisor que consulta pueden coincidir en algunas unidades, pero el sistema debe permitir que sean personas distintas.

### 5.5 Segregaciones obligatorias

- El solicitante no se aprueba a sí mismo cuando exista aval previo.
- El ejecutor no modifica el requerimiento ni las reglas que determinaron su asignación.
- Quien administra infraestructura no adopta decisiones operativas por ese solo perfil.
- Una asignación manual no puede ser autorizada y ejecutada silenciosamente por el mismo actor cuando la política exija doble control.
- La publicación de catálogos debe diferenciar autor y aprobador cuando la entidad así lo determine.
- Todo acceso a informes sensibles de Víctimas se controla por finalidad, caso y alcance, no sólo por nombre de rol.

---

## 6. Flujos completos propuestos

### 6.1 Investigación — flujo principal por ítem

1. El Defensor consulta el Catálogo de Servicios.
2. Crea borrador con datos del caso, persona(s), proceso, hipótesis, urgencia, servicios e insumos.
3. Puede seleccionar varios servicios; se crea un ítem por servicio/especialidad requerida.
4. El sistema valida campos, coherencia básica, adjuntos obligatorios, vigencia del solicitante y duplicados.
5. Si la institución confirma triage previo, el gestor operativo acepta o devuelve; mientras no se confirme, la radicación pasa al reparto sin inventar aprobador.
6. Se determina la prioridad y se calcula el plazo usando la versión aplicable del servicio y calendario.
7. El motor evalúa candidatos por ítem, registra incluidos/excluidos y realiza la asignación automática.
8. Si no hay candidato, el ítem pasa a `PENDIENTE_EXCEPCION`; no se asigna saltando filtros.
9. El investigador recibe, consulta soportes e inicia ejecución. Debe definirse si existe aceptación/rechazo formal inicial.
10. Registra hitos u observaciones; el porcentaje sólo será objetivo si existen actividades medibles. La UI debe mostrar por separado estado, días restantes y oportunidad.
11. Reporta problemas, conflicto, insuficiencia, especialidad incorrecta o imposibilidad. El incidente sigue un subflujo auditable.
12. Puede solicitar prórroga durante ejecución si la política la permite; autorización, causal y nuevo vencimiento quedan versionados.
13. Entrega un informe versionado.
14. PAG Investigación aprueba o devuelve con observación. Una devolución crea nueva versión sin sobrescribir el informe anterior.
15. La aprobación cierra el ítem. La solicitud se cierra cuando todos sus ítems terminales cumplen la regla de agregación.
16. Una ampliación posterior crea un ítem hijo vinculado. La reunión respalda continuidad con el mismo investigador cuando corresponda, pero debe reevaluarse disponibilidad y restricciones duras.

### 6.2 Estados mínimos de Investigación

`BORRADOR → RADICADA → [PENDIENTE_VALIDACION] → PENDIENTE_REPARTO → ASIGNADA → EN_EJECUCION → INFORME_ENTREGADO → APROBADA → CERRADA`

Ramas controladas: `DEVUELTA_PARA_CORRECCION`, `PENDIENTE_EXCEPCION`, `PROBLEMA_REPORTADO`, `PRORROGA_SOLICITADA`, `INFORME_DEVUELTO`, `REASIGNACION_EN_TRAMITE`, `CANCELADA` y `CERRADA_POR_CAUSAL`.

Los corchetes indican una etapa cuya obligatoriedad está pendiente. Problemas, prórrogas y reasignaciones deben preferirse como subprocesos para no perder el estado principal.

### 6.3 Víctimas — flujo principal por ítem pericial

1. El RJV consulta el Catálogo de Servicios Periciales.
2. Crea un borrador con caso, ley/programa, proceso o audiencia, hechos, solicitante, una o varias víctimas, relaciones y núcleos.
3. Agrega uno o varios ítems periciales. Un mismo caso puede requerir psicología y finanzas; cada ítem se reparte y mide de forma independiente.
4. Para volúmenes altos utiliza una plantilla controlada o importación asistida con validación por fila, previsualización e idempotencia.
5. Adjunta o genera la información de los formatos institucionales aplicables, sin asumir un solo formato para todos los programas.
6. Radica y pasa a la autoridad de aval configurada para su unidad/área.
7. La autoridad aprueba, devuelve para corrección o declara la decisión procedente que se establezca. Toda devolución exige causal y observación.
8. Aprobados los ítems, el motor filtra por disciplina, servicio, cobertura, ley/programa, disponibilidad, restricciones y carga/turno.
9. Si no hay candidato, pasa a `PENDIENTE_EXCEPCION`; el sistema muestra por qué fueron excluidos.
10. El perito inicia, registra actuaciones suficientes para trazabilidad y reporta problemas o improcedencia sin alterar la solicitud.
11. Durante ejecución puede solicitar ampliación de plazo; falta definir autorizador, causales y duración.
12. Entrega F-171 u otro producto versionado. En el flujo ordinario confirmado, esta entrega cierra sin aprobación final PAG.
13. El RJV recibe notificación y acceso al producto; descarga y consulta quedan auditadas.
14. Si necesita ajuste del producto, se crea una solicitud de ajuste y nueva versión, sin eliminar el cierre ni el archivo anterior.
15. Una víctima o necesidad nueva después del cierre crea una ampliación hija, preferentemente para el mismo perito si sigue siendo elegible. La reunión favorece plazo completo, pero el valor debe parametrizarse.
16. Si cambia el RJV, se ejecuta transferencia formal de titularidad con conservación de acceso histórico.
17. Las jornadas de acopio/brigadas se registran como canal estadístico propio; no deben falsificarse como solicitudes individuales si el proceso real no las genera.

### 6.4 Estados mínimos de Víctimas

`BORRADOR → PENDIENTE_AVAL → APROBADA_PARA_REPARTO → PENDIENTE_REPARTO → ASIGNADA → EN_EJECUCION → PRODUCTO_ENTREGADO → CERRADA`

Ramas: `DEVUELTA_PARA_CORRECCION`, `NO_AVALADA/RECHAZADA` —nombre y efecto por confirmar—, `PENDIENTE_EXCEPCION`, `IMPROCEDENCIA_REPORTADA`, `PROBLEMA_REPORTADO`, `PRORROGA_SOLICITADA`, `REASIGNACION_EN_TRAMITE`, `AJUSTE_SOLICITADO`, `CANCELADA` y `CERRADA_POR_CAUSAL`.

### 6.5 Flujo de Víctimas en IRIS: frontera, no plantilla

La grabación del 12-ago describe Víctimas General, Justicia y Paz y Restitución de Tierras dentro de IRIS: ingreso por Defensor, revisión/aval PAG, reparto a un Defensor, aceptación y sustituciones. Incluye excepciones de turnos de fin de semana/URI y transferencias entre unidades.

Ese proceso **no es el reparto de peritos de SIGIP-DP**. Debe utilizarse para:

- definir identificadores de integración, programa, proceso y titularidad;
- validar quién está autorizado para solicitar;
- sincronizar cambios de Defensor/RJV;
- reconocer multiplicidad de personas y programas;
- evitar doble captura.

No se deben copiar sus etapas de reparto de defensores como etapas de asignación de peritos.

---

## 7. Catálogo de Servicios y administración de catálogos

### 7.1 Catálogo de Servicios consultable

Debe aparecer para Defensor/RJV antes y durante la radicación, y para ejecutores y supervisores como referencia. Cada ficha requiere:

| Campo | Regla |
|---|---|
| Código, nombre y área | Identidad estable; el nombre puede cambiar por versión. |
| Descripción y finalidad | Qué resuelve el servicio. |
| Alcance | Actividades/productos incluidos. |
| Exclusiones | Qué no realiza el grupo; evita solicitudes improcedentes. |
| Requisitos | Datos y documentos mínimos por servicio/programa. |
| Servicio(s) o actividad(es) | Detalle seleccionable; no confundir con especialidad. |
| Especialidad/disciplina elegible | Relación muchos-a-muchos con perfiles ejecutores. |
| Cobertura | Regional, macroregional o nacional, con vigencia. |
| Ley/programa | Principalmente Víctimas; puede restringir candidatos o requisitos. |
| Producto | Tipo de informe/formato esperado y reglas de versión. |
| Plazo aplicable | Valor, tipo de día, evento inicial, calendario, pausas y vigencia. |
| Estado y vigencia | Borrador, publicado, suspendido, retirado; desde/hasta. |
| Fundamento y responsable | Procedimiento, resolución o decisión que respalda la versión. |

### 7.2 Portafolio de Investigación

El levantamiento relaciona 17 especialidades iniciales: análisis de información forense; financiera forense; antropología y morfología; física; balística; fotografía y video; explosivos; grafología y documentología; medicina; investigación de campo; psicología; evidencia digital; topografía; ingeniería civil; lofoscopia; ingeniería mecánica; ingeniería ambiental.

La propia fuente indica que pueden aumentar o disminuir. Por tanto, constituyen **semilla de validación**, no enumeración cerrada. Además, especialidad no equivale siempre a servicio: el catálogo debe permitir varios servicios por especialidad y varios perfiles elegibles por servicio.

### 7.3 Portafolio de Víctimas

Las disciplinas iniciales son psicología y financiera/administrativa, pero el sistema debe permitir otras. Cada servicio debe distinguir ley/programa, hecho victimizante, insumos, población, producto, cobertura y posibles restricciones del perito.

### 7.4 Administración de catálogos y reglas

Debe existir una consola separada para:

- servicios, especialidades/disciplinas y su relación;
- actividades, productos, requisitos y exclusiones;
- regionales, municipios, macroregiones, oferta y cobertura;
- leyes, programas, hechos victimizantes y delitos/competencias cuando apliquen;
- perfiles profesionales, competencias y restricciones de ejecutores;
- tipos de novedad y efecto;
- causas de devolución, improcedencia, cierre, prórroga, reasignación y transferencia;
- estados y transiciones permitidas;
- plazos, calendarios, días no laborables y semáforos;
- prioridades y causales de urgencia;
- formatos y tipos documentales;
- plantillas de notificación e indicadores.

Flujo de gobierno: `BORRADOR → EN_REVISION → PUBLICADO → RETIRADO`. No se borra físicamente una versión utilizada. Los trámites conservan la versión de servicio, cobertura, plazo y regla aplicada al momento de cada decisión.

**Administrador del Sistema** mantiene plataforma, permisos técnicos e integraciones. **Gestor funcional de catálogo** propone contenidos; el **responsable funcional** los aprueba. Si una misma persona cumple varios papeles, la asignación debe ser explícita y auditable.

---

## 8. Reglas de negocio consolidadas

### 8.1 Comunes

| ID | Regla | Estado |
|---|---|---|
| RN-COM-01 | Todo trámite pertenece a un área; sus estados, permisos y reglas no se heredan automáticamente a la otra. | C |
| RN-COM-02 | Una solicitud contiene uno o más ítems; reparto, plazo, asignación y producto se controlan por ítem. | C |
| RN-COM-03 | Toda acción se autoriza por capacidad, alcance y vigencia en el servidor, no sólo ocultando botones. | C |
| RN-COM-04 | Los cambios de contexto sólo muestran asignaciones vigentes del usuario. | C |
| RN-COM-05 | El Administrador del Sistema no toma decisiones operativas por su rol técnico. | C |
| RN-COM-06 | Correcciones, retornos, cambios de estado y documentos generan evento inmutable con actor, fecha, motivo y versión. | C |
| RN-COM-07 | Reasignar ejecutor y transferir solicitante son operaciones distintas. | C |
| RN-COM-08 | Ningún catálogo utilizado se elimina; se retira con vigencia y los trámites conservan la versión aplicada. | C |
| RN-COM-09 | Cantidades de regionales, cargas, plazos, ampliaciones y umbrales no se fijan en código. | C/P |
| RN-COM-10 | Toda asignación guarda política, candidatos, exclusiones, métricas, desempate y resultado. | C |
| RN-COM-11 | Si no existe candidato elegible, el ítem pasa a cola de excepción; no se fuerza una asignación silenciosa. | C |
| RN-COM-12 | La asignación manual exige permiso, causal, justificación, candidato evaluado y evidencia; no puede omitir restricciones duras no autorizadas. | C/D |
| RN-COM-13 | El motor debe resolver concurrencia de forma transaccional e idempotente para impedir doble asignación. | C |
| RN-COM-14 | Novedades vigentes impiden nuevas asignaciones según su tipo; el efecto sobre trabajo activo se configura y audita. | C/P |
| RN-COM-15 | Plazo y semáforo conservan regla, calendario, evento inicial, pausas, prórrogas y vencimiento calculado. | C/P |
| RN-COM-16 | Estado/progreso, días restantes y oportunidad son medidas diferentes. No se presenta porcentaje subjetivo como avance real. | C |
| RN-COM-17 | Documentos son metadatos versionados; su repositorio y permisos se integran sin duplicar cargas ni ampliar acceso. | C/D |
| RN-COM-18 | Indicadores declaran unidad de análisis: solicitud, persona, ítem, asignación o producto. | C |
| RN-COM-19 | Una notificación no ejecuta la transición; informa una transición ya confirmada y puede reintentarse. | C |
| RN-COM-20 | Datos sensibles se minimizan y se acceden por finalidad y alcance; toda consulta/descarga relevante queda trazada. | C |

### 8.2 Investigación

| ID | Regla | Estado |
|---|---|---|
| RN-INV-01 | El Defensor activo radica y consulta sus solicitudes y Catálogo de Servicios. | C |
| RN-INV-02 | La vigencia del Defensor y su relación con el proceso deberán verificarse mediante fuente institucional cuando esté disponible. | C/D integración |
| RN-INV-03 | Una solicitud puede seleccionar varios servicios y generar ítems/radicados operativos independientes vinculados al mismo caso. | C |
| RN-INV-04 | La revisión previa al reparto sólo será bloqueante si la autoridad funcional confirma actor, alcance y causal. | D |
| RN-INV-05 | Elegibilidad considera como mínimo servicio/especialidad, cobertura, disponibilidad y restricciones vigentes. | C |
| RN-INV-06 | El grado no será filtro duro hasta que exista decisión institucional; el levantamiento recomienda probarlo antes de atarlo al reparto. | D/X |
| RN-INV-07 | No existe límite general de carga aprobado; cualquier umbral se configura por política, servicio y vigencia. | C/P |
| RN-INV-08 | La equidad debe aplicar el turno institucional dentro del conjunto elegible y registrar carga/desempate; “menor carga” por sí sola no reemplaza el turno. | C/P detalle |
| RN-INV-09 | Si no hay oferta local, se aplica matriz de cobertura/macroregión/proximidad/nivel nacional según política versionada. | C/P |
| RN-INV-10 | Urgencias forman cola diferenciada ordenada y requieren actor, causal y sustento; no alteran filtros duros. | C/D |
| RN-INV-11 | Casos de relevancia nacional, directriz interna, trabajo complementario o servidor comisionado son causales potenciales de excepción; requieren catálogo y autorizador. | P/D |
| RN-INV-12 | El investigador reporta problemas; un gestor autorizado decide corrección, retorno, cambio de especialidad o reasignación. | C/D actor |
| RN-INV-13 | El informe final pasa a PAG Investigación para aprobación o devolución versionada. | C |
| RN-INV-14 | Una ampliación cerrada crea vínculo hijo y puede conservar investigador si continúa elegible; no requiere firma del Defensor Regional. | C/P |
| RN-INV-15 | Cierre anticipado por defensor de confianza, fin del proceso u otra causal exige verificación, permiso, motivo y soporte; no lo ejecutan solicitante ni investigador por sí solos. | C/D actor |

### 8.3 Víctimas

| ID | Regla | Estado |
|---|---|---|
| RN-VIC-01 | La solicitud requiere aval previo configurado antes del reparto. | C |
| RN-VIC-02 | El actor de aval se configura por unidad/alcance; no se presume que todas las regionales tengan PAG supervisor. | C/P |
| RN-VIC-03 | La devolución previa exige causal y observación; el RJV corrige y reenvía sin sobrescribir la versión anterior. | C |
| RN-VIC-04 | La solicitud admite múltiples personas, víctima directa/indirecta, parentesco, núcleo y varios hechos. | C |
| RN-VIC-05 | Una solicitud puede tener varios ítems y disciplinas; cada ítem se asigna por separado. | C |
| RN-VIC-06 | La carga masiva valida plantilla, filas, duplicados e idempotencia y permite corregir parcialmente antes de radicar. | C/D plantilla |
| RN-VIC-07 | Elegibilidad considera disciplina, servicio, cobertura, ley/programa, restricciones, disponibilidad y política de carga/turno. | C |
| RN-VIC-08 | No se aplica el grado de Investigación ni un límite fijo de seis actividades sin aprobación propia de Víctimas. | C |
| RN-VIC-09 | La cobertura se modela por oferta y vigencia: regional, central/nacional y excepciones; no se reduce a “misma regional”. | C/P |
| RN-VIC-10 | El perito reporta inconsistencias o improcedencia, pero no modifica la solicitud fuente. | C |
| RN-VIC-11 | Improcedencia requiere causal escrita, decisión del actor autorizado y trazabilidad. | C/D actor |
| RN-VIC-12 | El F-171 ordinario se entrega al RJV y cierra sin aprobación final PAG. | C |
| RN-VIC-13 | El PAG/supervisor puede consultar seguimiento según alcance, pero el acceso al contenido sensible del informe se define separadamente. | C/D |
| RN-VIC-14 | Ajustes o actualizaciones posteriores generan una nueva versión del producto y conservan la anterior. | C |
| RN-VIC-15 | Una ampliación por nueva víctima o labor crea ítem hijo, busca continuidad con el mismo perito si es elegible y utiliza plazo completo conforme a parámetro aprobado. | C/P |
| RN-VIC-16 | Prórroga durante ejecución es distinta de ampliación posterior al cierre. Debe definirse quién aprueba, duración y pausas. | C/D |
| RN-VIC-17 | Transferir el caso a un nuevo RJV conserva historia y otorga acceso según la nueva titularidad, sin cambiar automáticamente al perito. | C |
| RN-VIC-18 | Jornadas de acopio/brigadas se registran como canal propio con estadísticas, participantes y productos; no como solicitudes ficticias. | C/D diseño |
| RN-VIC-19 | Formatos F-168/F-169/F-171 u otros se seleccionan por servicio/programa y se versionan; falta matriz documental oficial. | P/D |
| RN-VIC-20 | Las métricas diferencian solicitudes, víctimas, hechos, ítems, asignaciones y productos. | C |

---

## 9. Reparto automático y excepciones

### 9.1 Secuencia común

1. Congelar versión de solicitud, ítem, servicio y política.
2. Obtener candidatos activos dentro del alcance.
3. Aplicar restricciones duras.
4. Registrar candidato excluido y causa.
5. Calcular orden de turno/equidad entre elegibles.
6. Aplicar desempate estable y reproducible.
7. Reservar/confirmar transaccionalmente.
8. Crear asignación y evento de auditoría.
9. Emitir notificación después de confirmar.

### 9.2 Restricciones y criterios

| Criterio | Investigación | Víctimas |
|---|---|---|
| Área activa | Duro | Duro |
| Servicio/especialidad | Duro | Duro |
| Disciplina | No aplica o deriva de especialidad | Duro |
| Cobertura vigente | Duro | Duro |
| Ley/programa | Sólo si el servicio lo requiere | Duro cuando restrinja al perito |
| Disponibilidad/novedad | Duro | Duro |
| Conflicto/restricción individual | Duro | Duro |
| Grado | Pendiente; no duro por ahora | No aplica salvo decisión propia |
| Carga máxima | Sin valor general aprobado | Sin valor fijo aprobado |
| Turno/equidad | Ordena elegibles | Ordena elegibles |
| Continuidad por ampliación | Preferencia condicionada | Preferencia condicionada |
| Urgencia | Prioriza cola | Política por definir |

### 9.3 Asignación manual

La HU-26 no debe interpretarse como autorización para ignorar regional, grado o cualquier otra condición. La pantalla de excepción debe mostrar:

- regla fallida y candidatos evaluados;
- restricciones que nunca se pueden omitir;
- restricciones excepcionables según política;
- causal, justificación y soportes;
- autorizador y ejecutor;
- efecto en carga/turno;
- versión de política;
- notificaciones y auditoría.

---

## 10. Flujos operativos no mapeados que deben entrar al backlog

| Flujo | Mínimo funcional |
|---|---|
| Borrador y abandono | Guardado, edición, expiración y eliminación lógica antes de radicar. |
| Detección de duplicados | Caso, proceso, persona, servicio y ventana temporal; confirmación controlada. |
| Validación/triage | Completitud, coherencia, devolución y reenvío; actor separado por área. |
| Problemas e improcedencia | Catálogo de causales, bloqueo/no bloqueo, decisión, retorno y cierre. |
| Novedades | Solicitud/registro, aprobación, vigencia, efecto en asignación nueva y trabajo activo. |
| Reasignación | Causal, entrega de contexto, documentos, plazo, carga, historia y notificación. |
| Transferencia de Defensor/RJV | Cambio de titularidad, acceso histórico y pendientes; no modifica ejecutor por defecto. |
| Prórroga | Durante ejecución; solicitante, aprobador, causal, días/fecha y calendario. |
| Ampliación | Después del cierre; relación padre-hijo, mismo ejecutor condicionado y plazo nuevo. |
| Cancelación/cierre por causal | Quién, cuándo, soporte, efecto en ítems y posibilidad de reactivación. |
| Producto devuelto/ajustado | Nueva versión, observaciones, ciclo y conservación del anterior. |
| Documentos | Carga, antivirus, tamaño, versión, clasificación, acceso, retención y vínculo SharePoint. |
| Notificaciones | Eventos, destinatarios, plantillas, reintentos y evidencia de envío. |
| Carga masiva de Víctimas | Plantilla, prevalidación, error por fila, reintento idempotente y resumen. |
| Brigadas/acopio | Registro agregado separado de solicitudes periciales. |
| Reportes | Fórmulas, alcance, filtros, exportación, fecha de corte y trazabilidad. |
| Gobierno de catálogos | Propuesta, aprobación, publicación, vigencia, retiro e impacto. |
| Auditoría y consulta histórica | Búsqueda, exportación controlada, acceso por finalidad y conservación. |

---

## 11. Información que debe levantarse con los grupos

### 11.1 Taller conjunto

1. Catálogo oficial de regionales, unidades, códigos, municipios y vigencias.
2. Fuente maestra de personas, cargos, vínculos activos, regional y unidad.
3. Perfiles institucionales y matriz capacidad–alcance–suplencia.
4. Quién propone y quién aprueba Catálogo de Servicios, coberturas, plazos y reglas.
5. Catálogo transversal de causales y qué restricciones son excepcionables.
6. Política documental, SharePoint, clasificación, retención y permisos.
7. Fórmula oficial de cada KPI y unidad de análisis.
8. Reglas de protección de datos, auditoría y consulta de informes sensibles.

### 11.2 Investigación

1. ¿Existe revisión previa al reparto? ¿Quién la hace y qué puede devolver?
2. ¿Quién cumple hoy la gestión regional de errores, cambios, novedades y cierres por causal?
3. ¿Quién resuelve excepciones nacionales y con qué doble control?
4. Relación oficial servicio–especialidad–requisitos–exclusiones–producto.
5. Matriz de oferta regional, macroregiones, proximidad y escalamiento nacional.
6. Definición del turno: unidad, reinicio, efecto de reasignaciones y simultaneidad.
7. Causales de urgencia y autoridad que las declara.
8. Decisión sobre grado; mientras no exista, debe permanecer fuera del filtro duro.
9. Plazos vigentes, evento inicial, días hábiles/calendario, Semana Santa, pausas y prórrogas.
10. Causales y procedimiento para ampliación, continuidad y cierre anticipado.
11. Hitos realmente registrables. Si no existen, eliminar porcentaje manual y usar estados + plazo.

### 11.3 Víctimas

1. Quién avala en nivel central y en cada unidad/regional; suplencias y ausencias.
2. Quién recibe y resuelve problemas reportados por el perito.
3. Servicios periciales por disciplina, programa/ley, hecho, producto y requisitos.
4. Matriz ejecutor–disciplina–ley/programa–cobertura–restricción–vigencia.
5. Modelo de víctima directa/indirecta, parentesco, núcleo, hechos y duplicados.
6. Plantillas reales de carga masiva y formatos F-168/F-169/F-171.
7. Cuándo varios hechos/personas forman un ítem, varios ítems o varias solicitudes.
8. Plazo vigente y diferencia entre 30 hábiles, 45 calendario u otros valores.
9. Autoridad y reglas de prórroga durante ejecución.
10. Flujo de improcedencia y de ajuste del F-171.
11. Regla de acceso al informe para PAG, coordinación, RJV sustituto y auditoría.
12. Registro de brigadas/acopio y métricas separadas.

Cada respuesta debe producir una decisión con: ID, pregunta, opción elegida, fundamento, responsable, fecha, vigencia, impacto y aprobador.

---

## 12. Contrato de dominio que Oracle deberá soportar

El mapeo no puede partir de las tablas actuales como si definieran el negocio. Primero debe comprobar que el esquema representa o permite representar:

- `AREA`, `UNIDAD_ORGANIZACIONAL`, `TERRITORIO` y vigencias;
- `USUARIO/ACTOR`, `PERFIL`, `CAPACIDAD`, `ALCANCE`, delegaciones y suplencias;
- `SERVICIO`, `ESPECIALIDAD_DISCIPLINA`, relaciones, versiones y cobertura;
- `REGLA/POLITICA`, `PARAMETRO`, `CALENDARIO` y vigencias;
- `CASO`, `SOLICITUD`, `ITEM_SOLICITUD`, `PERSONA_SOLICITUD`, parentescos y hechos;
- `ASIGNACION` y su historia, evaluación de candidatos y política aplicada;
- `NOVEDAD`, `PROBLEMA`, `IMPROCEDENCIA`, `PRORROGA`, `AMPLIACION`, `REASIGNACION` y `TRANSFERENCIA`;
- `DOCUMENTO`, clasificación y versiones de producto;
- `EVENTO_AUDITORIA`, notificación y evidencia de acceso/descarga;
- importaciones masivas, errores por fila e idempotencia;
- fórmulas e instantáneas de indicadores.

Condiciones no negociables del mapeo:

1. No colapsar solicitud, ítem, asignación y producto en una sola tabla/estado.
2. No almacenar únicamente el estado actual sin historia.
3. No sobrescribir catálogos o reglas que ya fueron aplicados.
4. No fijar 15/34/42 regionales, 6 asignaciones, 5 ampliaciones, 20/25/30/40/45 días ni semáforos como constantes.
5. No modelar permisos sólo como un campo `ROL` en usuario.
6. No hacer del esquema existente una restricción para ocultar requisitos confirmados; las brechas se documentan y migran.

---

## 13. Puertas de decisión antes del PROMPT 2

| Puerta | Evidencia de salida | ¿Bloquea diseño Oracle? |
|---|---|---:|
| G1 — Vocabulario | Glosario y cardinalidades aprobadas | Sí |
| G2 — Flujos | Estados/transiciones por área y propietario de cada acción | Sí |
| G3 — Roles | Capacidades, alcance, segregaciones y suplencias | Sí para autorización; no para crear tablas genéricas |
| G4 — Catálogo de Servicios | Estructura y gobierno aprobados; contenido puede cargarse progresivamente | Sí para modelo; no exige 100 % del contenido |
| G5 — Reparto | Filtros duros, orden, excepción y concurrencia definidos | Sí |
| G6 — Plazos | Modelo de parámetros/calendario aprobado; valores pueden quedar pendientes | Sí para modelo, no para valores |
| G7 — Víctimas multiítem/personas | Cardinalidades, formatos y privacidad definidos | Sí |
| G8 — Documentos/integraciones | Frontera y metadatos definidos | Sí para modelo de referencia; integración puede ser posterior |

El PROMPT 2 puede iniciarse cuando G1–G8 tengan una salida documentada. Las decisiones de contenido no resueltas pueden representarse como parámetros pendientes, pero no como valores falsamente definitivos.

---

## 14. Incremento recomendado antes de Oracle

Crear un incremento `feat/cierre-funcional-pre-oracle` sin persistencia Oracle que:

1. actualice reglas, glosario, estados y matriz HU;
2. introduzca el modelo de permisos por capacidades y alcance, manteniendo deshabilitados los perfiles no aprobados;
3. implemente Catálogo de Servicios consultable para ambas áreas con datos semilla claramente versionados;
4. implemente administración de catálogos en memoria/adaptador, con borrador–publicación–retiro y auditoría;
5. modele solicitud multiítem en contratos/API sin romper la experiencia actual;
6. separe estado, días restantes y oportunidad;
7. agregue contratos y pruebas para novedades, excepción manual, reasignación, transferencia, prórroga y ampliación, aunque algunas acciones permanezcan bloqueadas por decisión pendiente;
8. mantenga Hugging Face navegable y coherente, sin exponer valores técnicos o supuestos como reglas oficiales.

Después se ejecuta un PROMPT 2 revisado que mapee **este contrato** contra Oracle y produzca una matriz `dominio → tabla/columna/brecha/migración`, antes de conectar escritura real.

---

## 15. Prompt sugerido para Codex — Cierre funcional pre-Oracle

```text
Trabaja en el repositorio canónico:
https://github.com/shcampinof/reparto-misiones-dndp

El Space canónico es:
https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp

Parte de origin/main y verifica que el commit 97927fc o sus cambios equivalentes estén integrados. No uses ni publiques en los repositorios o Spaces anteriores. Crea la rama feat/cierre-funcional-pre-oracle desde origin/main actualizado.

Antes de modificar código, lee completos:
- docs/sigip/14_BRECHAS_FUNCIONALES_Y_RACI.md
- el documento REVISION_LOGICA_NEGOCIO_FULL_PRE_ORACLE_SIGIP_DP.md que colocaré en docs/sigip/
- docs/sigip/06_MATRIZ_TRAZABILIDAD_32_HU.md
- docs/sigip/02_REGLAS_DE_NEGOCIO_SIGIP_DP.md
- las HU-01 a HU-32 y el HTML fuente si están disponibles.

Objetivo: cerrar el contrato funcional previo a Oracle y mejorar la demostración de Hugging Face, sin implementar Oracle, migraciones ni integraciones reales.

Implementa sólo este incremento:
1. Actualiza glosario, reglas, máquinas de estado, matriz de trazabilidad y registro de decisiones pendientes conforme al documento de revisión. No conviertas asuntos pendientes en reglas aprobadas.
2. Refactoriza autorización para soportar capacidades + alcance + vigencia. Conserva los siete perfiles actuales. No habilites automáticamente PAG Central, Administrador Regional, Defensor Regional, Coordinador GID ni Administrativo delegado; registra sus capacidades requeridas y deja los perfiles sujetos a RACI.
3. Separa Administrador del Sistema de gestor funcional de catálogos y de decisiones operativas.
4. Implementa una sección Catálogo de Servicios consultable para Investigación y Víctimas. Distingue SERVICIO de ESPECIALIDAD/DISCIPLINA. Cada ficha debe incluir descripción, alcance, exclusiones, requisitos, producto, cobertura, plazo/versionado y vigencia. Usa el portafolio fuente como semilla revisable, no como lista definitiva.
5. Implementa administración de catálogos detrás de capacidades explícitas, con estados BORRADOR, EN_REVISION, PUBLICADO y RETIRADO, vigencias, historial y sin eliminación física. En este incremento puede usar el repositorio/adaptador actual en memoria, preparado para Oracle.
6. Evoluciona los contratos de dominio y API para que una solicitud pueda tener múltiples ITEM_SOLICITUD, cada uno con servicio, asignación, estado, plazo y producto propios. Mantén compatibilidad temporal con las pantallas existentes y agrega al menos un recorrido visible multiítem por área.
7. Corrige la presentación de seguimiento: separa estado del trámite, días restantes/semáforo y oportunidad. No presentes un porcentaje como avance real si no hay actividades objetivas registradas.
8. Añade modelos/contratos, permisos y pruebas para problema, novedad, excepción manual, reasignación, transferencia, prórroga y ampliación. Si falta una decisión funcional, deja la transición deshabilitada con código de decisión pendiente; no inventes actor, plazo o causal.
9. Investigación debe conservar aprobación final PAG. Víctimas debe conservar aval previo y cierre ordinario con F-171 sin aprobación final PAG. No mezcles los flujos.
10. Mantén la identidad institucional y el nombre “SIGIP-DP — Gestión investigativa y pericial de la Defensoría del Pueblo” donde haya espacio, sin saturar la interfaz.

Pruebas mínimas:
- permisos positivos y negativos por capacidad/alcance;
- publicación y vigencia del Catálogo de Servicios;
- solicitud con dos ítems y estados/asignaciones diferentes;
- devolución y versionado;
- ninguna constante institucional no aprobada en el motor;
- segregación Administrador técnico/gestor funcional;
- build, lint, tests API y smoke tests de los dos flujos;
- recorrido visual del Space en escritorio y móvil.

No hagas push ni despliegue hasta que todo esté verde. Presenta primero:
- archivos cambiados;
- decisiones implementadas y pendientes;
- matriz HU afectada;
- riesgos y deuda;
- resultado de pruebas;
- plan exacto de merge de la rama y de despliegue al Space.

No inicies el PROMPT 2 de Oracle en este trabajo.
```

---

## 16. Dictamen final

Antes de Oracle, SIGIP-DP necesita recuperar la intención funcional que se perdió al reducir el sistema a siete perfiles y cinco servicios codificados. El mecanismo correcto no es inflar el selector de roles: es representar capacidades, alcance, vigencia y segregación; habilitar perfiles sólo después de aprobar la RACI; recuperar el Catálogo de Servicios como función de orientación y gobierno; y completar los ciclos de excepción y trazabilidad.

Con este contrato, Oracle podrá implementarse como persistencia del negocio definido. Sin él, existe un riesgo alto de construir tablas y migraciones alrededor de un flujo incompleto y tener que rehacer el esquema al incorporar multiítem, cobertura, novedades, transferencias y versionado.
