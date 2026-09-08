# Línea base técnica de SIGIP-DP

**Fecha de corte:** 1 de septiembre de 2026  
**Repositorio evaluado:** `reparto-misiones-dndp`  
**Commit base:** `c815850d6d9b80c7158e7fa16682f3cc038d9101` (`main`)  
**Alcance:** diagnóstico técnico de PROMPT 0; no incorpora funcionalidades ni decisiones de negocio nuevas.

## 1. Resumen ejecutivo

El repositorio es un prototipo ejecutable de Investigación construido como una SPA React y una API Express. La compilación del frontend, el arranque de la API, la autenticación demo y las consultas básicas funcionan. La interfaz ofrece un wizard investigativo, bandejas por rol, seguimiento, informes, ampliaciones, gráficos y un catálogo de 17 especialidades.

No es todavía una base operativa o productiva de SIGIP-DP. La API conserva toda la información en arreglos y objetos de proceso, mezcla transporte, autenticación, reglas y mutaciones en dos archivos, y pierde cualquier cambio al reiniciarse. El denominado reparto automático se decide en el frontend tomando el primer investigador cuya especialidad coincide; el backend acepta el identificador enviado sin calcular cobertura, grado, novedad, capacidad, carga, desempate ni concurrencia. No existe el flujo de Víctimas.

La arquitectura React + Express puede mantenerse para las siguientes fases: no se encontró un bloqueo técnico que justifique sustituirla. La primera intervención debe crear una base de ingeniería modular y verificable sin intentar cerrar reglas funcionales pendientes. La persistencia Oracle, el modelo de dominio y las migraciones corresponden a la fase posterior definida por los prompts secuenciales.

## 2. Alcance y método del diagnóstico

Se aplicó la precedencia de fuentes de `01_DIAGNOSTICO_Y_DECISION_DE_ENFOQUE.md`. El código se trató como evidencia de lo implementado, no como fuente aprobatoria del negocio. Se leyeron `AGENTS.md` y los documentos `00` a `07` de `docs/sigip/` antes de elaborar esta línea base.

Se revisaron:

- árbol Git, commit, archivos seguidos e ignorados;
- código completo de backend y frontend;
- configuración, scripts, dependencias, datos demo y workflow de despliegue;
- rutas HTTP y controles de acceso visibles;
- compilación y smoke tests de API y frontend;
- correspondencia con las reglas consolidadas, backlog y 32 HU.

No se modificaron fuentes, dependencias declaradas, reglas, configuración ni infraestructura. Las instalaciones locales regeneraron únicamente directorios ignorados (`node_modules` y `frontend/dist`).

## 3. Estado de Git y materiales de trabajo

- Rama evaluada: `main`, alineada con `origin/main` al inicio (`+0/-0`).
- Único commit: `c815850 Preparar proyecto y despliegue en GitHub Pages`.
- Archivos aportados sin seguimiento: `AGENTS.md`, `docs/` y `SIGIP_DP_documentacion.zip`.
- `.env` existe localmente, está ignorado por `.gitignore` y no se inspeccionaron ni reprodujeron sus valores sensibles en este documento.
- `.env.example` sí está versionado y contiene credenciales demo y un valor de ejemplo débil para JWT.
- No se creó rama, etiqueta, commit ni push durante PROMPT 0.

Los archivos sin seguimiento se consideran insumos del usuario y deben incorporarse deliberadamente en una fase posterior; no deben borrarse ni sobrescribirse.

## 4. Arquitectura y módulos actuales

```text
Navegador
  └─ React 18 + React Router (HashRouter)
       ├─ Login y selección de cuenta
       ├─ Portal único condicionado por rol
       └─ fetch JSON a VITE_API_URL
             ↓
Express 4 / Node.js
  ├─ CORS local
  ├─ autenticación JWT demo
  ├─ autorización básica por lista de roles
  ├─ controladores, validaciones y reglas en server.js
  └─ arreglos mutables y fixtures en data.js
             ↓
  Sin base de datos, repositorio documental, outbox ni integraciones reales
```

### 4.1 Backend

| Archivo | Responsabilidad real | Observación |
|---|---|---|
| `backend/src/server.js` | Carga manual de `.env`, Express, CORS, JWT, login, autorización por rol, validaciones y los 15 endpoints. | Archivo único de 715 líneas; inicia el listener al importarse; no separa aplicación de infraestructura ni facilita pruebas de API. |
| `backend/src/data.js` | Catálogos, usuarios, investigadores, solicitudes, radicados, historial, reglas de plazo/semáforo y proyecciones. | Archivo único de 654 líneas; funciona simultáneamente como fixture, almacenamiento, dominio y capa de lectura. |
| `backend/package.json` | Scripts `dev` y `start`; dependencias Express, CORS y JWT. | No tiene lint, formato, test, cobertura, migraciones ni script de comprobación integral. |

