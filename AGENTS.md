# Instrucciones de desarrollo para SIGIP-DP

Este archivo está preparado para copiarse a la raíz del repositorio. Su objetivo es mantener a Codex y a las personas desarrolladoras alineadas con el alcance funcional consolidado.

## Contexto del producto

SIGIP-DP es el **Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo**. Integra capacidades comunes, pero conserva dos flujos de negocio distintos:

- **Investigación:** asignación de misiones de trabajo a investigadores. La revisión/aprobación técnica principal ocurre con la entrega del informe.
- **Víctimas:** asignación de peritajes financieros o psicológicos. La aprobación del PAG/supervisor ocurre antes del reparto; la entrega ordinaria del F171 no debe heredar automáticamente una aprobación final.

El flujo general de representación judicial de Víctimas mostrado en IRIS es un proceso relacionado, no el flujo de reparto de peritos. No lo duplique dentro de este sistema sin una decisión explícita de integración.

## Lectura obligatoria antes de cambiar código

Revise, en orden:

1. `00_LEEME.md`;
2. `01_DIAGNOSTICO_Y_DECISION_DE_ENFOQUE.md`;
3. `02_REGLAS_DE_NEGOCIO_SIGIP_DP.md`;
4. `03_PLAN_DE_IMPLEMENTACION_PARA_CODEX.md`;
5. `04_GUIA_DE_LEVANTAMIENTO.md`;
6. `05_BACKLOG_MVP_PROPUESTO.md`.
7. `06_MATRIZ_TRAZABILIDAD_32_HU.md`.

Las reglas marcadas **P** son pendientes y no deben tratarse como aprobadas. Las reglas marcadas **D** son decisiones de diseño propuestas y deben validarse si alteran el proceso institucional.

## Invariantes del dominio

1. Una plataforma no significa un único flujo de estados.
2. Modele por separado `CASO`, `SOLICITUD`, `ITEM_SOLICITUD`, `ASIGNACION`, `PERSONA_SOLICITUD` y `DOCUMENTO`.
3. Un caso puede tener varias solicitudes; una solicitud puede tener varios ítems; cada ítem puede tener su propia asignación.
4. Investigación y Víctimas comparten servicios transversales, pero implementan estrategias separadas para validación, aprobación, elegibilidad, reparto, plazos y cierre.
5. Ningún usuario selecciona libremente investigador o perito. Toda excepción o reasignación exige autorización, causal y auditoría.
6. Toda transición de estado se valida en el servidor y se registra de forma inmutable.
7. Toda asignación conserva la explicación del reparto: candidatos, exclusiones, métricas, desempate y versión de reglas.
8. Toda sustitución documental crea una nueva versión; no sobrescriba ni borre la anterior.
9. En Víctimas, las ampliaciones se vinculan al encargo original y se dirigen al mismo perito, salvo excepción autorizada.
10. Brigadas y acopios son, por ahora, gestión estadística separada del reparto ordinario.

## Cifras que no se deben codificar como constantes

No convierta en regla fija hasta aprobación funcional:

- máximo de 6 asignaciones;
- máximo de 5 ampliaciones;
- plazo general de 40 días hábiles;
- anticipación de 45 días hábiles frente a audiencia;
- rangos específicos de semáforos;
- equivalencia exacta o mínima del grado del investigador;
- cobertura de Atlántico como departamento o como región Caribe;
- número único de peritajes permitidos por solicitud.

Use parámetros versionados con vigencia, área y evidencia de aprobación.

## Arquitectura esperada

Mantenga inicialmente un monolito modular desplegable:

- `core`: identidad, autorización, casos, solicitudes, documentos, auditoría, notificaciones y calendarios;
- `investigacion`: reglas y estados propios;
- `victimas`: reglas y estados propios;
- `assignment`: motor común con estrategias por área;
- `reporting`: lecturas e indicadores sin lógica transaccional duplicada;
- `integrations`: adaptadores para SSO, IRIS, SharePoint y correo.

