# Contrato funcional pre-Oracle — SIGIP-DP

Fecha de corte: 10 de septiembre de 2026  
Estado: incremento ejecutable para validación; no constituye aprobación institucional.  
Alcance técnico: aplicación demostrativa en memoria. No autoriza Oracle, migraciones ni integraciones externas.

## 1. Nombre y frontera del producto

Nombre visible: **SIGIP-DP — Gestión investigativa y pericial de la Defensoría del Pueblo**.

El incremento conserva un núcleo compartido y dos flujos separados:

- Investigación: solicitud, reparto, ejecución, entrega de informe, revisión PAG y cierre.
- Víctimas: solicitud, aprobación/devolución previa PAG, reparto, ejecución y cierre ordinario directo con F-171.

El proceso general de representación judicial mostrado en IRIS no se replica en esta aplicación.

## 2. Entidades y granularidad

Una solicitud contiene uno o varios ítems. Cada ítem conserva servicio, versión del servicio, especialidades o disciplinas elegibles, cobertura, estado, asignación, actuaciones, operaciones e historial propios. Cambiar un ítem no cambia implícitamente los demás.

El modelo separa expresamente:

- `SERVICIO`: necesidad que selecciona el Defensor o RJV;
- `ESPECIALIDAD_DISCIPLINA`: conocimiento que habilita a un investigador o perito;
- `SERVICIO_ESPECIALIDAD`: relación muchos-a-muchos configurable, versionada y con vigencia;
- `ITEM_SOLICITUD`: referencia el servicio solicitado y congela la versión y las especialidades/disciplinas elegibles aplicadas al reparto.

Las 17 especialidades de Investigación y las 2 disciplinas de Víctimas son clasificaciones iniciales ampliables. No son cantidades máximas ni equivalen a 17 y 2 servicios. La presentación usa un subconjunto revisable de servicios/actividades del portafolio fuente para demostrar la relación; su contenido no es un catálogo institucional aprobado.

En Víctimas, las personas vinculadas pertenecen a la solicitud y sus envíos se versionan. `CASO`, `SOLICITUD`, `PERSONA_SOLICITUD`, `ITEM_SOLICITUD`, `ASIGNACION` y `DOCUMENTO` siguen siendo conceptos distintos para el futuro modelo persistente.

## 3. Estados implementados

### 3.1 Investigación

`RADICADA → ASIGNADA → EN_EJECUCION → INFORME_ENTREGADO → CERRADA`

Ramas implementadas:

- `RADICADA → PENDIENTE_EXCEPCION` cuando no hay candidato.
- `INFORME_ENTREGADO → EN_EJECUCION` cuando PAG devuelve el informe con observación.

La radicación dispara automáticamente el reparto backend de cada ítem. El Defensor no lo ejecuta ni lo reintenta. No se agrega una aprobación previa de Investigación porque su RACI permanece sin confirmar.

### 3.2 Víctimas

`PENDIENTE_APROBACION_PAG → APROBADA_REPARTO → ASIGNADA → EN_EJECUCION → CERRADA`

Ramas implementadas:

- `PENDIENTE_APROBACION_PAG → DEVUELTA → PENDIENTE_APROBACION_PAG`, con observación y versión.
- `APROBADA_REPARTO → PENDIENTE_REASIGNACION` cuando no hay candidato.

El F-171 cierra el trámite ordinario sin heredar una aprobación final PAG.

## 4. Autorización por capacidad, alcance y vigencia

La API autoriza cada acción mediante concesiones con `capability`, `area`, `scopeType`, `validFrom` y `validTo`. Los alcances activos son sistema, área, solicitudes propias y asignaciones propias.

| Perfil activo | Alcance | Capacidades funcionales principales |
|---|---|---|
| Administrador del Sistema | Sistema | consulta global, administración técnica y restablecimiento de presentación |
| Defensor | Solicitudes propias de Investigación | crear solicitud y consultar el resultado del reparto automático |
| Investigador | Asignaciones propias | iniciar, registrar actuaciones, entregar informe y reportar problema |
| PAG Investigación | Área Investigación | consultar, aprobar o devolver informe |
| RJV | Solicitudes propias de Víctimas | crear, corregir y reenviar solicitud |
| PAG Víctimas | Área Víctimas | aprobar/devolver; la aprobación dispara el reparto automático |
| Perito | Asignaciones propias | iniciar, registrar actuaciones, finalizar con F-171 y reportar problema |
| Gestor Operativo Regional | Regional asignada | consulta de solicitudes, problemas e historial de correcciones |
| Gestor Central de Excepciones | Nacional | consulta de `PENDIENTE_EXCEPCION`, exclusiones y cobertura |
| Defensor Regional | Regional asignada | consulta territorial e indicadores, sin acciones operativas |