No existen los límites modulares requeridos para `core`, `investigacion`, `victimas`, `assignment`, `reporting` e `integrations`. Tampoco existen controladores, casos de uso, repositorios o adaptadores separados.

### 4.2 Frontend

| Archivo/módulo | Responsabilidad real | Observación |
|---|---|---|
| `App.jsx` | Rutas de login, selección de cuenta y portal. | Solo hay tres pantallas/rutas principales. |
| `context/AuthContext.jsx` | Login, selección de cuenta, perfil y JWT en `localStorage`/`sessionStorage`. | No implementa inactividad, renovación, proveedor institucional ni contexto de área. |
| `pages/LoginPage.jsx` | Formulario de usuario/contraseña demo. | “Olvidó su contraseña” no ejecuta ninguna acción. El logo se carga desde un repositorio externo en tiempo de ejecución. |
| `pages/AccountSelectionPage.jsx` | Selección entre cuentas devueltas por la API. | La selección es de cuentas demo; no es selección de área/perfil institucional validado. |
| `pages/PortalPage.jsx` | Dashboard, bandejas, catálogo, reportes, wizard y acciones operativas. | Archivo de 1.251 líneas; mezcla UI, reglas de presentación y, para reparto, decisión de negocio en cliente. |
| `api.js` | Cliente de los endpoints disponibles. | URL por `VITE_API_URL` con fallback local; no maneja correlación ni tipos/contratos. |
| `styles.css` | Estilos globales. | Archivo único de 1.368 líneas. |

La experiencia visual del prototipo es reutilizable, particularmente el wizard, las bandejas, el catálogo y las vistas de investigador. Debe dividirse por áreas y componentes sin una reescritura visual innecesaria.

### 4.3 Configuración y despliegue

- El backend busca `.env` en la raíz y en `backend/` mediante un parser propio sin esquema ni validación centralizada.
- `PORT`, flags demo, usuarios demo y roles se configuran por variables; muchos valores tienen fallback inseguro.
- `JWT_SECRET` tiene un secreto por defecto dentro del código si la variable falta.
- El modo demo queda habilitado por defecto y existen usuarios/contraseñas adicionales codificados en `data.js`.
- CORS acepta únicamente orígenes HTTP locales con puerto `517x`; no hay política por ambiente.
- No hay configuración explícita de zona horaria institucional, nivel/formato de logs, proveedor de identidad, base de datos, correo o almacenamiento.
- GitHub Actions solo ejecuta `npm ci` y `npm run build` del frontend y lo publica en GitHub Pages al hacer push a `main`.
- GitHub Pages no aloja el backend. El README reconoce que la publicación no es funcional sin una API desplegada.
- CI no ejecuta backend, lint, pruebas, auditoría de dependencias ni smoke tests.
- El logo institucional depende de `raw.githubusercontent.com`, una integración externa accidental no versionada como activo del producto.

## 5. Funcionalidades reales, simuladas y ausentes

### 5.1 Reales dentro del proceso en memoria

- Login demo por documento/contraseña y selección de una cuenta asociada.
- Emisión y verificación de JWT con expiración de 8 horas o 30 días.
- Menú básico por rol y protección de algunas acciones mediante listas de roles en backend.
- Wizard de Investigación con SPOA de 21 dígitos, datos del defensor/procesado/caso, una o varias especialidades, urgencia y utilidad pública.
- Creación de una solicitud madre y de un radicado por especialidad en una misma ejecución síncrona.
- Aprobación para reparto, devolución, asignación, inicio, avance, solicitud/decisión de ampliación y entrega de informe.
- Historial embebido por radicado y consulta visual de misiones.
- Dashboard, semáforos, gráficos, búsqueda y filtros básicos calculados con los datos cargados.
- Build estático del frontend y endpoint de salud superficial.

“Real” significa que la acción modifica el estado del proceso Node actual y la UI puede reflejarla; no implica persistencia, transacción, cumplimiento funcional o aptitud productiva.

### 5.2 Simuladas o engañosamente completas

- **Reparto automático:** el frontend elige `investigators.find(...)` por coincidencia de especialidad y envía el ID. El backend no ejecuta motor de reparto.
- **Carga:** `carga_actual` es un número fijo del fixture y no se recalcula desde asignaciones.
- **Documentos:** solo se guardan nombres y referencias de texto; el backend no recibe, valida, versiona ni almacena archivos.
- **SGDEA/IRIS y correo:** textos y referencias marcados como `SIMULADO`; no hay adaptadores ni envíos.
- **Notificaciones:** la creación devuelve frases en el JSON; no existe cola, reintento ni idempotencia.
- **Auditoría:** hay historial mutable por radicado, sin actor/rol completos en todas las transiciones, inmutabilidad o auditoría transversal.
- **Catálogo configurable:** la UI lo denomina configurable, pero es un arreglo codificado y de solo lectura.
- **Reportes:** son gráficos en cliente sobre el conjunto recibido; no hay fórmulas versionadas, fecha de corte, exportación ni auditoría.
- **Firma OSNDP:** es un booleano de formulario, no firma ni evidencia documental.
- **Persistencia de token:** “recordar sesión” almacena JWT 30 días en `localStorage`; no equivale a una política institucional segura.

