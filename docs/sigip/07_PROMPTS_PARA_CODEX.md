# Prompts secuenciales para desarrollar SIGIP-DP con Codex

## Cómo usarlos

1. Copie `AGENTS.md` en la raíz del repositorio.
2. Copie los documentos `00` a `07` dentro de `docs/sigip/` o manténgalos en una ruta equivalente informada a Codex.
3. Ejecute los prompts en orden, uno por sesión o uno después de verificar el anterior.
4. No envíe el siguiente prompt hasta que las pruebas del paso actual estén verdes y Codex haya informado los pendientes.
5. Codex puede crear commits locales, pero no debe hacer `push`, desplegar ni usar credenciales reales sin autorización expresa.

Los prompts asumen el repositorio `mesa-atencion-investigativa`, actualmente basado en React y Express. Si el repositorio cambia, Codex debe actualizar el diagnóstico antes de implementar.

---

## Prompt 0 — Diagnóstico técnico y línea base

```text
Trabaja como líder técnico del proyecto SIGIP-DP en este repositorio.

Antes de modificar código:

1. Lee completamente AGENTS.md y todos los documentos ubicados en docs/sigip/, en el orden indicado por AGENTS.md.
2. Revisa el estado de Git y no alteres cambios ajenos o no relacionados.
3. Inspecciona frontend, backend, configuración, scripts, dependencias, rutas, modelos, datos demo y despliegue actual.
4. Ejecuta las instalaciones, compilaciones, pruebas y smoke tests que ya existan. Registra comandos y resultados.
5. Compara lo implementado con 02_REGLAS_DE_NEGOCIO_SIGIP_DP.md, 05_BACKLOG_MVP_PROPUESTO.md y 06_MATRIZ_TRAZABILIDAD_32_HU.md.

En este paso no implementes funcionalidades. Crea docs/sigip/08_LINEA_BASE_TECNICA.md con:

- arquitectura y módulos actuales;
- funcionalidades reales, simuladas y ausentes;
- persistencia, seguridad e integraciones actuales;
- tabla de endpoints, pantallas y entidades existentes;
- deuda técnica y riesgos;
- correspondencia entre las 32 HU y el código actual;
- decisiones confirmadas, parametrizables y pendientes;
- propuesta de cambios por fases, archivos y migraciones;
- pruebas que deberán crearse.

No conviertas en reglas aprobadas los valores marcados P ni las HU clasificadas como Ajustar/Replantear. Si una fuente contradice otra, registra la contradicción y aplica la precedencia definida en los documentos.

Al terminar, muestra archivos creados, comandos ejecutados, resultado de compilación/pruebas, riesgos y recomendación para iniciar la fase 1. Detente; no comiences la siguiente fase.
```

## Prompt 1 — Base de ingeniería y arquitectura modular

```text
Implementa únicamente la fase de base de ingeniería de SIGIP-DP.

Primero lee AGENTS.md, docs/sigip/08_LINEA_BASE_TECNICA.md y los documentos funcionales. Verifica que el árbol de trabajo no contenga cambios ajenos. Trabaja en una rama local llamada refactor/sigip-mvp si todavía no existe; no hagas push.

Objetivos:

1. Mantener React + Express salvo que la línea base demuestre un bloqueo técnico serio.
2. Reorganizar el backend como monolito modular con límites claros para core, investigacion, victimas, assignment, reporting e integrations.
3. Separar configuración por ambiente y crear .env.example sin secretos.
4. Agregar validación centralizada de configuración, manejo de errores, logs estructurados, correlación de solicitudes y health checks.
5. Establecer lint, formato, pruebas unitarias y de API, scripts reproducibles y CI básica.
6. Eliminar dependencias de producción de credenciales demo o secretos por defecto. Puede conservarse un modo demo explícito solo para desarrollo.
7. Mantener la experiencia visual útil del prototipo; no reescribir la interfaz sin necesidad.

No implementes todavía reglas completas de reparto, no agregues microservicios, no uses arreglos en memoria como persistencia operativa nueva y no despliegues ni modifiques infraestructura externa. Preserva compatibilidad razonable con las rutas existentes o documenta la migración.

Actualiza la documentación técnica y agrega pruebas para la nueva estructura. Ejecuta lint, pruebas y build. Corrige los errores atribuibles a esta fase.

Haz un commit local con mensaje claro cuando todo esté verde. Al terminar informa arquitectura resultante, archivos modificados, pruebas, deuda pendiente y hash del commit. Detente.
```

## Prompt 2 — Modelo de dominio, base de datos y auditoría

