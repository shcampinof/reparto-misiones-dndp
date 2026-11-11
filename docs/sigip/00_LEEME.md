# Paquete de definición funcional — SIGIP-DP

Presentación de cambios: [34 — Guion con perfiles, pasos y mensajes](34_GUION_PRESENTACION_CAMBIOS.md). Incluye los ocho ajustes originales y las mejoras autónomas publicadas.

Incremento autónomo del 19-oct-2026: [33 — Documentos, borradores y recuperación sin acceso institucional](33_MEJORAS_AUTONOMAS_HUGGING_FACE.md).

Incremento funcional del 16-oct-2026, posterior a las aclaraciones del usuario: [30 — Persistencia, reglas provisionales y flujos](30_INCREMENTO_FUNCIONAL_PERSISTENTE_2026_10_16.md), [31 — Solicitud de ratificación al área funcional](31_SOLICITUD_RATIFICACION_AREA_FUNCIONAL.md) y [32 — Entorno de pruebas y transición Oracle](32_GUIA_ENTORNO_PRUEBAS_Y_TRANSICION_ORACLE.md). Sustituye los bloqueos de implementación de términos y remisión descritos antes: son decisiones D provisionales explícitas, sin convertirlos en aprobación institucional.

Revisión de nuevas fuentes (16-oct-2026): [28 — Reuniones de Investigación del 7-oct y Víctimas del 8-oct](28_REVISION_REUNIONES_OCTUBRE_Y_CIERRE_DE_INQUIETUDES.md). Aclara la remisión regional directa, distingue propuestas de decisiones y contrasta las prórrogas con SD-P03. [29 — Dos consultas pendientes, separadas por área](29_PREGUNTAS_FUNCIONALES_TRAS_REVISION_DE_REUNIONES.md), limitadas a procedimiento vigente y régimen de términos/prórrogas.

Actualización del 16-oct-2026: [27 — Ajustes de Investigación y respuesta a doce observaciones](27_AJUSTES_INVESTIGACION_2026_10_16.md). Incluye trazabilidad de los ocho ajustes, límites de activación, contratos y configuración pendiente.

Actualización integrada de la demo: [20 — Catálogo, cobertura, radicación y supervisión](20_DEMO_INTEGRADA_CATALOGO_COBERTURA_Y_SUPERVISION.md).

Validación documental de Víctimas (8-oct-2026): [23 — Procedimiento, formatos y requisitos integrados](23_VALIDACION_DOCUMENTAL_VICTIMAS_2026_10_08.md). Incluye respuestas escritas, F171, conflictos de plazo/cobertura y cambios exclusivos de Víctimas.

Fecha de corte: 1 de septiembre de 2026  
Estado: propuesta para validación funcional; no constituye aprobación del área.

## Nombre recomendado

**SIGIP-DP — Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo.**

El nombre cubre el ciclo completo —solicitud, validación, reparto, ejecución, entrega, ampliaciones, trazabilidad y reportes— y no limita el producto a “misiones de trabajo”. Antes de adoptarlo debe verificarse la disponibilidad del nombre dentro de la entidad.

Alternativas:

1. **SIGAP-DP:** Sistema Integral de Gestión de Apoyos Investigativos y Periciales.
2. **SIAIP-DP:** Sistema de Información de Apoyo Investigativo y Pericial.
3. **Gestión Técnica para la Defensa:** nombre descriptivo sin sigla obligatoria.

## Conclusión ejecutiva

La solución debe ser **un solo sistema con un núcleo compartido y dos flujos separados**:

- **Investigación:** asignación de misiones de trabajo a investigadores o especialistas.
- **Representación Judicial de Víctimas:** asignación de actividades periciales a peritos psicólogos o administrativos/financieros.

No conviene construir dos aplicaciones independientes, porque comparten identidad, roles, catálogos, solicitudes, documentos, asignaciones, alertas, auditoría y reportes. Tampoco conviene forzar un único flujo: los puntos de aprobación, criterios de reparto, datos del caso, ampliaciones y cierre son diferentes.

El flujo general de atención a víctimas presentado en IRIS el 12 de agosto es un **proceso relacionado**, pero no es el flujo de reparto de peritos. No debe copiarse dentro de SIGIP-DP ni utilizarse para inferir reglas del reparto sin confirmación.

## Estado real de las versiones revisadas

- **Repositorio GitHub:** compila y su API inicia, pero es un MVP técnico de Investigación. Guarda la información en memoria, no tiene base de datos y no ejecuta un reparto automático real.
- **HTML adjunto:** representa más escenarios e incluye un bosquejo de Víctimas, pero es una simulación con datos y reglas codificados en el mismo archivo.
- **Diccionario unificado:** es una buena base para el diseño de datos, pero contiene valores y decisiones todavía pendientes de aprobación.
- **Reglas de negocio previas:** son útiles como línea base de Investigación, aunque presentan contradicciones con el diccionario y las reuniones.
- **32 historias de usuario:** fueron revisadas completas. Tienen fecha interna 13-jul-2026, modificación posterior a la socialización del 14-jul y campos de aprobación vacíos. Son línea base de requerimientos, no evidencia de aceptación formal.