### 5.3 Ausentes

- flujo completo de Víctimas y separación de políticas/estados por área;
- base de datos, migraciones, restricciones, transacciones y control de concurrencia;
- entidades separadas `CASO`, `SOLICITUD`, `ITEM_SOLICITUD`, `PERSONA_SOLICITUD`, `ASIGNACION` y `DOCUMENTO`;
- proveedor institucional de identidad y autorización por área/alcance territorial;
- máquinas de estado explícitas validadas de forma central;
- motor común de reparto con estrategias de Investigación y Víctimas;
- calendario institucional y días hábiles;
- parámetros y catálogos versionados con vigencia;
- versionado documental y trazabilidad de consulta/descarga;
- outbox, notificaciones reales, reintentos e idempotencia;
- observabilidad: logs estructurados, correlación, manejo central de errores y health checks de dependencias;
- integraciones formales con Oracle, IRIS, SharePoint/SGDEA, correo o fuente maestra;
- importación masiva, brigadas/acopios, improcedencia y F-171;
- pruebas unitarias, API, contrato, integración y E2E;
- lint, formato y CI integral.

## 6. Persistencia y modelo de datos actual

Todos los registros operativos viven en memoria de un único proceso Node. Reiniciar la API restaura los fixtures y elimina solicitudes, transiciones e informes creados durante la ejecución. No hay atomicidad: la solicitud madre se inserta antes de crear sus radicados y no existe rollback frente a un fallo intermedio.

| Estructura actual | Equivalencia aproximada | Brecha principal |
|---|---|---|
| `users[].accounts[]` | Usuario, perfiles/roles | Contraseñas en texto plano, sin vigencia, área ni alcance. |
| `specialties[]` | Especialidad/servicio y parte del plazo | Catálogo codificado, sin vigencia ni auditoría. |
| `investigators[]` | Funcionario y habilitaciones | Regional como texto; carga editable; novedades como booleanos no evaluados. |
| `solicitudesMadre[]` | Mezcla de caso y solicitud | No separa `CASO`, solicitante responsable, versiones ni personas normalizadas. |
| `radicados[]` | Mezcla de ítem, asignación, ejecución y documento | Impide versionar/reasignar correctamente y no conserva asignaciones como entidad. |
| `radicados[].historial[]` | Historial parcial | Mutable y sin esquema uniforme de actor, rol, from/to, motivo y evidencia. |
| `radicados[].ampliaciones[]` | Ampliación de término | No representa ampliaciones de encargo vinculadas según cada área. |
| `radicados[].documentos/informe` | Referencia documental | Sin entidad, versión, hash, permisos o almacenamiento. |

No existe representación de víctimas, parentescos, coberturas territoriales, leyes/programas, parámetros con vigencia, calendario, auditoría, outbox o brigadas.

## 7. Seguridad e integraciones

### 7.1 Hallazgos de seguridad

1. Credenciales demo en texto plano están versionadas en `data.js` y publicadas en el README.
2. La API usa un secreto JWT predecible por defecto cuando falta configuración.
3. El modo demo y todos los roles quedan habilitados por defecto.
4. No hay hash de contraseñas, rate limit, bloqueo, MFA, revocación de token ni cierre por inactividad.
5. Los tokens persistentes se guardan en almacenamiento web accesible por JavaScript.
6. `/api/bootstrap` y `/api/radicados` entregan todas las misiones a cualquier usuario autenticado; el defensor no se filtra por titularidad ni ámbito.
7. `/api/bootstrap` también expone la lista completa de investigadores y sus métricas a cualquier rol autenticado.
8. La autorización se basa solo en nombres de rol; no evalúa área, regional, unidad, vigencia o acción sobre un recurso concreto.
9. Coordinador y administrador pueden operar cualquier radicado como investigador porque `canInvestigatorOperate` solo restringe al rol `investigador`.
10. La asignación excepcional puede omitir el estado previo con texto libre; no registra regla omitida, autorizador ni evidencia.
11. No hay auditoría de login, cambio de cuenta, consulta, descarga, exportación o permisos.
12. Logs se limitan al mensaje de arranque; no hay política para evitar datos sensibles.
13. La API acepta JSON hasta 5 MB, pero no carga archivos ni valida tipo, tamaño, integridad o malware.
14. La configuración CORS está codificada para desarrollo y los errores de CORS no pasan por un manejador uniforme.

### 7.2 Dependencias

Con el lockfile actual, `npm ci` instaló:

- backend: Express `4.22.1`, CORS `2.8.6`, jsonwebtoken `9.0.3`;
- frontend: React `18.3.1`, React Router DOM `6.30.3`, Vite `5.4.21` y plugin React `4.7.0`.

