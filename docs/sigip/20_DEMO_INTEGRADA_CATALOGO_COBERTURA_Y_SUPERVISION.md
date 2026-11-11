# Actualización integrada de la presentación — 7 de octubre de 2026

## Fuentes y decisiones

- **RN-INV-010 (B):** `Levantamiento_Requerimientos_Sistema_Investigacion RESPUESTAS.docx`, apartado 2.1, enumera 17 especialidades y dice expresamente que pueden aumentar o disminuir. El HTML y HU-07 coinciden en esas 17, pero las historias no están aprobadas.
- El PDF `2. Grupo de Investigación para la Defensa.pdf` desarrolla las actividades, insumos y exclusiones. Tiene 16 capítulos numerados porque **Ingeniería Civil está dentro de Topografía**, con su propia sección de servicios; no contradice las 17 entradas del levantamiento. Se incorporan esos contenidos al catálogo de presentación.
- Se conservan los cinco identificadores de servicio originales y se completan las actividades del portafolio. Hay **19 ofertas agrupadas para las 17 especialidades**: Campo conserva dos servicios y la reconstrucción multidisciplinar conserva su identificador. Estas cantidades describen la semilla actual, no límites institucionales ni un total oficial de actividades.
- **RN-INV-022/027, DEC-REG-001 y DEC-COB-INV (P):** el HTML/HU-10 contienen 15 opciones y el diccionario habla de 34 regionales. Las respuestas mencionan macroregiones y balance nacional. Ninguna de esas fuentes respalda que sólo Bogotá, Cundinamarca y Antioquia puedan solicitar misiones.
- La lista de presentación permite indicar **32 departamentos y Bogotá como territorios de la labor**, sin pretender reemplazar el catálogo institucional de regionales. Seleccionar un territorio no habilita a todos sus especialistas: se valida especialidad, cobertura del candidato y disponibilidad. Si falta candidato, se conserva la excepción y su explicación. La cobertura oficial y el redireccionamiento por macroregión siguen pendientes; no se presume cobertura nacional de ningún profesional. Víctimas conserva sus datos y estrategia anteriores.
- **Consulta y reportes (B/D):** apartado 9 de las respuestas: PAG/designado, Defensor Regional y PAG de unidad consultan; se requieren reportes por regional, investigador, defensor y delito. Para la presentación, el PAG de Investigación tiene tablero de toda el área y el Defensor Regional sólo de Bogotá. No se habilitan nuevos decisores ni facultades de edición, novedades, reasignación o excepciones. La RACI institucional definitiva sigue pendiente.

## Resultado funcional

1. La radicación muestra recibo con ID e identificador externo, y **Radicar una nueva solicitud**. El recibo aparece sólo tras confirmación de la API; desaparece el botón de envío repetido. Un rechazo conserva el formulario. El formulario siguiente limpia el caso anterior y permite **Cargar caso de ejemplo**.
2. Las personas tienen nombres inventados, separados del rol; Laura Méndez es la defensora solicitante y Julián Rojas el investigador del recorrido ordinario de Bogotá. Los correos usan el dominio reservado `sigip.example`: parecen cuentas personales y no envían mensajes ni representan funcionarios reales.
3. Hay 20 investigadores ficticios, cargos y especialidades, disponibilidad, sede y cobertura. Las cuentas especialistas permiten ejecutar sus encargos. Se mantienen los siete profesionales originales, sus habilitaciones y su distribución; se añaden especialistas y tres investigadores de campo territoriales sin alterar el desempate de los candidatos anteriores en Bogotá.
4. Se conservan las seis solicitudes originales y se agregan cinco casos de Investigación en fotografía, evidencia digital, campo en Antioquia, documentología en Valle del Cauca y ambiente en Meta. Hay estados de asignación, ejecución, informe pendiente y cierre. No se inventan vencimientos ni semáforos.
5. El tablero centraliza conteos, distribución por estado/especialidad, filtro territorial, actividad reciente y consulta de personal con búsqueda y filtros. Cuenta solicitudes e ítems por separado y aclara que un ítem puede tener varias especialidades. La carga mostrada cuenta sólo asignaciones autorizadas; no se suman cargas de casos ajenos.
6. El catálogo muestra fichas compactas de nombre y especialidad. Una búsqueda filtra servicios; cada ficha abre el detalle completo. Se elimina la repetición entre alcance y actividades. Se conserva la información fuente mediante despliegue progresivo.

## API, seguridad y módulos

- `GET /api/demo/bootstrap` agrega `supervision`; es `null` sin capacidad vigente. Los catálogos territoriales se filtran por área.
- `GET /api/demo/supervision/investigacion` exige `CONSULTAR_INDICADORES_INVESTIGACION`, con alcance territorial y vigencia. La consulta de personal requiere además `CONSULTAR_PERSONAL_INVESTIGACION`.
- `reporting/investigation.js` recibe solicitudes ya proyectadas por autorización. Agrupa lecturas; no cambia estados, asignaciones ni documentos. Defensor, investigador, administrador técnico, PAG de Víctimas y gestor central de excepciones no adquieren ese tablero.
- Cambios: semillas y portafolio en `infrastructure/demo`; capacidades en `core/auth`; contrato de consulta en `demo/router` y `demo/service`; agregados en `reporting`; formulario, catálogo y tablero en `PortalPage.jsx` y estilos. Se actualizan pruebas y guía de demostración.
- **Migraciones de base de datos: ninguna.** Es la presentación desechable en memoria previamente autorizada. No se publican fuentes personales, documentos adjuntos ni credenciales.

## Verificación y publicación

Pruebas de API cubren catálogo completo, integridad de relaciones, territorios nuevos, candidato habilitado y excepción sin candidato, separación de áreas, lectura central/regional y acceso denegado o vencido. El navegador prueba rechazo sin perder datos, dos radicaciones consecutivas, búsqueda y detalle compacto, filtros del tablero y alcance en móvil, además de ambos flujos completos anteriores.

Resultado local: **38/38 pruebas backend, 13/13 navegador y 2/2 del publicador**; lint, formato y compilación correctos. Se inspeccionaron capturas del tablero y catálogo compacto y se verificó ausencia de desbordamiento de página en móvil.

Publicación: revisión Hugging Face **`3935a7b8eeb097222ba6fa95151e8db18b6aceb5`**, confirmada como versión activa con estado **RUNNING**. El paquete incluye 54 archivos de aplicación y despliegue, sin documentos fuente, pruebas, adjuntos ni dependencias locales. Publicación mediante `prepare-space.ps1` y `publish-space.py`, sobre el Space ya autorizado. No requiere configuración manual adicional; las sesiones previas deben renovarse mediante cerrar sesión y volver a ingresar.

La prueba remota posterior pasó: salud y disponibilidad correctas, SPA y ruta interna 200, Investigación hasta cierre PAG, Víctimas con devolución/corrección/aprobación previa y cierre directo, permisos por ítem, alcance central/regional del tablero y operaciones administrativas denegadas. Se restablecieron las **11 solicitudes iniciales** al finalizar.

Pendientes institucionales: fuente maestra de regionales, matriz territorial oficial, RACI, grados, plazos/calendarios, gobierno de catálogos y fórmulas de oportunidad. Estas decisiones no se consideran aprobadas por publicar la demo.
