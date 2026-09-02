# Backlog propuesto para el MVP de SIGIP-DP

**Versión:** 0.9  
**Estado:** Propuesta para refinamiento  
**Propósito:** convertir el diagnóstico y las reglas de negocio en una secuencia de construcción verificable.

> Este backlog complementa y corrige las 32 historias revisadas. La correspondencia y los ajustes están documentados en `06_MATRIZ_TRAZABILIDAD_32_HU.md`; no deben conservarse criterios contradictorios solo por aparecer en la HU original.

## 1. Estrategia de entrega

| Incremento | Alcance | Resultado verificable |
|---|---|---|
| M0 — Línea base | Decisiones, catálogos, seguridad y modelo | Reglas parametrizadas y modelo migrable |
| M1 — Investigación | Solicitud, reparto, ejecución y aprobación | Misión de trabajo de punta a punta |
| M2 — Víctimas | Solicitud, aprobación previa, reparto y entrega | Peritaje individual o masivo de punta a punta |
| M3 — Operación | Documentos, notificaciones, auditoría e indicadores | Piloto controlado con trazabilidad |
| M4 — Integraciones | IRIS, SharePoint/correo y autenticación institucional | Interoperabilidad según disponibilidad institucional |

La recomendación es liberar M1 antes de completar M2, pero construir desde M0 el núcleo común y las extensiones por área. Así se obtiene valor temprano sin hipotecar el modelo de Víctimas.

## 2. Criterios globales de terminado

Una historia solo está terminada cuando:

1. tiene criterios de aceptación automatizados o evidencia reproducible;
2. aplica autorización en el servidor, no solo en la interfaz;
3. registra actor, fecha, estado anterior, estado nuevo y motivo cuando corresponda;
4. contempla el flujo feliz y los rechazos/transiciones inválidas;
5. no depende de datos en memoria para persistencia operativa;
6. usa parámetros o catálogos para reglas que el negocio pueda cambiar;
7. incluye migración o semilla controlada cuando modifica datos maestros;
8. conserva separación explícita entre Investigación y Víctimas.

## 3. Backlog priorizado

### Épica E00 — Gobierno funcional y línea base

#### HU-E00-01 — Registro de decisiones pendientes

**Como** líder funcional, **quiero** registrar cada decisión con responsable, fecha límite y evidencia, **para** evitar que supuestos terminen convertidos en reglas rígidas.

**Aceptación**

- Cada decisión tiene identificador, área, pregunta, opciones, responsable, estado y fuente.
- Una decisión pendiente no se presenta como regla aprobada.
- Las reglas afectadas pueden referenciar la decisión.

#### HU-E00-02 — Catálogos versionados

**Como** administrador funcional, **quiero** gestionar regionales, especialidades/peritajes, coberturas, leyes, delitos, grados y novedades, **para** cambiar la operación sin desplegar código.

**Aceptación**

- Los catálogos admiten vigencia desde/hasta y estado activo.
- No se elimina un valor ya usado; se inactiva.
- Los cambios quedan auditados.

#### HU-E00-03 — Parámetros de negocio con vigencia

**Como** administrador autorizado, **quiero** configurar límites, alertas y calendarios, **para** que las cifras por confirmar no queden codificadas.

**Aceptación**

- El valor aplicable se resuelve por área, tipo y fecha de la solicitud.
- El sistema conserva el valor que gobernó una asignación histórica.
- Cambiar un parámetro no reescribe casos cerrados.

### Épica E01 — Identidad, perfiles y alcance

#### HU-E01-01 — Autenticación y sesión segura

**Como** usuario institucional, **quiero** autenticarme y cerrar sesión de forma segura, **para** acceder únicamente a funciones autorizadas.

**Aceptación**

- Las credenciales no se almacenan en texto plano.
- El servidor valida identidad y expiración en cada operación protegida.
- El mecanismo permite sustituir autenticación local por SSO institucional.

#### HU-E01-02 — Roles y alcance de datos

**Como** administrador, **quiero** asignar roles por área y alcance territorial, **para** evitar permisos heredados indebidamente entre flujos.

**Aceptación**

- Un usuario puede tener más de un rol con vigencias independientes.
- El rol no es elegido libremente en la interfaz.
- El acceso a solicitudes y documentos se filtra en el servidor.

#### HU-E01-03 — Transferencia de responsable

