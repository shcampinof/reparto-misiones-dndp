# Brechas funcionales y matrices RACI — SIGIP-DP

**Fecha de corte:** 8 de septiembre de 2026  
**Estado:** análisis técnico-funcional para taller; no reemplaza aprobación institucional  
**Repositorio canónico:** `https://github.com/shcampinof/reparto-misiones-dndp`  
**Space canónico:** `https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp`  
**Servicio verificado:** `https://shcampinof-reparto-misiones-dndp.hf.space`

## 1. Fuentes comparadas

1. Código de `origin/main` en `4a50509` y ajustes acotados de `feat/alineacion-funcional-raci`.
2. Space canónico consultado el 8-sep-2026: SDK Docker, estado `RUNNING`, servicio HTTP disponible. Al iniciar este ajuste todavía reflejaba el comportamiento de `main`: ocho perfiles de presentación, administrador con consulta global, flujos separados y almacén en memoria.
3. Reglas consolidadas de `02_REGLAS_DE_NEGOCIO_SIGIP_DP.md`.
4. Backlog complementario de `05_BACKLOG_MVP_PROPUESTO.md`.
5. Matriz de HU-01 a HU-32 de `06_MATRIZ_TRAZABILIDAD_32_HU.md`.
6. Adenda funcional recibida el 8-sep-2026. La adenda restringe el análisis; no aprueba por sí sola cifras, roles ni excepciones.

Precedencia: acto o procedimiento vigente aprobado, HU aceptada, decisión formal trazable, matriz oficial, reglas consolidadas, prototipo y código. La fecha de un archivo no basta para resolver una contradicción.

## 2. Clasificación

| Clasificación | Significado en este documento |
|---|---|
| **confirmado** | Cuenta con respaldo suficiente para implementarse en este ajuste. |
| **parametrizable** | La capacidad es válida, pero su valor, catálogo, alcance o vigencia no puede fijarse en código. |
| **pendiente de validación** | Falta responsable, fuente o decisión formal; no habilita comportamiento operativo. |
| **contradicción documental** | Dos o más fuentes sostienen reglas incompatibles; exige acta de decisión. |

## 3. Comparación y brechas

