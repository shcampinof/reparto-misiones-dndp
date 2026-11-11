# Corrección F163 y separación de proceso y delitos — 8 de octubre de 2026

## Cambios y fuentes

El selector documental permitía cambiar la clasificación del F163 y seleccionar un archivo conservando otro tipo. El nombre del archivo no determina su clasificación. Ajuste **D**, autorizado por el usuario: campo fijo **Formato de solicitud F163 (obligatorio)** en alta y corrección. Los demás anexos conservan su clasificación. Si falta la referencia F163, el asistente mantiene el paso Servicios y explica qué completar antes de enviar. Los anexos de solicitud siguen conservando referencia, sin almacenar sus bytes.

La API reconoce **F163** y **FORMATO_SOLICITUD** como denominaciones equivalentes para requisitos de Víctimas, en ambos sentidos. No acepta una sentencia u otro anexo como reemplazo del F163. Mantiene catálogo vigente, autorización, aval previo e historial.

La consulta posterior del usuario motivó revisar directamente el F163 aportado, que separa **NÚMERO RADICADO PROCESO** y **DELITO(S)**. Se agregó `caseData.offenses` / **Delito(s)** a alta, corrección, API y detalle. Se aclaró la etiqueta **Referencia del proceso judicial**. Fuente **B**: F163 y columna Delito de F164. El campo es opcional mientras el área aprueba su obligatoriedad y catálogo (**P**). No se presume un delito a partir del expediente.

## Alcance y archivos

Víctimas exclusivamente en las reglas y el formulario. Investigación conserva su comportamiento. Archivos: `frontend/src/pages/PortalPage.jsx`, `frontend/src/components/VictimsFormatFields.jsx`, `frontend/src/components/victims-form-values.js`, `backend/src/modules/demo/service.js`, `backend/src/modules/victimas/format-fields.js`, pruebas API/navegador, este reporte y matriz de decisiones.

API: nuevo dato opcional `caseData.offenses`; se conserva el esquema del prototipo en memoria. **Sin migraciones.** Los registros anteriores siguen válidos sin rellenar delitos retrospectivamente.

## Validación y publicación

Regresiones: cuatro combinaciones del requisito/documento equivalente, rechazo de anexos diferentes y solicitudes sin autenticar, conservación de Investigación, tipo F163 fijo al cargar archivo, omisión detectada antes de enviar y recuperación tras seleccionar el documento. La prueba F163 verifica guardar y consultar Delito(s).

API: **47 pruebas correctas**. Navegador: **20 pruebas correctas**, incluido el rechazo previo a envío por F163 omitido y recuperación al seleccionar el archivo. Compilación, lint de ambos módulos y formato correctos.

Publicación activa verificada por Hugging Face: **RUNNING**, commit `998f13140009b486df721628719beb6e8ec59fdc`. Paquete de 60 archivos; cero documentos fuente y cero identificadores del directorio real detectados en la comprobación. El reinicio de la publicación restablece los registros en memoria del prototipo; no se ejecutó la operación de restablecimiento del aplicativo.

Comprobación remota correcta: nuevas etiquetas y campo F163 fijo presentes, alta aceptada tanto con F163 como con FORMATO_SOLICITUD, Delito(s) conservado por API, aprobación previa pendiente, descarga F171 permitida a RJV/perito y denegada a PAG/administración. Se dejaron dos solicitudes de verificación del formulario pendientes de aval. Investigación mantuvo la misma huella antes y después de esa comprobación.

Space autorizado: https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp

Aplicativo: https://shcampinof-reparto-misiones-dndp.hf.space

Para usar la nueva interfaz después de publicar, actualizar la página. No se requiere configuración manual nueva.

Pendientes institucionales sin cambios: vigencia SGC, plazos/calendario, cobertura, subsanación posterior al reparto, ampliaciones, almacenamiento durable, correo y obligatoriedad/catálogos.