Por tanto, **ninguna fuente aislada debe declararse “la última versión funcional”**. La línea base debe formarse con decisiones trazables y su estado de validación.

## Archivos del paquete

| Archivo | Uso |
|---|---|
| `01_DIAGNOSTICO_Y_DECISION_DE_ENFOQUE.md` | Cronología, comparación de versiones, brechas y arquitectura funcional propuesta. |
| `02_REGLAS_DE_NEGOCIO_SIGIP_DP.md` | Reglas comunes y reglas separadas de Investigación y Víctimas, con nivel de certeza. |
| `03_PLAN_DE_IMPLEMENTACION_PARA_CODEX.md` | Orden de trabajo técnico, arquitectura, pruebas y criterios de terminación. |
| `04_GUIA_DE_LEVANTAMIENTO.md` | Preguntas, talleres y datos que deben solicitarse a ambos grupos. |
| `05_BACKLOG_MVP_PROPUESTO.md` | Épicas, historias técnicas/funcionales y alcance de versiones. |
| `06_MATRIZ_TRAZABILIDAD_32_HU.md` | Revisión historia por historia, contradicciones, cobertura y ajustes requeridos. |
| `14_BRECHAS_FUNCIONALES_Y_RACI.md` | Brechas consolidadas, RACI vigente y perfiles propuestos que permanecen inactivos. |
| `17_CONTRATO_FUNCIONAL_PRE_ORACLE.md` | Contrato ejecutable del cierre funcional previo al diseño Oracle. |
| `../decisions/README.md` | Registro central de decisiones funcionales pendientes y comportamiento seguro. |
| `AGENTS.md` | Instrucciones para colocar en la raíz del repositorio y orientar a Codex. |

## Pendiente documental

Las 32 HU ya fueron revisadas. Al corte original, faltaba:

1. `Socialización avance herramienta tecnológica para reparto de misiones de trabajo-20260714_090338-Grabación de la reunión(3).mp4`.

La transcripción parcial de esa reunión sí fue revisada. Las HU parecen haber sido modificadas después de la socialización, pero sus aprobaciones están vacías; el video completo todavía puede aportar el contexto de los cambios.

Actualización del 7-oct-2026: el video del 14 de julio, los demás videos, el ZIP y las 32 HU originales están disponibles en `Documentos Fuente`. Su inventario no constituye revisión integral ni aprobación de nuevas reglas. La revisión focalizada del video y la obtención de fuentes controladas siguen pendientes. El estado técnico actual y sus verificaciones se describen en `18_ANALISIS_DOCUMENTAL_Y_ESTADO_ACTUAL_2026_10_07.md`.

Actualización del 8-oct-2026: se procesó el audio completo de la reunión de reparto de peritos del 23-jul mediante transcripción automática local y se revisaron capturas de la pantalla compartida. El [análisis 22](22_ANALISIS_VIDEO_REPARTO_PERITOS_2026_10_08.md) distingue el HTML histórico de la aplicación actual, aporta referencias temporales aproximadas y registra incertidumbres adicionales sin aprobar reglas. Esta revisión no constituye visionado continuo ni revisión de los otros videos; la socialización de Investigación del 14-jul conserva su pendiente específico.

## Decisiones que no deben programarse todavía como constantes

- Límite de seis asignaciones activas en Investigación.
- Límite de cinco ampliaciones en Víctimas.
- Plazo de 40 días hábiles en Víctimas.
- Anticipación obligatoria de 45 días hábiles respecto de la audiencia.
- Cobertura de las peritas de Atlántico: departamento o región Caribe.
- Posibilidad de solicitar simultáneamente peritaje psicológico y financiero.
- Punto exacto que separa una modificación de una ampliación.
- Participación definitiva de PAG central, administrador regional y defensor regional en Víctimas.

Estas decisiones deben modelarse como parámetros o permanecer bloqueadas mediante una decisión funcional pendiente.

- [Actuaciones y entrega documental](21_ACTUACIONES_Y_ENTREGA_DOCUMENTAL_2026_10_07.md): PDF, SharePoint, versiones y comprobación de flujos.
- [Ajuste de interfaz institucional](35_AJUSTE_INTERFAZ_INSTITUCIONAL.md): textos, tipografía, superficies y detalle centrado, sin cambios de reglas operativas.
- [Análisis de la reunión de reparto de peritos del 23-jul](22_ANALISIS_VIDEO_REPARTO_PERITOS_2026_10_08.md): aclaraciones sobre el HTML histórico, contraste con la demo actual y decisiones pendientes, con referencias temporales aproximadas.
