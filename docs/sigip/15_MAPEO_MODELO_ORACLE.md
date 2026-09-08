# Mapeo del modelo Oracle y persistencia dual — SIGIP-DP

**Fecha de corte:** 8 de septiembre de 2026  
**Estado:** propuesta técnica de primera fase; no autoriza cambios en Oracle institucional  
**Fuente funcional obligatoria:** [`14_BRECHAS_FUNCIONALES_Y_RACI.md`](14_BRECHAS_FUNCIONALES_Y_RACI.md)

## 1. Alcance y fuentes

Este documento contrasta el código integrado en `97927fc`, las reglas consolidadas, el backlog, la trazabilidad de HU-01 a HU-32, las brechas/RACI y el modelo ER recibido en:

`Documentos Fuente/Diagrama ER - Modelo de Datos (standalone).html`

El HTML se inspeccionó localmente; no se copió a una ruta pública ni se agregó a Git. El inventario describe sus entidades, pero no reproduce literalmente su tabla central de solicitudes. La HU-33 no tiene fuente verificable y no aporta requisitos a este mapeo.

La fase implementa un único código con puertos de repositorio y dos adaptadores:

- `presentation + sqlite`: persistencia local reiniciable con información ficticia reproducible;
- `institutional + oracle`: `node-oracledb` en modo Thin, pool, transacciones y readiness real.

No se ejecutó DDL contra Oracle ni se habilitaron identidades o documentos institucionales.

## 2. Inventario del modelo recibido

El diagrama contiene 28 entidades, agrupadas así:

| Grupo | Entidades recibidas | Lectura |
|---|---|---|
| Áreas, acceso y estados | `AREAS`, `ROLES`, `ROL_AREA`, `ESTADOS`, `ESTADO_AREA` | Define catálogos, pero no representa vigencia de perfiles ni alcance territorial por usuario. |
| Territorio y servicios | `REGIONALES`, `LEYES`, `ESPECIALIDADES`, `ESPECIALIDAD_DETALLE`, `DELITOS`, `HECHOS_VICTIMIZANTES`, `FORMATOS` | Mezcla catálogos con cifras/plazos pendientes. La descripción de regionales fija 34, en contradicción con referencias a 15 y 42. |
| Personas que actúan | `FUNCIONARIOS`, `FUNCIONARIO_ESPECIALIDAD`, `FUNCIONARIO_LEY`, `FUNCIONARIO_COBERTURA`, `DEFENSORES` | Separa funcionarios y defensores, pero no una identidad con varios roles, áreas, alcance y vigencia. |
| Trazabilidad y documentos | `HISTORIAL_ESTADOS`, `OBSERVACIONES`, `ANEXOS`, `ALERTAS`, `REPORTES_PROBLEMA`, `IMPROCEDENCIAS` | Aporta historial y referencias documentales, aunque los vincula principalmente al registro central y no al ítem/producto específico. |
| Núcleo transaccional | `SOLICITUDES` | Concentra datos de caso, radicación, servicio, reparto, plazo, progreso, ampliación y entrega. Esa concentración no se traslada al objetivo. |
| Víctimas y productos | `SOLICITUD_VICTIMAS`, `LIQUIDACIONES` | Admite varias personas, pero parentesco y producto requieren entidades y versiones propias. |
| Gestión estadística separada | `BRIGADAS`, `BRIGADA_ATENCIONES` | Se conserva fuera del reparto ordinario hasta una decisión de alcance. |

Hallazgos estructurales:

1. el modelo recibido tiene valor como inventario de datos, no como DDL aprobado;
2. las relaciones convergen en exceso sobre la entidad central;
3. no existe una instantánea descompuesta de decisión, candidatos y exclusiones;
4. historial de estado, asignación y versiones documentales necesitan inmutabilidad explícita;
5. plazos incluidos en especialidades deben migrar a parámetros versionados, no a constantes;
6. cobertura territorial no puede reducirse a igualdad de regional;
7. una solicitud de Víctimas no puede reducirse a una persona, un peritaje o una asignación.

## 3. Correspondencia recibido → objetivo

