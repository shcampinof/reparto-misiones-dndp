# Diagnóstico, trazabilidad y decisión de enfoque

## 1. Criterio de precedencia de fuentes

La fecha de creación no es suficiente para establecer cuál documento manda. Al descargar, convertir o exportar un archivo, la fecha puede reiniciarse. Para resolver contradicciones se propone este orden:

1. Procedimiento, formato o acto institucional vigente y aprobado.
2. Historia de usuario aceptada con criterios de aceptación y versión identificable.
3. Decisión explícita de responsables funcionales en reunión, con fecha y marca de tiempo.
4. Respuesta oficial o matriz de datos entregada por el área.
5. Diccionario/modelo de datos y reglas consolidadas.
6. Prototipo HTML.
7. Código actual.
8. Resumen o transcripción automática sin validación humana.

Una fuente posterior solo reemplaza otra si registra una decisión de cambio; no basta con que el archivo sea más nuevo.

## 2. Cronología reconstruida

| Fecha | Fuente | Lectura correcta | Confiabilidad temporal |
|---|---|---|---|
| 14-jul-2026 | Socialización de Investigación | Explicación y comentarios al prototipo de misiones. Solo estuvo disponible una transcripción parcial. | Media; falta el video. |
| 14-jul-2026 19:37–21:07 COT | Última modificación de las 32 HU | Línea base de 32 historias con fecha interna 13-jul. Las fechas de creación OOXML son idénticas —20-mar— por reutilización de plantilla y no representan la redacción real. Los campos de aprobación están vacíos. | Alta para contenido y modificación; media como decisión no aprobada. |
| 23-jul-2026 09:05 COT | Video de propuesta de reparto de peritos | Primera explicación extensa de cómo adaptar el prototipo de Investigación a Víctimas. El audio se reconstruyó en una transcripción de trabajo. | Alta para lo dicho; varias decisiones quedaron abiertas. |
| 7-ago-2026 15:44 UTC | `Diccionario_y_Explicacion_Modelo_Datos` | Modelo Oracle unificado y resumen de respuestas posteriores del área. | Alta para la fecha del archivo; media para decisiones no acompañadas de fuente aprobatoria. |
| 12-ago-2026 08:36 COT | Presentación de flujos de Víctimas en IRIS | Flujo general de atención/representación: Víctimas general, Justicia y Paz y Restitución. No es el reparto de peritos. | Alta. |
| 1-sep-2026 | Documento exportado de la sesión del 12-ago | Transcripción de Teams; su fecha de creación corresponde a la exportación, no a la reunión. | Baja como fecha de contenido. |
| 1-sep-2026 13:51 COT | Único commit del repositorio GitHub | Implementación React + Express enfocada en Investigación. | Alta para el código versionado; no prueba madurez funcional. |
| Sin metadato intrínseco verificable | HTML adjunto | Prototipo monolítico con Investigación y una simulación de Víctimas. | Indeterminada; se evalúa por contenido. |

## 3. Qué implementa cada versión

| Capacidad | GitHub React/Express | HTML adjunto | Diccionario/modelo |
|---|---:|---:|---:|
| Investigación | Parcial y ejecutable | Prototipo amplio | Modelada |
| Víctimas/peritos | No | Prototipo simulado | Modelada |
| Solicitud madre y varios servicios | Parcial: varios radicados de Investigación | Selección múltiple en Investigación; uno en Víctimas | No queda suficientemente normalizado |
| Persistencia | No; arreglos en memoria | No; arreglos JavaScript | Oracle propuesto |
| Reparto automático | No; la interfaz escoge un candidato y la API acepta el ID | Simulación por filtros incompletos | Reglas descritas, sin ejecución |
| Gestión documental | Referencias simuladas | Controles de archivo sin almacenamiento | Rutas SharePoint y versiones propuestas |
| Notificaciones | Textos simulados | Mensajes en pantalla | Cola de alertas propuesta |
| Auditoría | Historial parcial en memoria | Observaciones de muestra | Historial de estados propuesto |
| Seguridad institucional | Usuarios demo y JWT local | Selector de rol visible | No definida |
| Pruebas automatizadas | No | No | No aplica |

### Lectura de las 32 historias de usuario

