# Plan de implementación para Codex

## 1. Objetivo

Transformar el repositorio `mesa-atencion-investigativa` en una versión funcional de SIGIP-DP, conservando React + Express como punto de partida, separando los flujos de Investigación y Víctimas y sustituyendo datos en memoria por persistencia transaccional.

Este plan no autoriza despliegue productivo hasta cerrar identidad, infraestructura, datos personales y aceptación funcional.

## 2. Principios técnicos

1. **Monolito modular primero:** una API y una base Oracle, con módulos de dominio separados.
2. **Reglas en backend:** el frontend captura y presenta; no decide candidatos ni transiciones.
3. **Políticas por área:** una interfaz común para reparto y dos implementaciones distintas.
4. **Datos configurables:** plazos, cobertura, catálogos, capacidad y semáforos se versionan en base de datos.
5. **Trazabilidad por diseño:** historial y versiones se escriben dentro de la misma transacción del cambio.
6. **Verticales funcionales:** terminar un flujo pequeño completo antes de ampliar pantallas.
7. **Sin migración ciega del HTML:** portar capacidades, no copiar datos ficticios ni reglas contradictorias.

## 3. Línea base y gobierno del repositorio

Antes de desarrollar:

1. Etiquetar el commit actual como línea base técnica, por ejemplo `baseline-investigacion-2026-09-01`.
2. Crear rama `feat/sigip-core`.
3. Incorporar en `/docs` las reglas, decisiones y guía de levantamiento.
4. Crear `/docs/decisions` con registros ADR para cada tema en conflicto.
5. Separar datos demo en una ruta/fixture explícita; no mezclarlos con catálogos productivos.
6. Retirar credenciales demo del README productivo y exigir secretos por ambiente.

No se debe reescribir la historia Git ni mezclar refactor masivo con reglas nuevas en un solo commit.

## 4. Arquitectura objetivo

### 4.1 Backend

Estructura sugerida:

```text
backend/src/
  app/
    server.js
    middleware/
  modules/
    identity/
    common/
      cases/
      requests/
      assignments/
      documents/
      notifications/
      audit/
      catalogs/
    investigation/
      intake/
      assignment-policy/
      execution/
    victims/
      intake/
      assignment-policy/
      execution/
      brigades/
  infrastructure/
    oracle/
    document-storage/
    email/
    iris/
  tests/
```

Cada módulo tendrá controladores, casos de uso, entidades/reglas y repositorios. Los controladores no modificarán arreglos globales.

### 4.2 Frontend

```text
frontend/src/
  app/
  auth/
  areas/
    investigation/
    victims/
  shared/
    components/
    forms/
    tables/
    timeline/
  services/
```

El selector de área solo aparecerá si el usuario tiene acceso a más de una. Formularios y navegación se derivarán de permisos entregados por backend.

### 4.3 Persistencia

Usar Oracle mediante el controlador institucional aprobado, con scripts SQL versionados. No usar una biblioteca que no soporte Oracle oficialmente sin validación.

Modelo mínimo:

- `AREAS`, `ROLES`, `ROL_AREA`, `USUARIOS`, `USUARIO_ROL`.
- `CASOS`, `SOLICITUDES`, `ITEMS_SOLICITUD`, `PERSONAS_SOLICITUD`.
- `ASIGNACIONES`, `HISTORIAL_ESTADOS`, `OBSERVACIONES`.
- `FUNCIONARIOS`, `FUNCIONARIO_ESPECIALIDAD`, `FUNCIONARIO_LEY`, `FUNCIONARIO_COBERTURA`, `NOVEDADES`.
- `ESPECIALIDADES`, `PLAZOS`, `CALENDARIOS`, `MOTIVOS`.
- `DOCUMENTOS`, `DOCUMENTO_VERSIONES`.
- `NOTIFICACIONES_OUTBOX`, `AUDITORIA`.
- Tablas propias de Investigación: delitos/competencia y campos específicos.
- Tablas propias de Víctimas: leyes, hechos, parentescos, improcedencias, liquidaciones y brigadas.

Toda tabla operativa tendrá `created_at`, `created_by`, `updated_at`, control de versión y estado lógico cuando corresponda.

## 5. Motor de estados

Crear un servicio de transición por área:

```js
transition({ area, entity, from, event, actor, payload })
```

Debe:

1. Verificar permiso y transición.
2. Validar datos requeridos para el evento.
3. Aplicar cambios en transacción.
4. Registrar historial y auditoría.
5. Crear eventos de notificación.
6. Devolver la representación actualizada.

No se admitirán asignaciones directas como `row.estado = ...` fuera del servicio.

## 6. Motor de reparto

Interfaz común:

```js
getEligibleCandidates(context)
rankCandidates(context, candidates)
assign(context)
```

### Investigación

Filtros propuestos: especialidad → vigencia/novedad → cobertura → competencia/grado → capacidad. Orden: prioridad/cola → menor carga → asignación más antigua → identificador estable.

### Víctimas

Filtros propuestos: tipo de peritaje → cobertura territorial → ley/programa → vigencia/novedad. Orden: menor carga dentro del conjunto elegible → asignación más antigua → identificador estable.

La asignación se ejecutará con bloqueo/serialización suficiente para evitar que dos procesos usen la misma carga simultáneamente. Guardará:

- candidatos evaluados o al menos el resumen de exclusiones;
- política y versión;
- valores usados en el cálculo;
- motivo de desempate;
- resultado o causa de no asignación.

## 7. Fases de desarrollo

### Fase 0 — Cierre funcional mínimo

Entregables:

