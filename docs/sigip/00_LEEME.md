# Paquete de definición funcional — SIGIP-DP

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

Las 32 HU ya fueron revisadas. La única fuente que continúa sin estar disponible es:

1. `Socialización avance herramienta tecnológica para reparto de misiones de trabajo-20260714_090338-Grabación de la reunión(3).mp4`.

La transcripción parcial de esa reunión sí fue revisada. Las HU parecen haber sido modificadas después de la socialización, pero sus aprobaciones están vacías; el video completo todavía puede aportar el contexto de los cambios.

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