| Origen | Objetivo | Clasificación | Tratamiento |
|---|---|---|---|
| `AREAS` | `SIGIP_AREA` | requiere ampliación | Agrega estado y periodo de vigencia. Investigación y Víctimas siguen siendo flujos separados. |
| `ROLES`, `ROL_AREA` | `SIGIP_ROL`, `SIGIP_USUARIO_ROL` | requiere ampliación | Separa definición del rol de la autorización efectiva por usuario, área, alcance, regional y vigencia. |
| `ESTADOS`, `ESTADO_AREA` | catálogo/política de transición futura + `SIGIP_TRANSICION_ESTADO` | requiere ampliación | La transición ocurrida es append-only. Las máquinas de estado permanecen separadas por área. |
| `REGIONALES` | `SIGIP_REGIONAL`, `SIGIP_GEOGRAFIA`, `SIGIP_REGIONAL_GEOGRAFIA` | requiere ampliación | Elimina cualquier cantidad fija y permite catálogo oficial con vigencia. |
| `LEYES` | catálogo legal futuro | reutilizable con ampliación | Requiere código oficial, fuente, vigencia y auditoría. No se siembra información institucional en esta fase. |
| `ESPECIALIDADES` | `SIGIP_ESPECIALIDAD_SERVICIO` + `SIGIP_PARAMETRO` | requiere ampliación | El servicio se separa de plazo, tipo de día, carga y semáforo versionados. |
| `ESPECIALIDAD_DETALLE` | detalle configurable del servicio | reutilizable con ampliación | Se difiere su DDL hasta confirmar tipos y obligatoriedad. |
| `DELITOS` | catálogo de delito/competencia futuro | reutilizable con ampliación | La competencia y grado no habilitan todavía overrides manuales. |
| `HECHOS_VICTIMIZANTES` | catálogo de hechos + relaciones con servicio/ley | requiere ampliación | Evita fijar un único tipo de peritaje por hecho. |
| `FORMATOS` | catálogo documental futuro | reutilizable con ampliación | Debe vincular tipo documental y vigencia, no archivos físicos en Oracle. |
| `FUNCIONARIOS` | `SIGIP_USUARIO`, `SIGIP_USUARIO_ROL` | requiere transformación | La identidad institucional será externa; cargo, grado y estado no se confunden con credenciales. |
| `FUNCIONARIO_ESPECIALIDAD` | habilitación profesional/servicio futura | reutilizable con ampliación | Debe tener fuente, vigencia y evidencia. |
| `FUNCIONARIO_LEY` | habilitación legal futura | reutilizable con ampliación | Es un criterio de elegibilidad auditable. |
| `FUNCIONARIO_COBERTURA` | `SIGIP_COBERTURA_TERRITORIAL` | requiere ampliación | Referencia regional o geografía, inclusión/exclusión, prioridad y vigencia. |
| `DEFENSORES` | `SIGIP_USUARIO`, `SIGIP_USUARIO_ROL` | requiere transformación | Evita duplicar a una persona que pueda tener varios perfiles autorizados. |
| `HISTORIAL_ESTADOS` | `SIGIP_TRANSICION_ESTADO` | reutilizable con ampliación | Se vincula al ítem, conserva actor/rol/motivo/fecha y bloquea actualización o borrado. |
| `OBSERVACIONES` | motivo de transición, auditoría o entidad de comentario futura | requiere clasificación | No toda observación equivale a una transición. Debe definirse sensibilidad y retención. |
| `ANEXOS` | `SIGIP_DOCUMENTO`, `SIGIP_VERSION_DOCUMENTO` | requiere ampliación | Separa el documento lógico de cada versión, hash y referencia al almacén autorizado. |
| Entidad central recibida | `SIGIP_CASO`, `SIGIP_SOLICITUD`, `SIGIP_ITEM_SOLICITUD`, `SIGIP_ASIGNACION`, `SIGIP_PRODUCTO`, `SIGIP_AMPLIACION` | requiere descomposición | No se replica su forma. Cada concepto obtiene identidad, ciclo, versión e indicadores propios. |
| `ALERTAS` | `SIGIP_OUTBOX` + entrega/notificación futura | requiere ampliación | El evento transaccional no se pierde si falla el canal de correo. |
| `REPORTES_PROBLEMA` | incidencia operativa futura | reutilizable con ampliación | Debe distinguir incidencia del ítem, del producto o de una integración. |
| `IMPROCEDENCIAS` | transición/decisión + soporte documental | requiere ampliación | Conserva autor, causal, soporte y notificación sin convertirla en borrado. |
| `SOLICITUD_VICTIMAS` | `SIGIP_PERSONA_SOLICITUD`, `SIGIP_RELACION_PERSONA` | requiere descomposición | Soporta varias víctimas/personas, vínculos dirigidos y parentescos independientes. |
| `LIQUIDACIONES` | `SIGIP_PRODUCTO` + estructura especializada/versionada futura | requiere ampliación | Una actualización no sobrescribe el producto previo. |
| `BRIGADAS`, `BRIGADA_ATENCIONES` | módulo estadístico futuro | reutilizable fuera del reparto | No genera asignaciones ordinarias en esta fase. |