```text
Implementa únicamente el núcleo de dominio y persistencia de SIGIP-DP conforme a AGENTS.md y 02_REGLAS_DE_NEGOCIO_SIGIP_DP.md.

Construye un modelo que separe como mínimo: CASO, SOLICITUD, ITEM_SOLICITUD, PERSONA_SOLICITUD, ASIGNACION e historial, TRANSICION_ESTADO, DOCUMENTO y VERSION_DOCUMENTO, USUARIO, ROL, AREA y alcance, REGIONAL, COBERTURA, ESPECIALIDAD/SERVICIO, PARAMETRO con vigencia, NOVEDAD, AUDITORIA y OUTBOX.

Requisitos:

1. Usa migraciones reproducibles y restricciones de integridad.
2. Diseña el esquema para Oracle como objetivo institucional. Si Oracle no está disponible en desarrollo, mantén una capa de persistencia desacoplada y pruebas compatibles; no cambies silenciosamente la base objetivo.
3. Reemplaza gradualmente los arreglos en memoria por repositorios persistentes.
4. Incluye vigencias, estados de inactivación y conservación histórica para catálogos y parámetros.
5. No codifiques como constantes: límite 6, plazo 40, anticipación 45, máximo 5 ampliaciones, 15 regionales, semáforos ni cobertura Atlántico.
6. Incluye semillas solo para datos confirmados o claramente marcados como desarrollo.
7. Toda transición y modificación sensible debe registrar actor, fecha, estado anterior/nuevo y motivo.

Crea pruebas de migración, integridad, repositorios y auditoría. Documenta el modelo en docs/sigip/09_MODELO_TECNICO_IMPLEMENTADO.md. Ejecuta todas las pruebas y build.

Realiza un commit local. Informa migraciones, entidades, pruebas, supuestos y hash. Detente.
```

## Prompt 3 — Autenticación, perfiles y autorización

```text
Implementa únicamente identidad, perfiles, autorización y alcance de datos para SIGIP-DP.

Revisa HU-01 a HU-06, pero aplica los ajustes de 06_MATRIZ_TRAZABILIDAD_32_HU.md.

Requisitos:

1. Crea una interfaz/adaptador para proveedor institucional de identidad. No inventes credenciales ni requieras acceso real a AD/Entra ID para completar pruebas.
2. Mantén un proveedor local seguro exclusivamente para desarrollo y pruebas.
3. El usuario no elige libremente su rol; roles, áreas y alcances provienen del backend.
4. Un usuario puede tener varios perfiles con vigencias y cambiar solo entre contextos autorizados.
5. Aplica autorización en cada endpoint y consulta, no solo en la interfaz.
6. Separa roles y alcance de Investigación y Víctimas. Los siete roles de las HU no son una matriz RACI aprobada.
7. Implementa cierre por inactividad configurable y auditoría de inicio, cierre y cambio de contexto.
8. La desactivación no elimina historial ni autoría.
9. Aplica mínimo privilegio a documentos y datos de víctimas.

Agrega pruebas de acceso permitido/denegado, separación de áreas, regionales, cambio de contexto, expiración y usuario inactivo. Actualiza frontend y API para usar autorización real.

Ejecuta lint, pruebas y build; haz commit local y reporta resultado, decisiones pendientes y hash. Detente.
```

## Prompt 4 — Solicitudes, catálogos y máquinas de estado

```text
Implementa el núcleo común de solicitudes y las máquinas de estado separadas de Investigación y Víctimas.

Alcance:

1. CRUD controlado y versionado de catálogos: servicios/especialidades, regionales, coberturas, delitos/competencias, leyes/programas, motivos, novedades, términos y semáforos.
2. Borrador, radicación, consecutivos únicos, detección asistida de duplicados y creación transaccional de uno o varios ITEM_SOLICITUD.
3. Corrección únicamente tras devolución o transición autorizada, conservando la versión enviada.
4. Máquina de estados explícita para Investigación.
5. Máquina de estados explícita y distinta para Víctimas.
6. Línea de tiempo completa y validación backend de cada transición.
7. Bandejas por rol, área y alcance.
8. Interfaz con selector de área autorizado y formularios separados.

No mezcles estados ni aprobaciones de las dos áreas. No asumas que una solicitud equivale a una única asignación. Los estados de la solicitud madre deben reflejar sus ítems sin ocultar resultados parciales.

Incluye pruebas de transiciones válidas e inválidas, devolución/corrección, creación multiítem, duplicados, concurrencia de consecutivos, catálogos inactivos y permisos.

Actualiza documentación, ejecuta pruebas y build, haz commit local y reporta el hash. Detente.
```

## Prompt 5 — Motor de reparto automático

