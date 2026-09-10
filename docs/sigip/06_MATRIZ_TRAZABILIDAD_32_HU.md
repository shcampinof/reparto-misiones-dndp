# Matriz de trazabilidad de las 32 historias de usuario

**Fuente:** `Reparto misiones de trabajo investigadores(5).zip`  
**Fecha interna declarada en las HU:** 13 de julio de 2026  
**Última modificación OOXML:** 14 de julio de 2026, entre 19:37 y 21:07 COT aproximadamente  
**Último autor registrado:** Ivannof Monterrey Aranda  
**Aprobaciones:** los campos de líder funcional, líder técnico y fechas están vacíos en las 32 HU.

## 1. Lectura de los metadatos

Las 32 historias conservan exactamente la misma fecha de creación OOXML: 20 de marzo de 2026 a las 19:05 UTC. Esa coincidencia, sumada a que todas tienen la misma estructura, indica reutilización de una plantilla y hace que la fecha de creación no sea un buen indicador del momento en que se redactó cada historia.

La fecha de modificación es más informativa: todas fueron editadas después de la socialización del 14 de julio y antes de finalizar ese día en Colombia. Por tanto, se consideran una **línea base de requerimientos posterior a la reunión**, pero no una línea base formalmente aceptada porque sus bloques de aprobación están sin diligenciar.

Aunque el ZIP se denomina “investigadores”, las historias no son exclusivamente de Investigación: 7 se identifican como Investigación, 6 como Víctimas y 19 como transversales a ambas áreas. Hay 22 historias `Must have` y 10 `Should have`. Además, todas registran como solicitante al Grupo de Investigación para la Defensa, incluso las seis de Víctimas. Esto refuerza la necesidad de que el grupo de Víctimas valide y reformule sus historias antes de aprobarlas.

## 2. Clasificación utilizada

| Clasificación | Significado |
|---|---|
| Mantener | La intención funcional está alineada y puede incorporarse al backlog consolidado. |
| Ajustar | La intención es válida, pero algún criterio, dato, rol o diseño debe corregirse o parametrizarse. |
| Replantear | La historia contiene supuestos incompatibles con fuentes posteriores o no representa el flujo real del área. |

## 3. Trazabilidad historia por historia