El administrador técnico no recibe capacidades operativas. Los tres perfiles adicionales tienen cuentas conservadoras de presentación, pero su definición institucional continúa `PENDIENTE_RACI`: no reciben corrección, novedad, reasignación, transferencia, cierre causal, reintento ni asignación manual. Coordinador GID, Administrativo delegado, PAG de unidad operativa y los perfiles de gobierno de catálogos permanecen sin cuenta activa.

## 5. Catálogos funcionales

Servicio y especialidad/disciplina son conceptos distintos. El catálogo consultable publica para cada servicio:

- nombre y descripción;
- alcance y exclusiones;
- requisitos;
- servicios o actividades incluidas;
- producto esperado;
- especialidades o disciplinas elegibles;
- cobertura;
- política de plazo;
- versión, estado y vigencia.

El ciclo de gobierno es `BORRADOR → EN_REVISION → PUBLICADO → RETIRADO`. Proponer y publicar son capacidades separadas. Ninguno de los siete perfiles activos puede hacerlo hasta que se aprueben responsables y segregación. No existe borrado del historial.

Las relaciones entre servicio y especialidad/disciplina siguen el mismo ciclo, versión y vigencia del contenido funcional que las publica. Una especialidad puede ejecutar varios servicios y un servicio puede admitir varias especialidades.

## 6. Reparto y trazabilidad

El cliente no envía ni decide el asignado. El servidor evalúa candidatos por estrategia de área y conserva candidatos, exclusiones, métricas, desempate, versión de política y explicación del resultado. La especialidad o disciplina se deriva de la versión vigente del servicio.

La garantía de concurrencia entre procesos queda pendiente del incremento de persistencia; la memoria demostrativa no sustituye transacciones de Oracle.

## 7. Seguimiento e indicadores

No se usa un porcentaje subjetivo. El ejecutor registra actuaciones textuales auditables. La interfaz presenta por separado:

- estado del trámite;
- días restantes;
- semáforo;
- oportunidad;
- número de actuaciones.

La solicitud expone un estado agregado derivado de todos sus ítems. Solo se considera cerrada cuando todos están cerrados; si conviven ítems cerrados y abiertos, se presenta como parcialmente cerrada. Los indicadores identifican expresamente sus unidades: solicitudes, personas, ítems y asignaciones no se suman como si fueran equivalentes.

Mientras `DEC-PLZ-001` no esté aprobada, plazo, calendario y umbrales permanecen nulos. La interfaz no muestra días restantes, semáforo ni oportunidad; el catálogo informa “Plazo parametrizable por servicio”. Cerrar un ítem no valida retroactivamente una regla de plazo inexistente.

## 8. Contratos de operaciones especiales

| Operación | Estado en el incremento | Efecto |
|---|---|---|
| Reportar problema | Habilitada para el ejecutor asignado | persiste causal y descripción sin cambiar el estado principal |
| Novedad | Bloqueada por `DEC-NOV-001` | no se inventa autorizador ni efecto sobre encargos activos |
| Excepción manual | Bloqueada por `DEC-ASG-EXC` | no permite omitir requisitos duros |
| Reasignación | Bloqueada por `DEC-RACI-OPERACIONES` | falta gestor operativo aprobado |
| Transferencia | Bloqueada por `DEC-RACI-TRANSFERENCIA` | falta actor y efecto sobre titularidad |
| Prórroga | Bloqueada por `DEC-PLZ-001` | faltan aprobador, causal, duración y calendario |
| Ampliación | Bloqueada por `DEC-AMP-001` | faltan punto de corte, plazo y continuidad definitiva |

Las operaciones bloqueadas no se presentan como acciones en la interfaz. Sus contratos internos no simulan éxito ni modifican datos.

## 9. Evidencia ejecutable

Las pruebas automatizadas cubren transiciones válidas e inválidas, permisos concedidos y denegados, titularidad, aislamiento por área y regional, multiítem independiente, reparto automático por hito, cola sin candidato, personas con relaciones y contacto, versionado de Víctimas, bifurcación de cierres, catálogo, métricas condicionadas y ausencia de acciones pendientes.

La interfaz incluye recorrido de escritorio y móvil mediante Playwright. El script de humo conserva los dos recorridos completos. No se despliega este incremento hasta recibir una orden explícita.