- Matriz RACI por área.
- Catálogos y plazos aprobados.
- Decisiones sobre capacidad, grado, cobertura, multi-peritaje y ampliaciones.
- Validación y aprobación de la matriz ya elaborada para las 32 HU.
- Dos ejemplos completos de Investigación y cuatro de Víctimas: simple, doble peritaje, caso masivo y ampliación.

Criterio de salida: ningún parámetro crítico del reparto permanece como constante no aprobada.

### Fase 1 — Fundaciones

- Configuración por ambientes.
- Conexión Oracle, migraciones y repositorios.
- Autenticación adaptada al proveedor institucional o adaptador temporal seguro.
- RBAC por área.
- Catálogos, calendario, auditoría y outbox.
- Pruebas base y CI.

Criterio de salida: crear y consultar registros persistentes, con permisos y auditoría.

### Fase 2 — Vertical completa de Investigación

- Captura alineada con formato/HU vigente.
- Solicitud madre + múltiples ítems.
- Revisión/devolución.
- Reparto real y ruta sin candidato.
- Ejecución, reporte de problema, reasignación y novedades.
- Entrega, revisión PAG y cierre.
- Alertas y tablero básico.

Criterio de salida: escenario feliz y excepciones pasan pruebas de aceptación y reinicio del servidor no pierde datos.

### Fase 3 — Vertical completa de Víctimas

- RJV, caso, ley/hecho y múltiples víctimas.
- Carga masiva de víctimas.
- Uno o varios peritajes según decisión.
- Aprobación previa.
- Reparto por cobertura/ley/carga.
- Improcedencia, entrega F-171 y consulta.
- Ampliación al mismo perito y actualización versionada.

Criterio de salida: casos simple, masivo, ampliación y actualización aprobados por el área.

### Fase 4 — Documentos e integraciones

- Repositorio documental real.
- Correo con reintentos y plantillas.
- Enlace/integración con IRIS/SGDEA según decisión.
- Importación de brigadas.
- Exportaciones y reportes institucionales.

### Fase 5 — Preparación productiva

- Rendimiento, concurrencia y volúmenes.
- Seguridad, privacidad y retención.
- Accesibilidad y navegadores institucionales.
- Respaldo/recuperación, monitoreo y manuales.
- Migración de datos y capacitación.

## 8. Orden de tareas recomendado para Codex

1. Añadir documentación y ADRs sin cambiar comportamiento.
2. Extraer constantes y fixtures del backend actual.
3. Añadir pruebas de caracterización de endpoints existentes.
4. Introducir repositorios e implementación `InMemory` detrás de interfaces.
5. Crear modelo `Case/Request/RequestItem/Assignment` y adaptar la vista actual.
6. Implementar estado/transición de Investigación con pruebas.
7. Implementar política de reparto de Investigación como función pura y probar tablas de casos.
8. Añadir Oracle y ejecutar las mismas pruebas contra repositorio de integración.
9. Completar UI de Investigación.
10. Crear el módulo de Víctimas usando el mismo núcleo, sin condicionales dispersos por toda la aplicación.
11. Implementar política de Víctimas y casos masivos.
12. Integrar documentos/notificaciones.
13. Ejecutar pruebas E2E y cerrar deuda de seguridad.

Cada tarea debe terminar con pruebas, documentación de cambios y un commit enfocado.

## 9. Estrategia de pruebas

### Unitarias

- Transiciones válidas/invalidas por área.
- Cálculo de días hábiles/calendario.
- Filtros y desempates de reparto.
- Capacidad, novedades y coberturas.
- Multi-especialidad y multi-peritaje.
- Ampliación al mismo perito.
- Versionamiento documental.

### API/integración

- Permisos por rol y área.
- Transacciones de radicación.
- Concurrencia de asignación.
- Idempotencia de eventos/notificaciones.
- Persistencia Oracle y restricciones.
- Importación masiva con errores parciales controlados.

### Extremo a extremo

1. Investigación con dos especialidades y dos asignaciones.
2. Investigación sin candidato y asignación manual justificada.
3. Entrega de Investigación rechazada y corregida.
4. Víctimas con aprobación, asignación y F-171.
5. Víctimas con 25 personas por carga masiva.
6. Víctima indirecta posterior, ampliada al mismo perito.
7. Improcedencia con notificación.
8. Actualización de informe dos años después, conservando versiones.

## 10. Criterios de “versión funcional”

Una versión no se considerará funcional solo por navegar o mostrar `toast`. Debe cumplir:

- Persistencia real y migraciones reproducibles.
- Autenticación/autorización backend.
- Reglas y estados validados.
- Reparto ejecutado y auditado en servidor.
- Documentos y versiones recuperables.
- Alertas trazables.
- Pruebas automatizadas de escenarios críticos.
- Datos demo claramente separados.
- Aceptación funcional de ambos grupos.

## 11. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Programar reglas no aprobadas | ADRs, marcas P y parámetros sin valor productivo. |
| Convertir el HTML en deuda monolítica | Portar flujo a módulos React/API, no copiar archivo. |
| Sobrecargar el modelo compartido con campos nulos | Núcleo común + extensiones por área + ítems de servicio. |
| Asignación inequitativa bajo concurrencia | Transacción, bloqueo y prueba simultánea. |
| Exposición de información sensible | Mínimo privilegio, auditoría y almacenamiento autorizado. |
| Dependencia de correo/SharePoint | Adaptadores, outbox y reintento; no acoplar transacción. |
| Alcance se expande al flujo IRIS general | Límite de producto documentado y decisión formal de integración. |
| Las 32 HU contienen reglas rígidas o contradicciones | Usar `06_MATRIZ_TRAZABILIDAD_32_HU.md` y aprobar los ajustes antes de convertirlos en pruebas definitivas. |