`npm audit --omit=dev` reportó 3 vulnerabilidades en backend (1 baja y 2 moderadas) relacionadas con `body-parser`, `qs` y la cadena de Express. `npm audit` reportó 9 en frontend (1 baja, 4 moderadas y 4 altas), incluyendo Babel, React Router, Browserslist, esbuild/Vite, nanoid y PostCSS. No se ejecutó `npm audit fix`, porque cambiar dependencias queda fuera de PROMPT 0 y algunas correcciones implican actualización mayor de Vite.

### 7.3 Integraciones

No hay integraciones implementadas. SGDEA/IRIS, correo y documentos son referencias de texto. La única llamada externa del frontend es la descarga del logo desde GitHub. Tampoco hay contrato o adaptador preparado para identidad institucional, Oracle, SharePoint/SGDEA, IRIS o correo.

## 8. Endpoints existentes

| Método y ruta | Autenticación/rol | Comportamiento | Estado técnico |
|---|---|---|---|
| `GET /api/health` | Pública | Devuelve `ok` y nombre del servicio. | Real, superficial; no comprueba dependencias. |
| `POST /api/auth/login` | Pública | Compara credenciales demo y crea pre-sesión en un `Map`. | Demo; texto plano, sin rate limit ni expiración de pre-sesión. |
| `POST /api/auth/select-account` | Pre-token opaco | Selecciona cuenta y emite JWT. | Demo; no valida vigencia/área institucional. |
| `GET /api/auth/me` | JWT | Devuelve perfil del fixture. | Real en memoria. |
| `GET /api/bootstrap` | JWT, cualquier rol | Entrega menú, KPIs, catálogos, investigadores, todas las misiones y reglas. | Real/simulado; sobreexpone datos y constantes pendientes. |
| `POST /api/solicitudes` | defensor, coordinador, administrador | Valida y crea solicitud con varios radicados. | Parcial; no transaccional, persistente ni alineada totalmente con SD-P03-F04. |
| `POST /api/radicados/:numero/aprobar-reparto` | coordinador, administrador, PAG | Cambia estado directamente. | Parcial; no usa máquina de estados ni RACI confirmado. |
| `POST /api/radicados/:numero/devolver` | coordinador, administrador, PAG | Exige motivo/observación y cambia estado. | Parcial; no habilita corrección/versionado/reenvío. |
| `POST /api/radicados/:numero/asignar` | coordinador, administrador, PAG | Acepta investigador elegido por el cliente. | Simulación de reparto; sin elegibilidad, carga, auditoría o concurrencia. |
| `POST /api/radicados/:numero/ampliacion` | investigador, coordinador, administrador | Crea solicitud de días adicionales. | Parcial; incorpora una regla numérica no trazada y usa días calendario. |
| `POST /api/radicados/:numero/iniciar` | investigador, coordinador, administrador | Marca ejecución y avance mínimo 35 %. | Parcial; estado/porcentaje codificados. |
| `POST /api/radicados/:numero/avance` | investigador, coordinador, administrador | Cambia porcentaje y agrega historial. | Parcial; hitos y permisos no definidos. |
| `POST /api/radicados/:numero/informe` | investigador, coordinador, administrador | Guarda metadatos/texto y marca informe entregado. | Parcial; sin archivo/versiones ni aprobación PAG posterior. |
| `POST /api/radicados/:numero/ampliacion/:id/decidir` | coordinador, administrador, PAG | Aprueba/rechaza y suma días calendario. | Parcial; RACI y términos pendientes. No tiene cliente frontend. |
| `GET /api/radicados` | JWT, cualquier rol | Devuelve todas las misiones. | Real en memoria; carece de autorización por recurso/alcance. |

No hay documentación OpenAPI, versionado de API, paginación, idempotency keys ni correlación.

## 9. Pantallas y vistas existentes

| Ruta/sección | Roles visibles | Capacidad | Brecha |
|---|---|---|---|
| `#/` | Pública | Login demo. | Sin SSO, recuperación real o seguridad institucional. |
| `#/seleccion-cuenta` | Usuario preautenticado | Selección de una cuenta/rol. | No representa perfiles por área con vigencia. |
| `#/portal` Dashboard | coordinador, administrador | KPIs, estados y semáforo. | Datos globales, fórmulas no documentadas y umbrales fijos. |
| Bandeja de solicitudes | varios roles; acciones para coordinador/admin/PAG | Buscar, aprobar, devolver y asignar. | No filtra alcance; reparto se decide en cliente; botones permiten transiciones inválidas que el backend no siempre evita. |
| Misiones activas | coordinador/admin/PAG/PAG unidad | Tabla de ejecución. | Solo lectura global y sin separación de área. |
| Reportes | coordinador/admin/PAG/defensor regional | KPIs y tres gráficos. | Sin filtros de corte, exportación, permisos de datos o auditoría. |
| Catálogo | todos los roles configurados | Consulta de 17 especialidades. | Codificado, solo Investigación y sin vigencia. |
| Nueva solicitud | defensor | Wizard de seis pasos y multi-especialidad. | Campos libres, sin borrador/documentos reales/duplicados/corrección. |
| Mis solicitudes | defensor | Tarjetas de todas las misiones recibidas. | No filtra por defensor autenticado. |
| Mis misiones | investigador | Detalle, historial, inicio, avance, ampliación e informe. | Documentos simulados; no reporta problemas ni soporta revisión final. |