| HU | Área | Clasificación | Regla/capacidad relacionada | Resultado de la revisión |
|---|---|---|---|---|
| HU-01 | Común | Mantener | RN-COM-001, RN-COM-067 | Autenticación institucional y carga automática de perfiles. Debe definirse si el proveedor será AD, Entra ID u otro mecanismo institucional. |
| HU-02 | Común | Mantener | Identidad institucional | El aplicativo no debe administrar contraseñas. La recuperación pertenece al proveedor de identidad y al canal de soporte. |
| HU-03 | Común | Mantener | Sesiones y parámetros | El cierre por inactividad es correcto y el tiempo debe ser configurable por política de seguridad, no por cualquier administrador operativo. |
| HU-04 | Común | Ajustar | RN-ALC-001/002, RN-COM-002 | El selector de área es válido. La frase “nunca se mezclan en una misma vista” no debe impedir tableros ejecutivos agregados autorizados; sí debe impedir mezclar operaciones y estados. |
| HU-05 | Común | Ajustar | RN-COM-001/003/006 | Los siete roles son una propuesta. Investigación y Víctimas necesitan una matriz RACI propia; no se debe heredar automáticamente Administrador Regional o Defensor Regional. |
| HU-06 | Común | Ajustar | RN-INV-023/024, RN-VIC-034 | Área, regional y especialidad son datos válidos. “Grado 19 por defecto para todos los peritos” debe validarse contra planta/cargos y no usarse como regla de reparto de Víctimas. |
| HU-07 | Investigación | Ajustar | RN-INV-010 a RN-INV-015 | Confirma catálogo inicial de 17 especialidades, pero afirma 25 y 45 **días hábiles**, mientras otras fuentes indican días calendario. Los plazos quedan pendientes y versionados. |
| HU-08 | Víctimas | Ajustar | RN-VIC-009, RN-VIC-040 | Confirma dos disciplinas, pero los 40 días hábiles contradicen la reunión del 23 de julio. No fijar ese plazo. |
| HU-09 | Investigación | Ajustar | RN-INV-023/024 | Confirma mapeo Municipal→15, Circuito→17 y Especializado→18; sigue pendiente si el grado es exacto o mínimo y a qué servicios aplica. |
| HU-10 | Común | Replantear | RN-COM-030/031 | La HU habla de 15 regionales y el diccionario posterior de 34. El sistema debe consumir el catálogo institucional vigente y no codificar una cantidad. |
| HU-11 | Investigación | Ajustar | RN-INV-001 a RN-INV-009 | Confirma SPOA de 21 dígitos y wizard. Debe permitir varios ítems/especialidades y validar los campos contra el SD-P03-F04 vigente. |
| HU-12 | Investigación | Mantener | RN-COM-004, seguimiento | Bandeja del solicitante, filtros, estado e historial. La fecha límite y semáforo deben venir de reglas parametrizadas. |
| HU-13 | Investigación | Ajustar | RN-INV-037 a RN-INV-039 | Confirma ampliación vinculada sobre misión completada y causal obligatoria. Falta decidir responsable, ejecutor, término y aprobación de la ampliación. |
| HU-14 | Víctimas | Replantear | RN-VIC-003 a RN-VIC-012 | El formato `JV-YYYY-NNN` y la anticipación obligatoria de 45 días no están confirmados. Omite múltiples víctimas, carga masiva, parentescos y posible doble peritaje explicados después. |
| HU-15 | Víctimas | Mantener | RN-COM-004, RN-VIC-020 | Consulta por RJV y estado de aprobación previa. Debe incluir ítems, víctimas y versiones sin perder la vista del caso. |
| HU-16 | Víctimas | Ajustar | RN-VIC-043 a RN-VIC-049 | Confirma ampliación vinculada y causal. Debe incorporar mismo perito, plazo completo, punto de corte y ausencia de límite normativo confirmado. |
| HU-17 | Ambas | Replantear | RN-COM-006, RN-VIC-020/023 | No puede imponer al Administrador Regional como validador común. En Víctimas la fuente posterior sitúa la aprobación previa en PAG/supervisor; Investigación también requiere RACI confirmado. |
| HU-18 | Ambas | Mantener | RN-COM-022/023, RN-INV-009, RN-VIC-021 | Devolución con causal, observación, notificación y reenvío. Las causales y el estado de retorno deben ser específicos de cada área. |
| HU-19 | Ambas | Mantener | RN-COM-021/022 | Histórico de correcciones y filtros por área/motivo. La visibilidad se determinará por alcance, no solo por autor individual. |
| HU-20 | Ambas | Mantener | RN-COM-054 | Novedades excluyen nuevas asignaciones durante su vigencia. Deben tener fechas, fuente, efecto y regla para asignaciones ya activas. |
| HU-21 | Ambas | Ajustar | RN-COM-057, RN-INV-033 a RN-INV-036 | Separar reasignación de ejecutor y transferencia de defensor. “Misma regional” no debe ser una restricción universal; exigir causal, soporte y nueva validación de elegibilidad. |
| HU-22 | Investigación | Ajustar | RN-COM-050 a RN-COM-056, RN-INV-020 a RN-INV-027 | Es la base del reparto de Investigación. El límite 6, regional y grado exacto siguen pendientes; faltan desempate completo, concurrencia e instantánea explicable. |
| HU-23 | Víctimas | Replantear | RN-VIC-030 a RN-VIC-039 | Aplicar “misma regional” y “menos de 6” contradice la reunión posterior. Debe usar disciplina, matriz de cobertura, ley/programa, novedad y balance de carga sin umbral fijo confirmado. |
| HU-24 | Víctimas | Mantener | RN-VIC-001/002/020 | Confirma la aprobación del PAG antes del reparto y la devolución al RJV. Falta precisar alcance territorial y suplencias del aprobador. |
| HU-25 | Investigación | Mantener | RN-INV-031/032 | Confirma aprobación o devolución de la entrega investigativa. Debe conservar versiones y definir el nuevo vencimiento tras devolución. |
| HU-26 | Ambas | Ajustar | RN-COM-055/057 | La asignación manual resuelve la cola sin candidato, pero no debe ignorar silenciosamente especialidad, grado, cobertura o restricciones legales. Cada excepción necesita autorización y justificación explícitas. |
| HU-27 | Ambas | Mantener | RN-COM-005 | Bandeja personal del ejecutor con estados, filtros y alertas. Debe manejar ítems técnicos, no asumir que toda solicitud tiene una sola asignación. |
| HU-28 | Ambas | Mantener | RN-COM-021, ejecución | Solo el asignado registra avances; primer avance inicia ejecución. Deben definirse porcentaje, hitos y documentos por servicio. |
| HU-29 | Ambas | Mantener | RN-INV-031, RN-VIC-050 a RN-VIC-052 | Confirma la bifurcación: Investigación pasa a aprobación; Víctimas completa sin aprobación final ordinaria. Víctimas debe exigir F-171 y soportar improcedencia/ajustes. |
| HU-30 | Ambas | Ajustar | RN-COM-040 a RN-COM-045 | Confirma cálculo por tipo de día y semáforo. Evento inicial, calendario y rangos 15/6/5 deben parametrizarse porque existen fuentes contradictorias. |
| HU-31 | Ambas | Ajustar | Indicadores y permisos | Dashboard por rol/área es válido. Deben documentarse fórmulas y reconsiderar el rol Defensor Regional dentro de Víctimas. |
| HU-32 | Ambas | Mantener | Reportes y auditoría | Reportes por funcionario, estado, periodo y regional. Exportaciones deben respetar permisos, registrar corte/filtros y diferenciar solicitudes, ítems, víctimas y productos. |