Las HU confirman el enfoque de una plataforma con contexto de área, autenticación institucional, catálogos, bandejas, reparto, ejecución, aprobación diferenciada, semáforos y reportes. También confirman la diferencia esencial: Víctimas aprueba antes del reparto e Investigación aprueba la entrega.

El conjunto contiene 7 HU identificadas como Investigación, 6 como Víctimas y 19 transversales. Todas registran al GID como solicitante, incluidas las de Víctimas; por ello estas últimas no pueden considerarse validadas por el grupo de Víctimas. De las 32, 14 se mantienen, 14 requieren ajuste y 4 deben replantearse.

No deben implementarse literalmente porque incluyen supuestos que fuentes posteriores contradicen:

- 15 regionales frente a 34 informadas en el diccionario;
- 25/45 días hábiles para Investigación frente a referencias a días calendario;
- 40 días hábiles y anticipación obligatoria de 45 días para Víctimas;
- límite de seis y comparación por “misma regional” para peritos;
- Administrador Regional como revisor común de las dos áreas;
- override manual sin restricción de regional ni grado;
- un wizard de Víctimas sin múltiples víctimas, carga masiva, improcedencia, F-171 ni versiones.

La revisión completa está en `06_MATRIZ_TRAZABILIDAD_32_HU.md`.

## 4. Hallazgos del repositorio

El frontend compila y el servicio `/api/health` responde. El inicio de sesión demo también funciona. Esto permite usar el repositorio como punto de partida técnico, pero no como versión productiva.

Brechas críticas:

1. Los datos se pierden al reiniciar el backend.
2. El supuesto reparto automático no calcula candidatos en servidor: no valida especialidad, regional, grado, novedad, capacidad ni concurrencia antes de asignar.
3. No existe módulo de Víctimas.
4. No hay transacciones ni control de concurrencia; dos solicitudes podrían asignarse con la misma lectura de carga.
5. Los días se suman como calendario; no existe motor de días hábiles ni calendario institucional.
6. El flujo de entrega de Investigación queda incompleto: registra `informe_entregado`, pero no materializa claramente la revisión y cierre por PAG.
7. No hay actualización de solicitudes devueltas, reportes de problema, sustituciones, novedades administrativas ni documentos reales.
8. Las credenciales demo, el secreto JWT por defecto y la selección de cuenta son adecuados solo para demostración.
9. GitHub Pages publica únicamente el frontend; sin un backend desplegado, la versión en Internet no es funcional.
10. No hay pruebas unitarias, de API, de reglas ni de extremo a extremo.

## 5. Hallazgos del HTML

El HTML es más rico como referencia visual: incluye selector de área, roles, bandejas, dashboards, catálogos, correcciones, novedades y un wizard de Víctimas. Sin embargo, no debe trasladarse literalmente al repositorio.

Reglas o datos que no deben copiarse sin validación:

- Usa el umbral `MISSION_THRESHOLD = 6` también para Víctimas, aunque la reunión pidió cargas parejas sin confirmar un límite fijo.
- Fija 40 días hábiles para Víctimas; la reunión mencionó 30 hábiles o 45 calendario conforme al procedimiento y reconoció incumplimientos operativos.
- Exige 45 días hábiles antes de audiencia sin una decisión confirmada.
- Limita Víctimas a un solo tipo de peritaje por solicitud, aunque se habló de solicitudes financiera y psicológica para un mismo caso.
- Filtra peritos por igualdad de regional, no por una matriz de cobertura territorial.
- Mantiene mensajes y campos de justificación firmada por Defensor Regional para reasignaciones de Investigación, pese a que la socialización pidió eliminar esa intervención.
- Contiene 20 investigadores y 8 peritos de muestra; el diccionario informa 193 y 12 respectivamente.
- Las acciones importantes terminan en un `toast`; no cambian siempre el estado ni persisten evidencia.

Elementos que sí deben rescatarse como referencia de experiencia:

- Selector de área dentro de una misma plataforma.
- Catálogo contextual por área.
- Bandejas diferenciadas por rol.
- Aprobación previa del PAG en Víctimas y aprobación de entrega en Investigación.
- Reporte de problemas por el ejecutor sin edición directa de la solicitud.
- Visualización de historial, documentos, alertas y carga.
- Administración diferenciada de catálogos de Investigación y Víctimas.

## 6. Separación de procesos

### 6.1 Investigación