No existe selector de área, UI de Víctimas, administración real, catálogos editables, decisiones de ampliación, novedades, reasignación, transferencia, revisión de informe, auditoría o integraciones.

## 10. Reglas de negocio: cumplimiento y contradicciones

### 10.1 Alineaciones aprovechables

- Existe una solicitud madre con varios radicados por especialidad, aproximación inicial a RN-ALC-004/005 y RN-INV-006/007.
- El SPOA se valida con 21 dígitos (RN-INV-002).
- La creación permite una o varias especialidades (RN-INV-006).
- Hay validación de autorización básica en backend, aunque insuficiente para RN-COM-003.
- Devolución y asignación manual exigen texto de motivo, de forma parcial respecto de RN-COM-023/055.
- El investigador demo solo puede operar sus radicados cuando su token contiene `investigatorId`, aproximación parcial a RN-COM-005.
- La entrega de Investigación queda en `informe_entregado`, lo cual deja espacio conceptual para la aprobación PAG requerida por RN-INV-031, pero esta transición no está implementada.

### 10.2 Contradicciones o reglas pendientes codificadas

| Tema | Implementación actual | Fuente consolidada | Tratamiento requerido |
|---|---|---|---|
| Plazos 25/45 | Constantes y días calendario. | RN-INV-011/012/015: tipo de día **P**. | Retirar de código y resolver por parámetro versionado; no declarar hábil/calendario. |
| Utilidad pública 15 | Constante para campo. | RN-INV-013 es B y RN-INV-014 B/D. | Mantener solo como parámetro de línea base con evidencia y vigencia. |
| Semáforo 7/3 | Constantes globales. | RN-COM-042 y conflicto documentado: umbrales parametrizables. | No conservar como regla aprobada. |
| Ampliación de término | Primera ampliación no puede superar plazo inicial. | Actor, días, evidencia y regla siguen P. | Registrar como comportamiento del prototipo, no como decisión. |
| Regional | Texto libre e igualdad no evaluada. | Territorialidad de Investigación es P; Víctimas exige matriz. | Crear catálogo/cobertura versionada, sin concluir regla. |
| Grado | No existe. | Exacto/mínimo y alcance son P. | Modelar parámetro/política pendiente, no inferir. |
| Capacidad/carga | Campo fijo `carga_actual`; capacidad nula. | RN-COM-053 y RN-INV-026: derivar carga; valor límite P. | Calcular desde asignaciones y parametrizar capacidad. |
| Estados | Lista única de Investigación. | RN-COM-020 y estados separados por área. | Implementar máquinas distintas; los nombres propuestos no son catálogo aprobado. |
| Aprobación | PAG/coordinador/admin antes del reparto de Investigación. | RACI de Investigación y Víctimas pendiente/diferenciado. | No consolidar esos roles como decisión institucional. |
| Asignación automática | Candidato elegido por cliente. | RN-COM-050 a 058 exigen motor transaccional auditable. | Reemplazar completamente, preservando solo UI informativa. |

No se implementa ninguna regla específica de Víctimas. El flujo general de IRIS tampoco se duplicó, lo cual es coherente con RN-ALC-003.

## 11. Correspondencia de las 32 historias con el código

La columna “Código” describe evidencia técnica, no aprobación funcional. Se conserva la clasificación de `06_MATRIZ_TRAZABILIDAD_32_HU.md`.