No introduzca microservicios salvo que exista una necesidad operativa medida y aprobada. Las fronteras modulares sí son obligatorias.

## Persistencia y transacciones

- No use arreglos en memoria como persistencia fuera de pruebas o demostraciones desechables.
- Agregue migraciones reproducibles y restricciones de integridad.
- Proteja el reparto frente a concurrencia mediante bloqueo, control optimista o una estrategia transaccional equivalente.
- Use una bandeja de salida transaccional para notificaciones si el mensaje depende de una operación confirmada.
- Preserve fechas en UTC y zona institucional al presentar/calcular según la política aprobada.
- Modele días hábiles con calendario configurable; sumar días calendario no es equivalente.

## Seguridad y privacidad

- Autorice cada operación y consulta en la API; ocultar un botón no es control de acceso.
- Nunca incluya contraseñas, secretos, tokens o llaves reales en el repositorio.
- No registre en logs narraciones sensibles, datos completos de víctimas ni contenido de documentos.
- Valide tipo, tamaño e integridad de archivos; conecte análisis antimalware cuando el entorno lo permita.
- Trate la información de víctimas con mínimo privilegio y trazabilidad de acceso.
- Las cuentas de demostración y JWT por defecto del prototipo no son aceptables para piloto institucional.

## Reglas de implementación

- Prefiera máquinas de estado explícitas a cambios de estado dispersos.
- Prefiera objetos de valor y validadores de dominio para SPOA, radicado, términos y cobertura.
- Prefiera catálogos y parámetros con vigencia a condicionales con nombres o cifras.
- No compare cobertura únicamente con `regional_id`; consulte la matriz territorial vigente.
- No aplique el umbral o los estados de Investigación al flujo de Víctimas.
- No represente éxito únicamente con un `toast`; debe existir una operación persistida y confirmada.
- No confíe en un investigador/perito enviado por el cliente. El servidor calcula y valida el resultado.
- Mantenga la interfaz en español y los nombres técnicos consistentes en un glosario.

## Pruebas obligatorias

Para toda regla nueva o modificada, cubra:

- transición válida e inválida;
- autorización permitida y denegada;
- vigencia de parámetros y catálogos;
- elegibilidad y motivo de exclusión;
- desempate determinista;
- dos solicitudes concurrentes sobre el mismo candidato;
- vencimiento en fin de semana, festivo y cambio de vigencia;
- reintento idempotente de carga, notificación o integración;
- versionado de documentos y conservación del historial;
- separación entre casos de Investigación y Víctimas.

Agregue pruebas de contrato para integraciones y pruebas de extremo a extremo para los casos enumerados en `05_BACKLOG_MVP_PROPUESTO.md`.

## Disciplina de cambios

Antes de implementar:

1. identifique la regla de negocio y su estado C/B/D/P;
2. indique la fuente o decisión que respalda el cambio;
3. declare si afecta solo un área o el núcleo común;
4. actualice esquema, pruebas, API y documentación en el mismo cambio;
5. registre cualquier nueva incertidumbre en la matriz de decisiones.

Al finalizar, informe:

- archivos y módulos modificados;
- migraciones creadas;
- reglas afectadas;
- pruebas ejecutadas y resultado;
- supuestos que siguen pendientes;
- pasos manuales de despliegue o configuración.

## Restricciones del estado actual

El repositorio de referencia compila, pero su API conserva datos en memoria y el frontend simula parte del reparto. Trátelo como prototipo de interacción, no como fuente definitiva del dominio ni como base lista para producción. Preserve lo útil de la interfaz, pero reemplace progresivamente la persistencia, autorización y lógica de asignación con componentes verificables.

Las 32 historias de usuario ya fueron revisadas y sus campos de aprobación están vacíos. No implemente literalmente sus cifras o roles cuando `06_MATRIZ_TRAZABILIDAD_32_HU.md` los marque para ajuste o replanteamiento. El video completo de socialización de Investigación todavía no estuvo disponible; cualquier nueva decisión obtenida de él deberá incorporarse con trazabilidad.
