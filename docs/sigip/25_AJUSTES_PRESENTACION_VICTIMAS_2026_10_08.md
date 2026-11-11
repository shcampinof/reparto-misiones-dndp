# Ajustes de presentación de Víctimas — 8 de octubre de 2026

Solicitud: corregir el alta consecutiva, mostrar selección de anexos y SharePoint, habilitar descarga F171 y entregar un guion de 10–15 minutos. Límite: 15 minutos desde las 14:42 de Bogotá.

## Cambios y respaldo

| Cambio | Clasificación y fuente | Alcance |
|---|---|---|
| Confirmación tras envío y botón **Crear una nueva solicitud**, que limpia el formulario después de una operación confirmada. | D: solicitud expresa del usuario; F163 y aval previo C/B de SD-P06/I14. | Víctimas. No crea una segunda solicitud automáticamente. |
| **Cargar archivo** con selector del equipo y nombre seleccionado; **URL de SharePoint** en alta y corrección. | D: solicitud expresa del usuario; catálogo documental de F163. | Anexos de Víctimas. Se registra referencia; los bytes del anexo de solicitud no se almacenan. |
| Accesos visibles **Cargar archivo F171** e **Ingresar URL de SharePoint**. | D: presentación solicitada; B: entrega F171 de SD-P06, act. 8–9. | Víctimas; utiliza la entrega, validaciones y versionado existentes. |
| PDF descargable para el F171 del caso inicial cerrado. | D: solicitud expresa; C: reserva de contenido según respuesta C.6. | Documento de presentación generado sin datos personales reales; RJV y perito asignado pueden descargar; PAG y administración no. |
| Limpieza de etiquetas de identidad y del texto del PDF generado. | D: solicitud expresa sobre lenguaje de la interfaz. | Campo de Víctimas y texto del generador PDF compartido; no cambia reglas ni estados de Investigación. |
| Guion de aproximadamente 13 minutos con formatos, acciones y 15 preguntas pendientes. | B/C/P: documentación contrastada en reporte 23. | Documento local, no incluido en el paquete público. |

## Archivos modificados en esta entrega

- `frontend/src/pages/PortalPage.jsx`: confirmación, limpieza de formulario y controles documentales de Víctimas.
- `frontend/src/components/VictimsFormatFields.jsx`: etiqueta de identidad.
- `frontend/src/demo-pdf.js`: texto del PDF de presentación.
- `backend/src/infrastructure/demo/sample-f171.js`: nuevo generador de adjunto para el caso de presentación.
- `backend/src/infrastructure/demo/seeds.js`: adjunto F171 exclusivamente en productos iniciales de Víctimas.
- `backend/test/api/app.test.js` y `frontend/test/browser/flows.spec.js`: descarga autorizada/denegada, creación consecutiva y selección documental.
- `docs/sigip/24_GUION_DEMOSTRACION_VICTIMAS_10_A_15_MINUTOS.md`, este informe y actualización del reporte 23.

No se crearon migraciones ni se modificaron reglas de reparto, estados o autorizaciones de Investigación. Los cambios previos de otras entregas permanecen en el repositorio.

## Validación

- API: **46 pruebas correctas**, incluida descarga PDF inicial, reserva por rol, autorización, integridad de bytes y separación de áreas.
- Navegador: **19 pruebas correctas**, incluida creación de dos solicitudes consecutivas, limpieza del segundo formulario, selección de archivo, referencia SharePoint y descarga del F171 inicial.
- Compilación frontend y lint de frontend/backend: correctos.
- Paquete de publicación: 60 archivos; cero documentos fuente y cero identificadores personales del directorio real detectados por la comprobación contra Libro1.

## Límites y decisiones pendientes

Los anexos de solicitud muestran selección y referencia; no tienen almacenamiento de bytes. Los F171 cargados sí son descargables en la instancia, cuya persistencia sigue en memoria. El PDF inicial es un documento de presentación, no una reproducción del formato oficial diligenciado. No se envían correos institucionales. Las reglas abiertas siguen pendientes: vigencia SGC, plazos y calendario, cobertura, ampliaciones, subsanación posterior al reparto, excepciones, titularidad y acceso al informe. Las preguntas detalladas están al final del guion 24.

## Publicación

Space autorizado: https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp

Aplicativo: https://shcampinof-reparto-misiones-dndp.hf.space

Commit publicado y activo: `ecfb01eace0f05d28cda92e12d33e1483a3e65d9`. Hugging Face confirmó **RUNNING** con esa versión. Comprobación remota correcta: salud, portal, controles nuevos presentes en el frontend, ausencia de etiquetas no deseadas, descarga PDF por RJV y perito, denegación 403 para PAG y administrador. La huella de Investigación se mantuvo igual durante la verificación, que no creó ni restableció solicitudes.

Finalización: aproximadamente 14:53 de Bogotá, dentro del máximo de 15 minutos. La nueva publicación reinició la instancia del prototipo, cuya información está en memoria; no se ejecutó la acción de restablecimiento del aplicativo.

No hay configuración manual nueva para esta presentación. Para un piloto institucional siguen pendientes almacenamiento durable, identidad institucional, análisis de archivos, política territorial y de términos y correo con bandeja de salida transaccional.