## 4. Modelo objetivo y cardinalidades

```text
CASO 1 ── n SOLICITUD 1 ── n ITEM_SOLICITUD 1 ── n ASIGNACION
                    │                │                    │
                    │                │                    └── n HISTORIAL_ASIGNACION
                    │                ├── n TRANSICION_ESTADO
                    │                ├── n DECISION_ASIGNACION
                    │                │       └── n CANDIDATO_DECISION
                    │                │               └── n EXCLUSION_CANDIDATO
                    │                └── n PRODUCTO ── 1 DOCUMENTO ── n VERSION_DOCUMENTO
                    └── n PERSONA_SOLICITUD ── n RELACION_PERSONA
```

La primera fase materializa:

- identidad y autorización: `AREA`, `ROL`, `USUARIO`, `USUARIO_ROL`;
- territorio y servicio: `REGIONAL`, `GEOGRAFIA`, `REGIONAL_GEOGRAFIA`, `ESPECIALIDAD_SERVICIO`, `COBERTURA_TERRITORIAL`;
- núcleo: `CASO`, `SOLICITUD`, `ITEM_SOLICITUD`, `PERSONA_SOLICITUD`, `RELACION_PERSONA`;
- reparto: `DECISION_ASIGNACION`, `CANDIDATO_DECISION`, `EXCLUSION_CANDIDATO`, `ASIGNACION`, `HISTORIAL_ASIGNACION`;
- trazabilidad: `TRANSICION_ESTADO`, `AUDITORIA`, `OUTBOX`;
- soporte del objetivo: `DOCUMENTO`, `VERSION_DOCUMENTO`, `PRODUCTO`, `AMPLIACION`, `TRANSFERENCIA_DEFENSOR`, `PARAMETRO`, `NOVEDAD`.

`SOLICITUD` e `ITEM_SOLICITUD` tienen versión optimista. Un índice único condicionado garantiza una sola asignación vigente por ítem. Reasignar exige cerrar la asignación vigente y agregar otra fila e historial dentro de una transacción. El resultado sin candidato permanece representable sin una asignación, mediante la decisión `SIN_CANDIDATO` y el estado `PENDIENTE_REASIGNACION` del ítem.

## 5. Migraciones creadas

| Versión | SQLite | Oracle | Contenido |
|---|---|---|---|
| `000` | `000_schema_version.sql` | `000_schema_version.sql` | Checksums y control de versión. |
| `001` | `001_identity_catalogs.sql` | `001_identity_catalogs.sql` | Identidad, roles, área, región, geografía, servicios y cobertura. |
| `002` | `002_cases_requests.sql` | `002_cases_requests.sql` | Caso, solicitud, varios ítems, personas y relaciones. |
| `003` | `003_assignments_transitions.sql` | `003_assignments_transitions.sql` | Decisión, candidatos, exclusiones, asignación, historial, transición y novedad. |
| `004` | `004_documents_products.sql` | `004_documents_products.sql` | Documentos/versiones, producto, ampliación y transferencia. |
| `005` | `005_parameters_audit_outbox.sql` | `005_parameters_audit_outbox.sql` | Parámetros versionados, auditoría y outbox. |
| `900` | `900_presentation_state.sql` | no aplica | Proyección JSON local exclusiva de la experiencia de presentación; no contiene información institucional. |

Las versiones `000` a `005` son equivalentes semánticamente. La `900` no forma parte del modelo institucional. Ninguna migración inserta regionales, plazos, límites de carga, roles propuestos ni datos reales.