```text
Implementa el motor real de asignación automática de SIGIP-DP. No simules la selección en frontend y no aceptes como confiable un investigador/perito enviado por el cliente.

Diseño requerido:

1. Servicio común de reparto con estrategias separadas para Investigación y Víctimas.
2. Primera etapa: exclusión de no elegibles con causas explícitas.
3. Segunda etapa: ordenamiento por carga y desempates deterministas.
4. Ejecución transaccional con control de concurrencia.
5. Instantánea auditable con candidatos, exclusiones, métricas, versión, desempate y resultado.
6. Ruta PENDIENTE_REASIGNACION cuando no exista candidato.
7. Simulación sin efectos para pruebas y validación funcional.
8. Asignación/reasignación manual excepcional con regla omitida, causal, autorizador y evidencia.

Investigación debe considerar de forma parametrizable: especialidad, cobertura/regional, competencia/grado, novedad, capacidad y carga. No confirmes todavía si el grado es exacto/mínimo ni si el límite es seis.

Víctimas debe considerar disciplina, matriz de cobertura territorial, ley/programa, novedad y carga comparable. No uses igualdad simple de regional ni límite fijo de seis.

Crea pruebas exhaustivas de elegibilidad, exclusiones, empates, reproducibilidad, sin candidato, vigencias, reasignación y solicitudes concurrentes. Ejecuta pruebas y build.

Documenta el algoritmo, haz commit local y reporta hash, resultados y parámetros pendientes. Detente.
```

## Prompt 6 — Vertical funcional de Investigación

```text
Implementa de punta a punta el flujo de Investigación de SIGIP-DP usando las HU específicas y transversales, pero aplicando las correcciones de 06_MATRIZ_TRAZABILIDAD_32_HU.md.

Debe incluir:

1. Wizard alineable con SD-P03-F04: SPOA de 21 dígitos, delito/competencia, regional/cobertura, urgencia, teoría del caso, soportes y una o varias especialidades.
2. Un ITEM_SOLICITUD por especialidad, con asignación, estado y plazo propios.
3. Revisión/devolución según RACI configurable.
4. Reparto automático real mediante la estrategia de Investigación.
5. Bandeja del investigador, inicio, avances, observaciones, documentos y reporte de problemas.
6. Novedades, cambio de investigador y transferencia de defensor con historial y soporte.
7. Entrega, revisión PAG, aprobación o devolución sin sobrescribir versiones.
8. Ampliación vinculada a misión completada, con causal. Ejecutor, aprobación y plazo permanecen parametrizados mientras no haya decisión.
9. Alertas y fecha límite según calendario/tipo de día configurado.

No fijes 25/45 como hábiles o calendario hasta tener parámetro aprobado. No fijes seis como límite. No exijas firma del Defensor Regional para cambiar investigador salvo nueva decisión documentada.

Crea pruebas unitarias, API y E2E para misión simple, multi-especialidad, devolución, sin candidato, reasignación, entrega rechazada/aprobada y ampliación.

Ejecuta todo, haz commit local y reporta demostración funcional, pruebas, pendientes y hash. Detente.
```

## Prompt 7 — Vertical funcional de Víctimas

```text
Implementa de punta a punta el flujo de reparto de peritos de Víctimas. No reproduzcas el flujo general de representación judicial de IRIS; solo prepara puntos de integración.

Debe incluir:

1. Solicitud por RJV con radicado configurable, ley/programa, hechos, territorio, audiencia, relato y anexos.
2. Una o múltiples víctimas directas/indirectas, parentesco y núcleo familiar sin duplicar datos comunes.
3. Captura manual y carga masiva con plantilla versionada, validación previa, errores por fila e idempotencia.
4. Uno o varios peritajes dentro de la solicitud madre, controlados por parámetro hasta aprobación.
5. Aprobación/devolución del PAG o supervisor antes del reparto.
6. Reparto por disciplina, cobertura, ley/programa, novedad y carga, sin grado ni límite fijo de seis.
7. Bandeja del perito, avances, documentos y reporte de errores.
8. Improcedencia con causal, soporte y notificación.
9. Entrega obligatoria de F-171 y finalización directa, sin aprobación final ordinaria del PAG.
10. Ajustes y nuevas versiones del informe sin sobrescritura.
11. Ampliaciones vinculadas al mismo perito y con término completo, salvo excepción. No impongas máximo de cinco.
12. Alertas por audiencia y plazo insuficiente, sin rechazo automático por la regla no confirmada de 45 días.

Coberturas Atlántico/Caribe, plazo, punto de corte de ampliación y RACI deben permanecer parametrizados o pendientes.

Crea pruebas unitarias, API y E2E para caso simple, múltiples víctimas, carga masiva, aprobación/devolución, cobertura, sin candidato, improcedencia, F-171, ajuste versionado y ampliación al mismo perito.

Ejecuta todo, haz commit local y reporta resultado, pruebas, pendientes y hash. Detente.
```