**Como** coordinador, **quiero** transferir solicitudes activas cuando cambia el defensor o responsable, **para** conservar continuidad y trazabilidad.

**Aceptación**

- La transferencia no altera la identidad del caso ni su historial.
- Se registra origen, destino, motivo y actor autorizante.
- La visibilidad histórica se rige por una política explícita.

### Épica E02 — Núcleo común de solicitudes

#### HU-E02-01 — Radicar una solicitud

**Como** solicitante autorizado, **quiero** crear un caso y una solicitud con sus datos comunes, **para** iniciar el flujo correspondiente al área.

**Aceptación**

- El sistema genera un identificador interno único.
- Valida el identificador externo según el área: SPOA en Investigación o radicado en Víctimas.
- Impide duplicados conforme a una regla configurable y permite revisión de posibles coincidencias.

#### HU-E02-02 — Agregar uno o varios ítems técnicos

**Como** solicitante, **quiero** requerir una o varias especialidades o peritajes dentro de la solicitud, **para** no duplicar datos comunes del caso.

**Aceptación**

- Cada ítem tiene tipo, objetivo, término y estado propios.
- Una asignación corresponde a un ítem, no necesariamente a toda la solicitud.
- La combinación permitida de ítems depende del área y de reglas vigentes.

#### HU-E02-03 — Línea de tiempo y auditoría

**Como** usuario autorizado, **quiero** consultar la historia completa, **para** entender qué ocurrió sin depender de correos o mensajes externos.

**Aceptación**

- La línea de tiempo incluye decisiones, transiciones, reasignaciones, devoluciones y documentos.
- Las entradas no pueden editarse ni borrarse desde la operación ordinaria.
- La consulta respeta datos sensibles y alcance del usuario.

### Épica E03 — Motor de asignación

#### HU-E03-01 — Calcular candidatos elegibles

**Como** sistema, **quiero** excluir personas no elegibles antes de ordenar candidatos, **para** que el reparto cumpla especialidad, cobertura, vigencia y disponibilidad.

**Aceptación**

- La respuesta conserva razones de inclusión y exclusión.
- Las novedades vigentes se consideran por intervalo de fechas.
- Las reglas específicas del área se ejecutan mediante una estrategia separada.

#### HU-E03-02 — Ordenar y asignar de forma determinista

**Como** sistema, **quiero** seleccionar al candidato con menor carga comparable y aplicar desempates definidos, **para** producir un reparto explicable y repetible.

**Aceptación**

- Dadas las mismas entradas y versión de reglas, el resultado es el mismo.
- La transacción bloquea o revalida la carga para impedir dobles asignaciones concurrentes.
- Se almacena una instantánea de candidatos, métricas, regla y resultado.

#### HU-E03-03 — Simular sin asignar

**Como** PAG o coordinador autorizado, **quiero** ver el resultado previsto y su explicación sin modificar datos, **para** validar reglas durante el piloto.

**Aceptación**

- La simulación no cambia carga ni estado.
- La salida identifica la versión de reglas y los datos usados.
- El usuario no puede escoger arbitrariamente otro candidato desde la simulación.

#### HU-E03-04 — Reasignar con causal

**Como** rol autorizado, **quiero** reasignar un trabajo con motivo y soporte cuando aplique, **para** atender novedades sin perder trazabilidad.

**Aceptación**

- El sistema vuelve a evaluar elegibilidad y concurrencia.
- Registra asignación anterior, nueva, causal, observación, soporte y actor.
- La autorización y los soportes requeridos varían por área y causal.

### Épica E04 — Flujo de Investigación

#### HU-E04-01 — Capturar solicitud investigativa

**Como** defensor solicitante, **quiero** registrar SPOA, delito, competencia, grado, objetivos y especialidades, **para** solicitar una misión completa.

**Aceptación**

- El SPOA se valida según la longitud/formato confirmado.
- Los objetivos y anexos obligatorios se verifican antes de radicar.
- La selección de especialidades genera los ítems necesarios.

#### HU-E04-02 — Repartir misión a investigador

**Como** sistema, **quiero** aplicar la política vigente de especialidad, territorialidad, grado, novedad y carga, **para** asignar sin selección manual.

**Aceptación**

- El límite de carga se toma de parámetros vigentes, no de una constante.
- Una asignación sin candidato queda en cola con causa explícita y alerta.
- La política de grado aplicada es trazable.