| ID | Hallazgo al comparar código, Space, reglas y HU | Clasificación | Tratamiento en este ajuste |
|---|---|---|---|
| BF-01 | Investigación y Víctimas necesitan estados y permisos separados. El código y el Space ya separan formularios, reparto y cierre; las HU-24, HU-25 y HU-29 respaldan la bifurcación. | confirmado | Se conserva la separación. No se introduce una máquina común única. |
| BF-02 | Investigación dispone actualmente de Administrador del Sistema, Defensor, Investigador y PAG Investigación. | confirmado | Se mantienen esos perfiles. El administrador queda limitado a consulta global, gestión técnica y restablecimiento de la información de presentación. |
| BF-03 | PAG Central, Administrador Regional y Defensor Regional aparecen como perfiles posibles, pero las fuentes no fijan responsabilidad, territorio ni suplencia. | pendiente de validación | Se registran como propuestos y permanecen deshabilitados. |
| BF-04 | Coordinador GID, Administrativo delegado y PAG unidad operativa provienen de configuraciones o prototipos anteriores, sin RACI aprobado para este alcance. | pendiente de validación | No se recuperan, crean ni habilitan automáticamente. |
| BF-05 | Víctimas requiere aprobación o devolución del PAG antes del reparto. La devolución debe volver al RJV, exigir observación y conservar correcciones. | confirmado | Se implementa `PENDIENTE_APROBACION_PAG → DEVUELTA → PENDIENTE_APROBACION_PAG`, con actor, observación, línea de tiempo y versiones de radicación inmutables. |
| BF-06 | RN-COM-007 impide que la administración técnica adopte decisiones operativas por el solo rol. En `main`, el administrador podía crear, repartir, aprobar y devolver mediante API. | confirmado | Se retiran esos permisos del servidor y la interfaz. Conserva consulta global y restablecimiento. |
| BF-07 | Si el reparto no encuentra candidato, RN-COM-056 exige conservar una cola explícita. | confirmado | Se mantiene `PENDIENTE_REASIGNACION` y se exponen candidatos, exclusiones y una explicación comprensible. |
| BF-08 | No está confirmado quién realiza una eventual revisión previa en Investigación ni si bloquea el reparto. La HU-17 tampoco puede imponer al Administrador Regional como revisor común. | pendiente de validación | No se agrega revisión previa. El recorrido de presentación continúa de radicación a reparto sin inventar un aprobador. |
| BF-09 | Las fuentes mencionan 15, 34 y 42 defensorías regionales. La referencia funcional más reciente indica 42, pero no existe catálogo oficial verificable con vigencia. | contradicción documental | No se codifica ninguna cantidad. Se exige catálogo institucional oficial, configurable, versionado y con fuente maestra. |
| BF-10 | El paquete verificable contiene HU-01 a HU-32. No se encontró archivo ni contenido verificable de HU-33. | pendiente de validación | HU-33 queda como fuente pendiente; no se infieren requisitos. |
| BF-11 | Una solicitud de Víctimas puede involucrar múltiples víctimas, parentescos, núcleos, carga masiva, varios ítems y disciplinas, además de versiones. El prototipo admite varias personas, pero aún crea un solo ítem y no ofrece carga masiva. | confirmado | Se elimina el máximo fijo de cinco personas y se conserva versionado en el flujo corregido. Multiítem, parentescos y carga masiva quedan como brecha de un incremento posterior, sin reducir el modelo a una víctima o una asignación. |
| BF-12 | El reparto debe guardar candidatos, exclusiones, métricas, desempate, política y resultado. El prototipo lo hace para una transacción síncrona en memoria, pero no ofrece garantías entre procesos. | confirmado | Se conserva la explicación. La concurrencia productiva sigue siendo requisito obligatorio de persistencia, no resuelto en este sprint. |
| BF-13 | HU-26 permite omitir regional y grado en asignación manual; las observaciones funcionales señalan que especialidad, competencia, cobertura, grado y disponibilidad no deben omitirse. | contradicción documental | No se implementa override manual. Deben definirse autorizador, requisitos no omitibles, causal, justificación y evidencia. |
| BF-14 | Las novedades excluyen nuevas asignaciones, pero faltan estructura oficial y efecto sobre encargos activos. | parametrizable | Deben tener tipo, inicio, fin, autorizador, vigencia y efecto sobre nuevas asignaciones. El tratamiento de misiones activas queda pendiente. |
| BF-15 | Plazos de 25, 40 o 45 días, carga máxima de seis, máximo de cinco ampliaciones y semáforos 15/6/5 aparecen de manera contradictoria. | contradicción documental | No se declaran definitivos. Los valores del perfil de presentación permanecen identificados internamente como no aprobados y deben migrar a parámetros versionados por área, servicio y vigencia. |
| BF-16 | Solicitud, persona vinculada, ítem, asignación, producto, ampliación, reasignación y transferencia del defensor tienen ciclos e indicadores distintos. El prototipo solo materializa parte de estas entidades. | confirmado | El análisis y las pruebas no los cuentan como una sola magnitud. La ampliación del modelo queda fuera del ajuste acotado y será obligatoria antes del mapeo Oracle. |
| BF-17 | La interfaz mostraba expresiones propias del entorno de presentación en mensajes de acceso y reparto. | confirmado | La interfaz evita “demo”, “sintético”, “semilla” y “temporal”; las advertencias técnicas permanecen en configuración y documentación. |
| BF-18 | Nombres de paquetes, README y despliegue todavía conservaban destinos anteriores. | confirmado | Se alinean exclusivamente con `reparto-misiones-dndp` y el Space canónico verificado. |
| BF-19 | El Space canónico estaba operativo, pero al inicio de este trabajo no incluía devolución previa de Víctimas ni la restricción completa del administrador. | confirmado | Se actualiza solo después de pruebas verdes y autenticación local disponible; el despliegue no constituye aprobación funcional. |

## 4. RACI actual — Investigación

Notación: **R** ejecuta, **A** responde por la decisión, **C** es consultado, **I** es informado. Esta matriz describe exclusivamente el comportamiento confirmado del alcance actual.

| Actividad | Administrador del Sistema | Defensor | Investigador | PAG Investigación |
|---|---:|---:|---:|---:|
| Consulta global y soporte técnico | R/A | I | I | I |
| Restablecer información de presentación | R/A | — | — | — |
| Radicar solicitud | — | R/A | — | I |
| Ejecutar reparto automático desde una solicitud propia | — | R | — | I |
| Consultar misión propia asignada | C | I | R/A | C |
| Iniciar, avanzar y entregar informe | — | I | R/A | I |
| Aprobar o devolver el informe entregado | — | I | I | R/A |
| Cerrar por aprobación del informe | — | I | I | R/A |

El administrador no aprueba, reparte, devuelve informes ni cierra solicitudes por su rol técnico. La matriz no agrega revisión previa a Investigación.

## 5. RACI actual — Víctimas

| Actividad | Administrador del Sistema | RJV | PAG Víctimas | Perito |
|---|---:|---:|---:|---:|
| Consulta global y soporte técnico | R/A | I | I | I |
| Restablecer información de presentación | R/A | — | — | — |
| Radicar solicitud y personas vinculadas | — | R/A | I | — |
| Aprobar o devolver antes del reparto | — | I | R/A | — |
| Corregir y reenviar una solicitud devuelta | — | R/A | I | — |
| Ejecutar reparto tras aprobación | — | I | R | I |
| Iniciar, avanzar y entregar F-171 | — | I | I | R/A |
| Cierre ordinario con F-171 | — | I | I | R/A |

El cierre ordinario de Víctimas no hereda aprobación final del PAG. Una posible devolución posterior del producto por el RJV sigue siendo una decisión distinta y pendiente conforme a RN-VIC-053.

## 6. Roles propuestos que permanecen inactivos