## 4. Cobertura y brechas del conjunto de HU

Resultado de la clasificación: **14 historias se pueden mantener, 14 requieren ajustes y 4 deben replantearse** —HU-10, HU-14, HU-17 y HU-23—.

Las HU cubren bien:

- autenticación y cambio de contexto;
- usuarios, roles y catálogos;
- radicación básica por área;
- devolución/corrección;
- reparto automático y asignación manual;
- ejecución, finalización, semáforos, dashboard y reportes;
- diferencia entre aprobación previa de Víctimas y aprobación posterior de Investigación.

Las HU no cubren con suficiente detalle:

- estructura `caso → solicitud → varios ítems → asignaciones`;
- múltiples víctimas, víctimas indirectas, parentescos y núcleos familiares;
- carga masiva de casos de Víctimas;
- combinación de peritaje psicológico y financiero;
- matriz real de cobertura territorial de peritos;
- improcedencia y constancia formal;
- F-171, versiones, ajustes y actualizaciones de cifras;
- brigadas, acopios y consolidación F-170;
- documentos reales, retención, seguridad y acceso sensible;
- concurrencia del reparto, idempotencia y explicación del algoritmo;
- integraciones con IRIS, repositorio documental, correo y fuente maestra de funcionarios;
- migración, operación, monitoreo y recuperación.

Estas brechas justifican conservar el backlog complementario de SIGIP-DP en lugar de limitar el desarrollo a reproducir literalmente las 32 HU.

## 5. Decisiones que deben corregir las HU antes de aprobación

1. Sustituir el número fijo de regionales por catálogo institucional vigente.
2. Separar RACI de Investigación y RACI de Víctimas.
3. Retirar el límite fijo de seis para Víctimas.
4. Reemplazar igualdad de regional por matriz de cobertura en Víctimas.
5. Confirmar límite seis, grado y territorialidad de Investigación.
6. Confirmar plazos y tipo de días por especialidad en ambas áreas.
7. Reescribir HU-14 para solicitudes con múltiples víctimas y posible multi-peritaje.
8. Completar HU-16 con continuidad del mismo perito y plazo de ampliación.
9. Restringir y auditar los overrides manuales de HU-26.
10. Añadir HU específicas para improcedencia, F-171/versiones, carga masiva y brigadas.

## 6. Conclusión

Las 32 HU son una buena base de alcance y confirman varias decisiones estructurales, pero fueron redactadas como traducción del prototipo y contienen reglas rígidas que las reuniones posteriores corrigieron o dejaron abiertas. Deben pasar por una sesión de refinamiento y aprobación antes de convertirse en criterios contractuales o pruebas definitivas.

## 7. Impacto del cierre funcional pre-Oracle

| Historias afectadas | Tratamiento ejecutado |
|---|---|
| HU-04, HU-05, HU-17, HU-31 | capacidades con alcance y vigencia; RACI separado; perfiles no aprobados inactivos |
| HU-06, HU-07, HU-08, HU-10 | catálogo consultable, versionado y vigente; servicio separado de especialidad/disciplina; cifras no aprobadas ausentes |
| HU-11, HU-12, HU-14, HU-15, HU-27 | solicitudes multiítem con seguimiento independiente y personas vinculadas a la solicitud de Víctimas |
| HU-18, HU-19, HU-24, HU-25, HU-29 | devolución/versionado y puntos de aprobación distintos por área |
| HU-20, HU-21, HU-26 | contratos explícitos bloqueados hasta aprobar novedad, reasignación, transferencia y excepción |
| HU-22, HU-23 | reparto por estrategia de área con especialidad/disciplina, candidatos, exclusiones, métricas y desempate; Investigación lo dispara por ítem al radicar y Víctimas al aprobar |
| HU-28, HU-30 | actuaciones sin porcentaje subjetivo; estado, plazo, semáforo y oportunidad separados; métricas temporales visibles sólo con regla vigente |
| HU-05, HU-17, HU-21, HU-31 | navegación conservadora para gestor regional, gestor central de excepciones y defensor regional; actuaciones operativas pendientes sin habilitar |

Este impacto no cambia la clasificación documental de las HU ni llena sus aprobaciones vacías. Describe comportamiento verificable del incremento, no aceptación institucional.