## 6. Reutilización selectiva de `d1da1cf`

No se hizo cherry-pick del commit preservado.

Se reutilizaron y ajustaron:

- invariantes y constructores de dominio;
- separación de caso, solicitud, ítem, personas, asignación e historial;
- contratos de repositorio por frontera modular;
- repositorio en memoria como apoyo de pruebas, no como persistencia de ejecución;
- mapeador de la experiencia existente al modelo normalizado;
- auditoría con saneamiento de metadatos;
- conceptos de migraciones versionadas y estructuras append-only.

Se descartaron o reemplazaron:

- las máquinas de estados preservadas, porque agregaban `EN_REVISION` antes del reparto de Investigación sin responsable ni efecto bloqueante confirmados;
- el cherry-pick completo, porque partía de `4a50509` y podía revertir autorizaciones y recorridos corregidos en `97927fc`;
- `ALCANCE_USUARIO` como sustituto de la relación solicitada `USUARIO_ROL`;
- la explicación de reparto guardada solo como JSON, reemplazada por decisión, candidatos y exclusiones consultables;
- cobertura basada únicamente en regional, ampliada con geografía y vigencia;
- migraciones sin versión optimista o sin relaciones explícitas entre personas;
- documentación que no incorporaba `14_BRECHAS_FUNCIONALES_Y_RACI.md` ni la adenda funcional.

## 7. Riesgos de migración

| Riesgo | Efecto | Control propuesto |
|---|---|---|
| La entidad central mezcla varios conceptos | Duplicados, pérdida de historia o indicadores incompatibles | Migrar mediante tablas de correspondencia y reconciliar por caso/solicitud/ítem antes del corte. |
| Identificadores no son estables entre fuentes | Colisiones y vínculos erróneos | Conservar identificador legado, fuente y checksum en staging; no deduplicar automáticamente. |
| Referencias 15/34/42 regionales | Cobertura y reportes incorrectos | Exigir catálogo oficial versionado antes de cargar territorio. |
| Datos de persona sensibles o incompletos | Riesgo de privacidad y falsos parentescos | Tokenizar referencias en ensayos, validar base jurídica, calidad y mínimo privilegio. |
| Fechas sin zona/tipo de día | Vencimientos alterados | Normalizar UTC y conservar valor original; no recalcular plazos históricos. |
| DDL Oracle confirma implícitamente | Rollback técnico incompleto | Backup, ensayo restaurable, ventana aprobada y scripts compensatorios revisados por DBA. |
| Objetos `SIGIP_` preexistentes | Sobrescritura accidental | El ejecutor valida checksums y debe detenerse ante objetos ajenos al historial. No usa `DROP` ni renombres. |
| Oracle incompatible con Thin | El servicio no inicia | Verificar versión/patch y negociar Thick solo en otro cambio aprobado; esta fase se niega a declarar readiness. |
| Documentos almacenados como binarios | Crecimiento y exposición | Migrar metadatos/hash/referencia; transferir binarios al gestor documental autorizado. |
| Concurrencia durante coexistencia | Doble asignación | Una sola fuente escritora por etapa, transacciones, versión optimista e índice único de asignación vigente. |

## 8. Propuesta de migración sin pérdida

1. **Inventario inmutable:** exportar conteos, PK/FK, nulos, duplicados, zonas horarias, catálogos y hashes de documentos; registrar fecha de corte.
2. **Esquema paralelo dedicado:** crear solo objetos `SIGIP_` en un esquema no productivo, sin alterar, renombrar o borrar tablas recibidas.
3. **Staging trazable:** cargar una copia anonimizada con identificador de fuente y clave legado→objetivo. Las reglas de transformación deben versionarse.
4. **Descomposición:** crear un caso por identidad jurídica estable, una solicitud por radicación y tantos ítems como servicios verificables. Los registros ambiguos van a una cola de conciliación, no se adivinan.
5. **Historia:** ordenar eventos por fecha y fuente; importar estados, asignaciones, reasignaciones y versiones como filas nuevas. Nunca actualizar una fila histórica para hacerla coincidir.
6. **Reconciliación:** comparar conteos y totales separados para caso, solicitud, persona, ítem, asignación, producto, ampliación y transferencia. Obtener aprobación funcional y técnica.
7. **Ensayo de corte y restauración:** medir duración, bloqueo, reintento y restauración completa. Oracle no ofrece rollback transaccional de DDL.
8. **Corte controlado:** detener escrituras en la fuente o usar captura aprobada; ejecutar delta, reconciliar, cambiar lectura y observar.
9. **Conservación:** mantener fuente y staging en solo lectura durante la retención aprobada. Cualquier retiro posterior requiere migración separada y autorización.