#### HU-E04-03 — Gestionar ejecución y entrega

**Como** investigador, **quiero** aceptar, registrar avances, solicitar ajustes de término y entregar el informe, **para** completar la misión dentro del sistema.

**Aceptación**

- Solo se permiten transiciones válidas.
- La entrega exige los documentos y metadatos definidos.
- El calendario calcula vencimientos según la regla vigente.

#### HU-E04-04 — Aprobar o devolver informe

**Como** PAG de Investigación, **quiero** aprobar o devolver el informe con observaciones, **para** cerrar la misión con control técnico.

**Aceptación**

- Una devolución reabre la actividad correspondiente sin borrar versiones.
- La aprobación final libera la carga activa conforme a la regla.
- El solicitante recibe notificación del resultado.

### Épica E05 — Flujo de Víctimas

#### HU-E05-01 — Capturar solicitud pericial y víctimas

**Como** representante judicial, **quiero** registrar radicado, ley, audiencia, hechos, víctimas y peritajes requeridos, **para** sustentar la necesidad técnica.

**Aceptación**

- La solicitud soporta una o múltiples víctimas y núcleos familiares.
- Los datos comunes no se duplican por víctima ni por peritaje.
- El sistema advierte urgencia según audiencia y término configurado, sin inventar un umbral fijo.

#### HU-E05-02 — Aprobar, devolver o negar antes del reparto

**Como** PAG/supervisor de Víctimas, **quiero** revisar la solicitud antes de enviarla a un perito, **para** asegurar procedencia y suficiencia.

**Aceptación**

- Una devolución conserva borrador, anexos e historial.
- Solo una solicitud aprobada entra al motor de asignación.
- La decisión registra motivo, observaciones y actor.

#### HU-E05-03 — Repartir por tipo y cobertura

**Como** sistema, **quiero** asignar el peritaje según disciplina, cobertura territorial, restricción legal, disponibilidad y carga, **para** distribuirlo equitativamente.

**Aceptación**

- La cobertura se consulta en una matriz versionada, no por igualdad simple de regional.
- Las restricciones como atención exclusiva de una ley son datos vigentes.
- No se aplica automáticamente el umbral de Investigación.

#### HU-E05-04 — Gestionar solicitudes masivas

**Como** representante judicial, **quiero** cargar y validar múltiples víctimas o hechos, **para** tramitar casos masivos sin digitación repetitiva.

**Aceptación**

- Existe plantilla versionada, validación previa y reporte de errores por fila.
- La importación es idempotente y evita duplicados.
- El sistema muestra el impacto antes de confirmar.

#### HU-E05-05 — Registrar improcedencia

**Como** perito, **quiero** sustentar una improcedencia con documento y causal, **para** comunicar formalmente por qué el encargo no continúa.

**Aceptación**

- La causal y el soporte son obligatorios.
- La decisión se notifica al solicitante y queda en la línea de tiempo.
- El efecto sobre carga y cierre está parametrizado.

#### HU-E05-06 — Entregar F171 y cerrar

**Como** perito, **quiero** cargar la versión final del F171 y completar el encargo, **para** que el representante judicial lo consulte y descargue.

**Aceptación**

- No se completa sin el documento obligatorio.
- El flujo ordinario no exige aprobación final del PAG de Víctimas.
- Se registra descarga o acceso según política de auditoría.

#### HU-E05-07 — Solicitar ajuste y conservar versiones

**Como** representante judicial, **quiero** pedir un ajuste sobre el producto, **para** corregirlo sin perder la versión originalmente entregada.

**Aceptación**

- Cada nueva entrega incrementa versión y referencia la solicitud de ajuste.
- La versión anterior permanece inmutable y consultable según permisos.
- El estado y la carga se recalculan con una regla explícita.

#### HU-E05-08 — Crear ampliación vinculada

**Como** representante judicial, **quiero** solicitar una ampliación asociada al encargo original, **para** atender nueva información con continuidad técnica.

**Aceptación**

- Se conserva vínculo con la solicitud y asignación origen.
- Se asigna al mismo perito salvo excepción autorizada y documentada.
- Recibe un término completo según la regla vigente.
- El número máximo no se fija hasta que exista una decisión aprobada.