## Prompt 8 — Documentos, notificaciones, indicadores y brigadas

```text
Implementa los servicios transversales y capacidades operativas restantes de SIGIP-DP.

Alcance:

1. Abstracción de repositorio documental con proveedor local de desarrollo y adaptador preparado para SharePoint/SGDEA.
2. Metadatos, hash, clasificación, versiones inmutables, permisos y auditoría de consulta/descarga.
3. Outbox transaccional y notificaciones con reintentos e idempotencia; adaptador de correo sin credenciales reales.
4. Notificaciones de radicación, devolución, aprobación, asignación, reasignación, vencimiento, entrega, ajuste, improcedencia y cierre.
5. Semáforos y calendarios parametrizados, con recálculo periódico.
6. Dashboard por rol/área con fórmulas documentadas.
7. Reportes y exportaciones con filtros, fecha de corte, alcance y auditoría.
8. Diferenciar solicitudes, ítems, asignaciones, víctimas y productos.
9. Canal separado para importar estadísticas de brigadas/acopios y referencia F-170, sin crear peritajes ordinarios artificiales.

No implementes integraciones externas reales si faltan accesos; usa interfaces, dobles de prueba y documentación.

Crea pruebas de versiones, permisos, reintentos, idempotencia, calendarios, exportaciones y carga de brigadas. Ejecuta pruebas y build, haz commit local y reporta hash y pendientes. Detente.
```

## Prompt 9 — Calidad, seguridad y cierre del MVP

```text
Realiza la fase final de endurecimiento y validación del MVP de SIGIP-DP.

1. Lee nuevamente AGENTS.md, reglas, backlog y matriz de las 32 HU.
2. Audita el código completo contra cada regla C/B/D/P y cada HU.
3. Corrige incumplimientos verificables; no inventes decisiones para elementos P.
4. Revisa dependencias, secretos, autorización, archivos, datos sensibles y logs.
5. Prueba concurrencia del reparto, idempotencia, transacciones y recuperación ante fallos.
6. Completa pruebas unitarias, integración, API y E2E para los escenarios del backlog.
7. Configura construcción y ejecución reproducible de frontend, API y base de datos para desarrollo/pruebas.
8. Documenta API, variables, migraciones, semillas, respaldo, restauración, monitoreo y reversa.
9. Crea docs/sigip/10_MATRIZ_CUMPLIMIENTO_FINAL.md con estado implementado, parcial, bloqueado o pendiente.
10. Crea RELEASE_NOTES_MVP.md y una guía de demostración funcional por rol.

No hagas push ni despliegue. No marques como terminada una funcionalidad simulada. Si una integración depende de acceso externo, déjala como adaptador probado y bloqueo documentado.

Ejecuta todo desde un entorno limpio. Corrige fallos atribuibles al proyecto. Haz un commit local final y entrega resumen, matriz, pruebas, vulnerabilidades, decisiones pendientes, instrucciones y hash. Detente.
```

## Prompt de reanudación para una sesión nueva

```text
Continúa el desarrollo de SIGIP-DP desde el estado actual del repositorio.

Antes de actuar:

1. Lee AGENTS.md y docs/sigip/.
2. Revisa git status, rama actual y los últimos diez commits.
3. Identifica cuál fase 0 a 9 fue la última completada usando commits y documentos.
4. Ejecuta las pruebas de la última fase para confirmar que el punto de partida está sano.
5. Continúa únicamente con la fase siguiente; no repitas trabajo terminado ni avances dos fases.

Preserva cambios ajenos, no hagas push ni despliegues. Al terminar informa fase, archivos, pruebas, decisiones pendientes y hash.
```

## Prompt de corrección si una fase deja pruebas fallando

```text
Corrige únicamente los fallos introducidos o descubiertos en la fase que acabas de ejecutar.

Reproduce cada error, determina su causa y aplica la corrección mínima coherente con AGENTS.md y las reglas. No agregues funcionalidades ni inicies la fase siguiente. Ejecuta nuevamente lint, pruebas, build y smoke tests. Actualiza el mismo commit si no se compartió; de lo contrario crea un commit de corrección. Informa causa, cambios, pruebas y hash.
```

## Recomendación

El orden es `0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9`. Si el objetivo inmediato es demostrar Investigación, llegue primero hasta el prompt 6. No omita los prompts 1 a 5: evitan que la interfaz continúe dependiendo de datos en memoria y reparto simulado.