## 9. Decisiones pendientes heredadas de las brechas/RACI

| Decisión | Responsable propuesto | Impacto | Pregunta para taller |
|---|---|---|---|
| Catálogo territorial oficial | Planeación/TI y dueños funcionales | Región, geografía, cobertura, reportes | ¿Cuál es la fuente maestra, código, vigencia y jerarquía ante 15/34/42? |
| RACI separado por área | Dueños de Investigación y Víctimas | `USUARIO_ROL`, alcance y segregación | ¿Qué acciones, territorio y suplencia corresponden a PAG Central, Administrador Regional y Defensor Regional? |
| Revisión previa de Investigación | Dueño de Investigación/control interno | Estados y reparto | ¿Existe, quién la realiza y bloquea el reparto? Hasta entonces no se modela como transición operativa. |
| HU-33 | Gestión funcional/documental | Alcance contractual | ¿Existe una fuente verificable y aprobada? |
| Multiítem de Víctimas | Dueño de Víctimas | Formulario, reparto e indicadores | ¿Qué combinaciones de disciplinas se permiten dentro de una solicitud? |
| Override manual | Dueños funcionales/control interno | Elegibilidad y auditoría | ¿Quién autoriza y qué requisitos nunca pueden omitirse? |
| Novedades sobre encargos activos | Talento Humano/dueños funcionales | Continuidad y plazos | ¿Qué efecto tiene cada tipo sobre asignaciones ya activas? |
| Parámetros temporales | Dueños funcionales/jurídica | SLA, alertas, carga y ampliaciones | ¿Cuáles son valor, tipo de día, evento inicial, vigencia y evidencia? |
| Producto F-171 | Víctimas/gestión documental | Producto, versiones y cierre | ¿Cómo se solicita y registra un ajuste posterior sin inventar aprobación final PAG? |
| Oracle y operación | TI/DBA/seguridad | Conexión, migración y continuidad | ¿Versión, servicio, TLS, esquema, tablespace, cuota, HA, backup y ventana? |

No se habilitan PAG Central, Administrador Regional, Defensor Regional, Coordinador GID, Administrativo delegado ni PAG unidad operativa. Tampoco se codifican 25/40/45 días, carga seis, ampliaciones cinco o semáforos 15/6/5.

## 10. Datos que debe entregar TI

- versión completa y patch de Oracle, edición, arquitectura y compatibilidad de modo Thin;
- `connect string`/service name no productivo, DNS, puertos, TLS/mTLS, wallet si aplica y reglas de red;
- esquema propietario dedicado, privilegios mínimos, tablespaces, cuota y política de rotación del secreto;
- tamaño esperado, concurrencia, pool permitido, límites de sesión y ventanas de mantenimiento;
- charset, zona horaria de base/sesión y política institucional de UTC;
- inventario de objetos existentes con prefijo `SIGIP_` y confirmación de que el esquema no es compartido;
- backup, restauración ensayada, RPO/RTO, HA/DR y responsables de reversa;
- ambientes, datos anonimizados y autorización escrita para pruebas de contrato;
- fuente maestra y vigencia de usuarios, roles, regionales, geografía, cobertura, servicios y novedades;
- proveedor de identidad y claims; repositorio documental; IRIS; correo y controles de auditoría/retención.

## 11. Condición para pasar a piloto

Esta fase termina con adaptadores, migraciones y pruebas locales. Un piloto requiere, como mínimo: decisiones pendientes documentadas, catálogo institucional, esquema no productivo aprobado, contrato Oracle verde, seguridad revisada, ensayo de backup/restauración y acta de migración. El detalle operativo está en [`16_DESPLIEGUE_SERVIDOR_DEFENSORIA.md`](16_DESPLIEGUE_SERVIDOR_DEFENSORIA.md).