#### HU-E05-09 — Consolidar brigadas sin forzar solicitudes

**Como** coordinador, **quiero** importar resultados estadísticos de brigadas o acopios, **para** consolidar gestión sin convertir cada actividad de campo en un peritaje ordinario.

**Aceptación**

- El módulo usa una plantilla controlada y separa actividad estadística de asignación.
- Los datos se validan y pueden corregirse con auditoría.
- La definición del F170 y los indicadores se confirma antes del desarrollo final.

### Épica E06 — Documentos y comunicaciones

#### HU-E06-01 — Repositorio documental versionado

**Como** usuario autorizado, **quiero** cargar documentos con tipo, versión y relación al caso, **para** mantener una fuente institucional trazable.

**Aceptación**

- Se abstrae el proveedor de almacenamiento para integrar SharePoint sin acoplar el dominio.
- Se valida tamaño, extensión, hash y antivirus cuando esté disponible.
- Reemplazar un documento crea versión; no sobrescribe la anterior.

#### HU-E06-02 — Notificaciones transaccionales

**Como** usuario, **quiero** recibir avisos de los eventos que requieren acción, **para** cumplir términos sin depender de revisión manual.

**Aceptación**

- Las notificaciones se originan en eventos confirmados de negocio.
- Los reintentos no duplican mensajes.
- El sistema conserva estado de envío sin exponer contenido sensible innecesario.

### Épica E07 — Seguimiento, calidad y despliegue

#### HU-E07-01 — Bandejas y semáforos

**Como** usuario operativo, **quiero** consultar pendientes, vencimientos y alertas de mi alcance, **para** priorizar el trabajo.

**Aceptación**

- Los colores y rangos provienen de parámetros versionados.
- La bandeja muestra la causa de cada alerta.
- Los conteos coinciden con el detalle consultable.

#### HU-E07-02 — Indicadores diferenciados

**Como** líder, **quiero** indicadores comunes y específicos por área, **para** medir sin comparar magnitudes incompatibles.

**Aceptación**

- Se distinguen solicitudes, ítems, asignaciones, víctimas y productos.
- Cada indicador documenta fórmula, fuente y periodicidad.
- La extracción es reproducible para un corte histórico.

#### HU-E07-03 — Despliegue reproducible

**Como** equipo técnico, **quiero** construir y desplegar frontend, API y base de datos de forma reproducible, **para** disponer de ambientes comparables.

**Aceptación**

- Las migraciones se ejecutan de forma controlada.
- Los secretos no están en el repositorio.
- Existen comprobaciones de salud, logs estructurados y procedimiento de reversa.

## 4. Orden recomendado para Codex

1. E00 y modelo de datos base.
2. E01 y autorización real.
3. E02 y máquina de estados común.
4. E03 con pruebas unitarias, concurrencia y explicación.
5. E04 completo para el primer piloto.
6. E05-01 a E05-08 para el segundo piloto.
7. E06 y E07 en paralelo con cada incremento, no como cierre tardío.
8. E05-09 después de definir plantilla, F170 e indicadores.

## 5. Casos de aceptación de extremo a extremo

El MVP debe demostrar, como mínimo:

1. misión de Investigación con dos especialidades y asignaciones independientes;
2. devolución y aprobación final del informe investigativo;
3. solicitud de Víctimas devuelta antes de reparto y posteriormente aprobada;
4. peritaje masivo importado desde plantilla;
5. asignación territorial de perito explicable;
6. improcedencia con soporte y notificación;
7. F171 entregado, ajustado y versionado;
8. ampliación al mismo perito con término completo;
9. dos asignaciones simultáneas sin doble selección por carrera de concurrencia;
10. intento de transición o acceso no autorizado rechazado y auditado.

## 6. Dependencias de levantamiento

No deben cerrarse criterios numéricos hasta resolver, al menos:

- límite y fórmula de carga de Investigación;
- plazo, evento de inicio, pausas y prórrogas por área;
- cobertura exacta de peritos de Atlántico y nivel central;
- combinación de peritajes en una solicitud de Víctimas;
- regla para modificar la solicitud original frente a crear ampliación;
- límite o inexistencia de límite para ampliaciones;
- responsables de corrección administrativa y reasignación;
- semáforos e indicadores oficiales;
- política de brigadas, acopios y F170;
- integración y sistema maestro para usuarios, casos y documentos.