| Rol propuesto | Área posible | Estado | Validación mínima requerida |
|---|---|---|---|
| PAG Central | Separada por área | pendiente de validación | Acciones, alcance nacional/regional, suplencia, segregación y relación con PAG existentes. |
| Administrador Regional | Separada por área | pendiente de validación | Si administra catálogos o adopta decisiones; territorio; ausencia; escalamiento y auditoría. |
| Defensor Regional | Separada por área | pendiente de validación | Consulta, autorización excepcional, transferencia, ámbito territorial y suplencia. |

No se habilitan estos roles por variables de entorno ni se les asignan actuaciones. Tampoco se recuperan Coordinador GID, Administrativo delegado o PAG unidad operativa sin una decisión RACI trazable.

## 7. Taller funcional pendiente

| Decisión | Responsable de validación propuesto | Impacto | Pregunta concreta |
|---|---|---|---|
| DEC-RACI-INV | Dueño funcional de Investigación y control interno | Permisos, estados, auditoría y pruebas | ¿Existe revisión antes del reparto, quién la realiza, sobre qué alcance y bloquea la asignación? |
| DEC-RACI-VIC | Dueño funcional de Víctimas/PAG responsable | Aprobación, devolución, reasignación y suplencia | ¿Cuál es el alcance territorial y la cadena de suplencia del PAG que aprueba o devuelve? |
| DEC-REG-001 | Planeación/TI y dueño del catálogo institucional | Cobertura, reportes, identidad y asignación | ¿Cuál es el catálogo oficial de regionales, su código, vigencia y fuente maestra ante las referencias 15/34/42? |
| DEC-HU-033 | Líder funcional y gestión documental | Alcance y trazabilidad contractual | ¿Existe HU-33? Si existe, ¿cuál es su archivo verificable, versión y aprobación? |
| DEC-VIC-ITEMS | Dueño funcional de Víctimas | Modelo, formulario, indicadores y reparto | ¿Qué combinaciones de peritaje se permiten y cómo se crean ítems independientes dentro de una solicitud? |
| DEC-VIC-MASIVA | Víctimas, seguridad y gestión documental | Plantilla, privacidad, idempotencia y errores por fila | ¿Cuál es la plantilla oficial para víctimas, parentescos y núcleos, y quién certifica su contenido? |
| DEC-ASG-EXC | Dueños funcionales de ambas áreas y control interno | Elegibilidad, reasignación, evidencia y auditoría | ¿Quién autoriza una excepción y cuáles reglas nunca pueden omitirse? |
| DEC-NOV-001 | Talento Humano y dueños funcionales | Carga, disponibilidad, plazos y continuidad | ¿Qué sucede con encargos ya activos cuando inicia cada tipo de novedad? |
| DEC-PLZ-001 | Dueños funcionales y oficina jurídica | Calendarios, vencimientos, alertas y SLA | ¿Cuáles son evento inicial, valor, tipo de día, pausas y vigencia por área/servicio? |
| DEC-IND-001 | Planeación/analítica y dueños funcionales | Tableros, exportaciones y rendición de cuentas | ¿Cuál es la fórmula oficial de cada indicador para solicitud, persona, ítem, asignación, producto, ampliación y transferencia? |
| DEC-VIC-F171 | Dueño funcional de Víctimas | Versiones, carga y estado posterior a entrega | ¿El RJV devuelve formalmente un F-171 o solicita ajuste por otro canal, y qué transición corresponde? |

## 8. Trazabilidad hacia las HU

- HU-05, HU-17 y HU-31 requieren matrices RACI separadas; no habilitan roles regionales por sí mismas.
- HU-10 queda replanteada por la contradicción 15/34/42 y debe referenciar el catálogo oficial vigente.
- HU-14 debe incorporar múltiples víctimas, parentescos, versiones y posible multiítem; no puede imponer un único peritaje.
- HU-18 y HU-24 respaldan la devolución previa en Víctimas con observación, historial y reenvío.
- HU-20 necesita fechas, tipo, autorizador y efecto de la novedad; el efecto sobre misiones activas sigue abierto.
- HU-22 y HU-23 deben conservar explicación del reparto y control de concurrencia sin compartir límites entre áreas.
- HU-26 no autoriza todavía un override que omita requisitos duros.
- HU-29 conserva la bifurcación: aprobación final en Investigación y cierre ordinario directo con F-171 en Víctimas.
- HU-30 no fija umbrales mientras calendarios y semáforos estén sin decisión.
- No se agrega HU-33 sin una fuente verificable.

## 9. Condición para el futuro mapeo Oracle

El futuro `docs/sigip/15_MAPEO_MODELO_ORACLE.md` deberá citar este documento como fuente obligatoria y demostrar cómo representa, sin colapsarlos: `CASO`, `SOLICITUD`, `PERSONA_SOLICITUD`, `ITEM_SOLICITUD`, `ASIGNACION`, producto/informe y sus versiones, ampliación, reasignación, transferencia del defensor, novedades, parámetros vigentes y evidencia del reparto.

Ese mapeo no podrá fijar cantidades de regionales, plazos, umbrales, límites de carga o ampliaciones; tampoco podrá crear permisos para roles que aquí permanecen pendientes. Este documento no autoriza Oracle ni migraciones en el ajuste actual.