Objeto principal: **misión de trabajo** solicitada por un defensor para apoyar la defensa penal. Puede requerir una o varias especialidades. Cada especialidad necesita asignación, plazo, ejecutor y seguimiento independiente.

### 6.2 Víctimas — reparto de peritos

Objeto principal: **solicitud de actividad pericial** de un representante judicial de víctimas. Puede involucrar múltiples víctimas y núcleos familiares, leyes diferentes, cobertura territorial, peritaje psicológico y/o administrativo-financiero, informes F-171 y actualizaciones posteriores.

### 6.3 Víctimas — flujo general IRIS

Objeto principal: atención, orientación y representación judicial de víctimas. Incluye creación del caso, aval, reparto a defensor, aceptación, actuaciones y sustituciones. Ya se mostró sobre IRIS y abarca Víctimas general, Justicia y Paz y Restitución de Tierras.

Este tercer proceso puede compartir identificadores o consultarse mediante integración futura, pero está fuera del alcance inicial de reparto de peritos. Incluirlo dentro del mismo backlog sin una decisión de alcance duplicaría funciones de IRIS.

## 7. Arquitectura funcional recomendada

Se recomienda un **monolito modular** para la primera versión: un despliegue, una API y una base Oracle, con límites de módulo claros. Es más simple de operar que microservicios y permite separar las reglas.

### Núcleo compartido

- Identidad, autenticación y perfiles.
- Áreas, roles y permisos contextualizados.
- Personas, funcionarios, regionales y cobertura.
- Casos y solicitudes.
- Ítems de servicio solicitados.
- Asignaciones y carga.
- Estados e historial.
- Documentos, versiones y referencias de almacenamiento.
- Alertas/notificaciones.
- Parámetros, calendarios y catálogos.
- Auditoría y reportes.

### Módulo Investigación

- SPOA, delito, competencia, etapa, hipótesis y labores.
- Especialidades investigativas/periciales.
- Política de reparto por especialidad, cobertura/regional, competencia/grado, disponibilidad y carga.
- Revisión de entrega por PAG.

### Módulo Víctimas

- Radicado, ley, hecho victimizante, víctimas directas/indirectas y parentesco.
- Peritajes psicológico y administrativo/financiero.
- Política de reparto por especialidad, cobertura, ley, disponibilidad y carga.
- Improcedencia, ampliaciones al mismo perito, informe F-171 y actualización versionada.
- Importación estadística de brigadas/acopio como canal separado.

### Corrección necesaria al modelo conceptual

El núcleo no debería guardar “una fila por solicitud con una sola especialidad” como única unidad. Debe separar:

1. `CASO`: identidad jurídica y contexto estable.
2. `SOLICITUD`: radicación del defensor/RJV y conjunto de datos compartidos.
3. `ITEM_SOLICITUD`: cada especialidad o peritaje requerido.
4. `ASIGNACION`: ejecutor, política, fecha, plazo y reasignaciones del ítem.
5. `PERSONA_SOLICITUD`: procesado, víctima directa o víctima indirecta.

Así, una misión con balística y campo genera dos ítems; una solicitud de Víctimas con psicología y financiera también puede generar dos ítems si el área lo aprueba, sin duplicar caso ni víctimas.

## 8. Estrategia de producto

La construcción debe avanzar en verticales:

1. Cerrar decisiones y etiquetar la línea base.
2. Implementar núcleo común y persistencia.
3. Completar Investigación, porque tiene mayor madurez y 32 HU existentes.
4. Implementar una vertical de Víctimas con un caso simple y un caso masivo.
5. Añadir documentos, notificaciones, ampliaciones, improcedencia y brigadas.
6. Ejecutar pruebas de aceptación por área y seguridad antes de producción.

Una sola plataforma no significa un único formulario ni un único estado. Cada pantalla y transición debe identificar el área y aplicar su política.

## 9. Decisiones de arquitectura pendientes

- Plataforma institucional permitida para backend y hosting.
- Autenticación: Entra ID/Directorio Activo u otro proveedor institucional.
- Oracle disponible, versión, esquemas y ambientes.
- SharePoint/SGDEA/IRIS: integración automática, enlace o carga manual.
- Servicio de correo y política de reintentos.
- Clasificación, retención y acceso a informes psicológicos/financieros.
- Fuente maestra de funcionarios, defensores, regionales y novedades.
- Estrategia de migración de datos históricos y archivos Excel.