| HU | Clasificación funcional | Código | Evidencia y brecha principal |
|---|---|---|---|
| HU-01 | Mantener | Parcial/demo | Login, JWT y cuentas demo; no identidad institucional ni auditoría. |
| HU-02 | Mantener | Ausente | Hay un botón visual de recuperación sin acción; SIGIP no delega en proveedor real. |
| HU-03 | Mantener | Ausente | Expiración fija del JWT, sin aviso/cierre por inactividad configurable. |
| HU-04 | Ajustar | Ausente | No hay selector/contexto de área; solo selección de cuenta/rol. |
| HU-05 | Ajustar | Parcial/incorrecto | Ocho roles demo y menús; no RACI separado ni alcance. |
| HU-06 | Ajustar | Parcial | Usuarios e investigadores codificados; sin grado, vigencia o administración persistente. |
| HU-07 | Ajustar | Parcial/contradictorio | 17 especialidades y 25/45 codificados como calendario; el tipo de día sigue P. |
| HU-08 | Ajustar | Ausente | No existen disciplinas ni flujo de Víctimas. |
| HU-09 | Ajustar | Ausente | No se modela competencia-grado. |
| HU-10 | Replantear | Ausente | Regionales son texto libre; no hay catálogo institucional vigente. |
| HU-11 | Ajustar | Parcial | Wizard, SPOA y multi-especialidad; no cubre formato oficial, borrador, documentos o validación completa. |
| HU-12 | Mantener | Parcial | Tarjetas/filtros/historial; se muestran datos globales y semáforo fijo. |
| HU-13 | Ajustar | Ausente/incorrecto | Solo ampliación de término iniciada por investigador; no ampliación vinculada pedida por defensor sobre misión completada. |
| HU-14 | Replantear | Ausente | No hay wizard de Víctimas. |
| HU-15 | Mantener | Ausente | No hay solicitudes ni bandeja RJV. |
| HU-16 | Ajustar | Ausente | No hay ampliación de Víctimas al mismo perito. |
| HU-17 | Replantear | Parcial/incorrecto | Aprobación/devolución con roles compartidos codificados; no RACI por área. |
| HU-18 | Mantener | Parcial | Devuelve con causal/observación; no corrección, versión o reenvío. |
| HU-19 | Mantener | Parcial | Historial embebido visible; no historial de versiones/correcciones ni filtros específicos. |
| HU-20 | Mantener | Ausente | Booleanos de novedad en fixtures no se gestionan ni excluyen candidatos. |
| HU-21 | Ajustar | Ausente | No hay reasignación ni transferencia de defensor. |
| HU-22 | Ajustar | Simulada | Selección en frontend por especialidad; no reparto real, carga, grado, cobertura, desempate o concurrencia. |
| HU-23 | Replantear | Ausente | No hay reparto de Víctimas. |
| HU-24 | Mantener | Ausente | No existe aprobación previa de Víctimas. |
| HU-25 | Mantener | Parcial/incompleto | Se entrega informe, pero PAG no puede aprobar/devolver ni se versiona. |
| HU-26 | Ajustar | Parcial/inseguro | Asignación manual con texto; permite excepción sin reglas duras/evidencia/auditoría completa. |
| HU-27 | Mantener | Parcial | Bandeja del investigador filtrada por ID; otros alcances y multiárea no existen. |
| HU-28 | Mantener | Parcial | Inicio/avance para asignado; porcentajes/hitos no están definidos ni parametrizados. |
| HU-29 | Mantener | Parcial | Entrega investigativa sin aprobación posterior; Víctimas/F-171/improcedencia ausentes. |
| HU-30 | Ajustar | Parcial/contradictorio | Cálculo calendario y semáforo 7/3 codificados; sin calendario institucional. |
| HU-31 | Ajustar | Parcial | Dashboard y menú por rol; fórmulas, área y alcance no están documentados/aplicados. |
| HU-32 | Mantener | Parcial | Gráficos básicos; sin periodo, exportación, corte, autorización de datos o auditoría. |

Resumen técnico: ninguna HU está completa bajo los criterios globales del backlog; 18 tienen alguna evidencia parcial o simulada y 14 están ausentes. Las HU clasificadas Ajustar/Replantear no deben convertirse literalmente en pruebas contractuales.

## 12. Deuda técnica y riesgos priorizados

| Prioridad | Riesgo/deuda | Impacto |
|---|---|---|
| Crítica | Persistencia íntegra en memoria | Pérdida total al reiniciar, imposibilidad de piloto, auditoría o concurrencia. |
| Crítica | Reparto decidido en frontend y aceptado por API | Asignaciones manipulables, inequitativas y no explicables. |
| Crítica | Datos globales para cualquier autenticado | Acceso indebido a casos y metadatos; riesgo especial al incorporar víctimas. |
| Crítica | Credenciales demo y secreto JWT por defecto | Compromiso inmediato si se despliega con configuración incompleta. |
| Alta | Sin transacciones/bloqueo/idempotencia | Estados parciales, consecutivos duplicados y carreras de asignación. |
| Alta | Reglas P codificadas como 25/45 y semáforo 7/3 | Convierte contradicciones documentales en comportamiento aparente. |
| Alta | Sin máquinas de estado | Endpoints pueden saltar transiciones; historial no garantiza integridad. |
| Alta | Backend y portal monolíticos | Cambios de un área contaminan la otra y dificultan pruebas/revisión. |
| Alta | Sin pruebas ni CI de API | Regresiones no detectadas y falta de evidencia reproducible. |
| Alta | Vulnerabilidades de dependencias | Riesgos DoS, open redirect y herramientas de build; requieren actualización evaluada. |
| Media | Fechas con parsing local/UTC y suma calendario | Vencimientos incorrectos por festivos, zona horaria y DST/serialización. |
| Media | Documentos/notificaciones simulados | Éxito visual sin evidencia ni entrega real. |
| Media | Catálogos y roles codificados | Cambios institucionales requieren despliegue y alteran historia. |
| Media | Assets externos y Pages solo frontend | Disponibilidad/imagen dependiente de terceros y demo web incompleta. |
| Media | Sin logs/correlación/manejo central | Diagnóstico operativo difícil y respuestas inconsistentes. |

## 13. Propuesta de cambios por fases

Esta propuesta respeta el orden de `07_PROMPTS_PARA_CODEX.md`. No autoriza adelantar persistencia o reglas completas durante la base de ingeniería.

### Fase 1 — Base de ingeniería y monolito modular

Objetivo: reorganizar sin cambiar el comportamiento funcional observable salvo eliminar defaults inseguros de producción.

Archivos/rutas propuestos:

```text
backend/src/
  app/
    create-app.js
    server.js
    config.js
    middleware/{auth,error-handler,request-context}.js
    observability/logger.js
  modules/
    core/index.js
    investigacion/index.js
    victimas/index.js
    assignment/index.js
    reporting/index.js
    integrations/index.js
  infrastructure/demo/
  tests/{unit,api}/
frontend/src/
  app/
  auth/
  areas/investigacion/
  shared/
```

- Separar creación de `app` y `listen` para probar HTTP.
- Centralizar y validar configuración; demo solo si ambiente/desarrollo lo habilita explícitamente.
- Añadir error handler, request ID, logs JSON y health/readiness básicos.
- Añadir ESLint, Prettier, runner de pruebas, Supertest y scripts `lint`, `format:check`, `test`, `test:api`, `build`, `check`.
- Crear CI de backend/frontend sin desplegar desde un job que no haya pasado calidad.
- Mover fixtures demo a infraestructura explícita; evitar presentar datos demo como catálogos productivos.
- Mantener rutas existentes mediante adaptadores de compatibilidad y documentar deprecaciones.

**Migraciones:** ninguna migración de datos en Fase 1. Puede crearse la estructura/carpeta de migraciones vacía solo si la herramienta queda decidida; el esquema pertenece a Fase 2.

### Fase 2 — Dominio, Oracle, auditoría y outbox

- Crear entidades separadas para caso, solicitud, ítem, persona, asignación, transición, documento/versión, identidad/RBAC, catálogos, parámetros, novedades, auditoría y outbox.
- Introducir interfaces de repositorio y transacciones; retirar progresivamente arreglos globales.
- Diseñar migraciones Oracle reproducibles, restricciones, índices, control de versión y vigencias.
- Convertir datos demo en semillas exclusivas de desarrollo y etiquetadas.

Migraciones mínimas previstas, agrupables según herramienta elegida:

1. identidad, áreas, roles y alcances;
2. regionales, coberturas, servicios y catálogos versionados;
3. casos, solicitudes, ítems y personas;
4. asignaciones, novedades y transiciones;
5. documentos/versiones;
6. parámetros, calendarios y plazos;
7. auditoría y outbox;
8. extensiones de Investigación;
9. extensiones de Víctimas y brigadas.

La sintaxis final depende de versión/esquema Oracle aún no confirmados. No debe sustituirse silenciosamente Oracle como objetivo.

### Fase 3 — Identidad y autorización

- Adaptador para proveedor institucional y proveedor local seguro solo para test/desarrollo.
- Perfiles con área, rol, alcance y vigencia; filtros de recurso en todas las consultas.
- Auditoría de sesión/cambio de contexto y cierre por inactividad parametrizado.

### Fase 4 — Solicitudes, catálogos y estados

- CRUD versionado de catálogos y parámetros.
- Radicación transaccional multiítem, duplicados, corrección y línea de tiempo.
- Máquinas de estado distintas de Investigación y Víctimas.

### Fase 5 — Motor de reparto

- Estrategia común, implementaciones separadas, explicación, simulación y control de concurrencia.
- Mantener como parámetros/decisiones abiertas capacidad, grado, territorialidad y demás reglas P.

### Fases 6 a 9 — Verticales y endurecimiento

- Completar Investigación; luego Víctimas; después documentos/notificaciones/reporting/brigadas; finalmente seguridad y aceptación integral.
- No duplicar el flujo general de representación judicial de IRIS.

## 14. Pruebas que deben crearse

### 14.1 Caracterización inmediata para Fase 1

- health, 404 y error JSON con correlación;
- login demo habilitado/deshabilitado y rechazo sin configuración segura;
- selección de cuenta, JWT válido/expirado/inválido;
- permisos actuales por endpoint y prueba explícita del alcance que debe corregirse;
- validación del wizard y creación multi-especialidad;
- caracterización de cada transición actual antes de extraer módulos;
- build frontend y contratos básicos del cliente API;
- configuración faltante, inválida y por ambiente;
- ausencia de secretos/defaults demo en modo producción.

### 14.2 Dominio y persistencia

- migraciones up/down o reversa documentada y ejecución desde esquema limpio;
- integridad referencial y unicidad de consecutivos;
- repositorios y transacciones con rollback;
- vigencia histórica de catálogos/parámetros;
- auditoría inmutable y outbox atómico;
- reinicio sin pérdida de datos.

### 14.3 Reglas y estados

- transición válida e inválida por cada área;
- autorización permitida/denegada por rol, área, regional y titularidad;
- solicitud multiítem y estados parciales de la madre;
- devolución, corrección y conservación de versión;
- detección de duplicados sin fusión automática;
- fines de semana, festivos, tipo de día, zona horaria y cambio de vigencia;
- documentos con versiones, hash y permisos.

### 14.4 Reparto

- inclusión/exclusión con causa para cada criterio;
- desempate determinista y reproducibilidad;
- sin candidato y `PENDIENTE_REASIGNACION`;
- simulación sin efectos;
- asignación manual con regla omitida, autorización, causal y evidencia;
- dos solicitudes concurrentes sobre el mismo conjunto candidato;
- separación de políticas de Investigación y Víctimas.

### 14.5 API, contratos y E2E

- idempotencia de radicación/importación/notificación/integración;
- contratos de identidad, Oracle, documentos, correo e IRIS con dobles;
- los diez casos E2E de `05_BACKLOG_MVP_PROPUESTO.md`;
- los escenarios de misión simple/multi-especialidad, Víctimas simple/masivo, ampliación, improcedencia, F-171 y actualización versionada;
- seguridad: rate limiting, exposición de datos, acceso horizontal, payloads inválidos, archivos y logs sensibles.

## 15. Comandos ejecutados y resultados

| Comando/comprobación | Resultado |
|---|---|
| `git status --short`, `git branch --show-current`, `git log --oneline -10` | Rama `main`, un commit; documentación/AGENTS/ZIP sin seguimiento. |
| `rg --files ...` y lectura completa de fuentes/documentos | Inventario y diagnóstico completados. |
| `node --version` | `v24.11.0`. El proyecto declara únicamente Node 18+; CI usa Node 20. |
| `npm --version` | `11.6.1`. |
| `npm ci` en `backend/` | Correcto; 85 paquetes añadidos; auditoría inicial: 3 vulnerabilidades. |
| `npm ci` en `frontend/` | Correcto; 112 paquetes añadidos; auditoría inicial: 9 vulnerabilidades. |
| `npm run` en ambos paquetes | Backend solo `start/dev`; frontend `dev/build/preview`. No existen scripts de lint o test. |
| `npm run build` en frontend | Correcto con Vite 5.4.21; 39 módulos; JS 200,24 kB y CSS 17,32 kB antes de gzip. |
| `npm audit --omit=dev` en backend | Falló por hallazgos: 3 (1 baja, 2 moderadas). Diagnóstico, no fallo de compilación. |
| `npm audit` en frontend | Falló por hallazgos: 9 (1 baja, 4 moderadas, 4 altas). |
| `npm start` en backend | API inició en puerto 4000. Se detuvo manualmente tras smoke tests. |
| Smoke API: health → login demo → selección → me → bootstrap | Correcto: health `true`, rol administrador consistente, 4 misiones y 17 especialidades. |
| Smoke API: solicitud vacía autenticada | Rechazo correcto HTTP 400; no produjo mutación. |
| `npm run preview -- --host 127.0.0.1` + `curl` | SPA compilada respondió HTTP 200. Preview detenido manualmente. |

No se ejecutaron pruebas automatizadas ni lint porque el repositorio no los define. El intento inicial de `Invoke-WebRequest` contra preview falló por una excepción local de Windows PowerShell; se repitió con `curl.exe` y respondió HTTP 200.

## 16. Criterio de salida de PROMPT 0 y recomendación

PROMPT 0 queda completo con este documento: se diagnosticó el estado real, se ejecutaron las comprobaciones disponibles y se registraron contradicciones, riesgos, trazabilidad y cambios propuestos. No se implementó funcionalidad, no se crearon migraciones y no se alteró infraestructura.

Se recomienda iniciar PROMPT 1 manteniendo React + Express y creando la rama local `refactor/sigip-mvp`. Antes del primer commit de esa fase deben incorporarse conscientemente `AGENTS.md` y `docs/sigip/` al control de versiones, confirmar que el ZIP no debe versionarse, y preservar el `.env` local ignorado.

La Fase 1 debe concentrarse en modularización, configuración segura, observabilidad, manejo de errores, pruebas y CI. No debe introducir todavía Oracle ni cerrar reglas de reparto. Los bloqueos funcionales —RACI, grado, capacidad, territorialidad, plazos/tipo de día, semáforos, multi-peritaje y ampliaciones— permanecen pendientes o parametrizables conforme a sus marcas B/D/P.
