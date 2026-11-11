# Guion para presentar los cambios de SIGIP DP

Aplicación: https://shcampinof-reparto-misiones-dndp.hf.space

Este recorrido presenta los ocho ajustes de los documentos funcionales y las mejoras autónomas posteriores. Duración sugerida: 20 a 25 minutos. Trabaje con una misión nueva de Investigación para mostrar la prórroga antes del vencimiento y la entrega. Use documentos e identidades ficticias. Las reglas provisionales de pruebas no equivalen a aprobación institucional.

## Preparación y mensaje de apertura

Abra la aplicación y tenga dos PDF ficticios, por ejemplo `soporte-inicial.pdf` y `soporte-corregido.pdf`. Puede usar los PDF ficticios descargables que ya están en los casos de prueba. No use los Word institucionales adjuntos ni documentos con datos reales en este Space público.

Identifique los perfiles del selector:

| Perfil | Nombre de presentación | Uso |
|---|---|---|
| Defensor solicitante | Laura Méndez | Radicación, borradores, consulta y constancias |
| Investigador asignado | El que indique el reparto de la misión nueva | Inicio, soportes, prórroga, entrega y envío |
| Gestor operativo regional de Bogotá | Camila Duarte | Decisión de prórroga de una misión de Bogotá |
| PAG Investigación | Paula Serrano | Remisión, recepción, revisión y reportes |
| RJV | Natalia Pardo | Solicitud pericial y corrección de anexos |
| PAG Víctimas | Ricardo Beltrán | Devolución y aprobación previa; sin contenido F171 |
| Administrador | Andrés Molina | Estado técnico y copias |

Para cambiar de perfil use Cerrar sesión y vuelva al selector. No use Restablecer información inicial: la instancia SQLite conserva su historial y no habilita ese borrado. Evite depender del número exacto de un caso precargado para demostrar términos: puede estar vencido.

Diga al comenzar:

> Voy a mostrar cómo quedaron los cambios solicitados y las mejoras para completar operaciones con documentos. Separaré las funciones que ya funcionan en este entorno de las conexiones y decisiones institucionales que siguen pendientes.

## Secuencia recomendada

1. Como Laura, muestre el borrador y complete una misión nueva de campo en Bogotá. Anote el número de misión y el nombre del investigador calculado por el servidor.
2. Como investigador asignado, inicie, aporte soportes y solicite la prórroga antes de entregar.
3. Como Camila, apruebe la prórroga; como Paula, cree y reciba una actividad derivada para Antioquia. Muestre reportes y control.
4. Vuelva al investigador de la misión original, entregue un PDF; como Paula, verifique y apruebe. Vuelva al investigador y acredite el envío al defensor para cerrar.
5. Como Laura, muestre aviso de cierre, consulta, filtros y constancia.
6. Termine con corrección documental/reserva de Víctimas y copias del administrador.

Los pasos siguientes explican cómo presentar cada cambio. Puede mantener este guion abierto junto a la aplicación.

## Los ocho ajustes de los documentos

### 1 Ampliación de términos

**Perfiles:** investigador asignado y Camila Duarte. **Pantalla:** Investigación, tarjeta en En ejecución.

1. Radique una misión nueva de Verificación investigativa en terreno en Bogotá. Use un SPOA ficticio nuevo de 21 dígitos, por ejemplo `000016000049202601919`, o cambie su consecutivo si ya se utilizó.
2. Entre con el investigador que apareció como responsable, encuentre la misión y pulse Iniciar si aún está asignada.
3. Abra Solicitar ampliación de términos. Escriba un motivo y soporte ficticios; envíe la solicitud antes de entregar el informe.
4. Entre como Camila, abra la misma misión en En ejecución, escriba la observación y 3 días para la demostración, y pulse Aprobar ampliación.
5. Muestre la aprobación, la nueva fecha y el historial. Rechazar conserva el vencimiento anterior.

**Diga:** «La ampliación tiene una solicitud y una decisión trazables; conserva el vencimiento previo y recalcula según la política aplicada».

**Precisión:** el aprobador, los límites y los términos usados son configuración provisional de pruebas pendiente de ratificación. Una prórroga de tiempo no equivale a agregar nuevas labores.

### 2 Remisión de actividades a otra regional

**Perfil:** Paula Serrano. **Pantalla:** misión original asignada, en ejecución o con informe entregado.

1. Abra Remitir actividad a otra regional.
2. Elija Verificación investigativa en terreno y Antioquia como destino.
3. Registre motivo «Apoyo territorial», actividades ya realizadas «Entrevista en Bogotá» y pendientes «Verificación de arraigo en Medellín».
4. Pulse Crear remisión vinculada. Vaya a Pendientes y abra la actividad derivada.
5. Muestre el vínculo con el ítem de origen, las tareas y la regional. Registre Observación de recepción y pulse Recibir y calcular reparto.
6. Muestre responsable, explicación del reparto y estado independientes. El perfil PAG de presentación tiene alcance nacional para mostrar también la recepción; eso no asigna universalmente ese alcance a todos los PAG institucionales.

**Diga:** «La actividad se tramita en la regional receptora conservando caso, SPOA y solicitante; quedan claras las tareas realizadas y las pendientes para evitar repetirlas».

**Precisión:** no se obliga a devolver al defensor ni a pasar siempre por central; no se permite escoger libremente al investigador.

### 3 Número de misión con cinco dígitos

**Perfil:** Laura o cualquier perfil autorizado para consultar la misión. **Pantalla:** encabezado de tarjeta y Ver detalle del caso.

1. Muestre el consecutivo de la misión recién radicada, por ejemplo `2026-00106`.
2. Muestre la referencia interna con prefijo `INV-` y el SPOA por separado.
3. Si existe una derivada, muestre su identificador hijo sin presentarlo como otro SPOA.

**Diga:** «El número identifica la solicitud durante su ciclo; el SPOA identifica el caso y cada actividad mantiene su vínculo con la solicitud».

**Precisión:** el consecutivo del ejemplo puede variar; la nueva presentación no borra ni renumera referencias históricas.

### 4 Reportería descargable

**Perfil:** Paula; después Laura para mostrar alcance. **Pantallas:** Tablero de supervisión de Investigación y Control de misiones.

1. Muestre indicadores, responsables y distribución por especialidad o estado.
2. En Control de misiones, filtre por regional, estado o investigador y pulse Descargar Excel.
3. Abra el archivo descargado y contraste los registros con el filtro aplicado.
4. Entre como Laura y muestre la exportación de sus propias solicitudes.

**Diga:** «La consulta y la exportación respetan los filtros y el alcance del usuario; solicitudes e ítems se cuentan por separado».

**Precisión:** el tablero está integrado en SIGIP-DP. Power BI y las fórmulas oficiales adicionales siguen pendientes.

### 5 Información para el control del reparto F147

**Perfil:** Paula. **Pantallas:** Control de misiones y Ver detalle del caso.

1. Muestre ingreso, responsable, regional, servicio, estado y vencimiento cuando existe política aplicable.
2. Abra el detalle y el historial para relacionar asignación, prórroga, informe y cierre.
3. Muestre que la tabla y el Excel reutilizan los datos registrados en la solicitud.

**Diga:** «La herramienta consolida información de control y reduce la necesidad de volver a digitar esos datos».

**Precisión obligatoria:** «El reemplazo formal del F147 y del acta de control necesita homologar sus campos y aprobar el procedimiento. No lo estamos dando por sustituido institucionalmente».

### 6 Verificación antes del cierre y constancia de envío

**Perfiles:** investigador asignado y Paula. **Pantallas:** entrega en En ejecución y revisión en Por revisar.

1. Como investigador, entregue el informe usando Forma de entrega, Cargar PDF y Usar PDF de ejemplo, o un PDF ficticio propio.
2. Como Paula, abra Por revisar. Muestre Constancia del formulario de verificación y la casilla de confirmación de revisión.
3. Escriba una referencia ficticia, marque la confirmación y pulse Aprobar informe verificado.
4. Muestre que queda Aprobado pendiente de envío; vuelva al investigador.
5. Registre Constancia del envío al defensor y use el botón de registro de envío para finalizar. Muestre el cierre en el historial.

**Diga:** «La revisión y el envío son hitos distintos. La aprobación deja constancia y el cierre exige acreditar el envío».

**Precisión:** es confirmación autenticada y referencia de verificación; no es firma digital ni un checklist oficial completamente homologado. El aplicativo registra el envío externo, no envía por sí mismo el correo.

### 7 Notificaciones

**Perfiles:** investigador asignado y Laura. **Pantalla:** Notificaciones en la cabecera.

1. Como investigador, abra Notificaciones y muestre el aviso de asignación de la misión nueva.
2. Pulse Marcar como leído y muestre el contador de pendientes de lectura.
3. Después del cierre de la misión original, entre como Laura y muestre el aviso de finalización.

**Diga:** «Los eventos confirmados generan avisos consultables; se conserva el estado y la lectura».

**Precisión obligatoria:** «El correo institucional sigue pendiente de conexión. Tener un aviso en bandeja no significa que se haya enviado o entregado un correo». No intente demostrar un correo recibido ni un reintento de fallo si no existe un proveedor conectado.

### 8 Referencia IRIS e integración pendiente

**Perfil:** investigador de una misión en ejecución. **Pantalla:** Forma de entrega.

1. Despliegue Forma de entrega y muestre la opción de referencia IRIS.
2. Explique que se puede conservar la referencia del radicado o expediente, identificada como no verificada.
3. Si quiere mostrarlo sin afectar el recorrido de cierre por PDF, use otra misión de prueba o muestre la opción sin enviar el informe.

**Diga:** «El registro ya contempla la referencia documental de IRIS; la consulta o sincronización automática requiere habilitar la integración con TIC».

**Precisión obligatoria:** una referencia no es una conexión activa, no acredita que el radicado exista y no sustituye el expediente institucional.

## Mejoras autónomas adicionales

### 9 Radicación más clara

Como Laura, muestre el SPOA de 21 dígitos con ceros iniciales conservados, el aviso informativo sobre audiencia, los contadores de texto y el alcance del servicio en el portafolio. No afirme que la advertencia garantiza entregar antes de la audiencia ni que un límite técnico es una regla institucional aprobada.

### 10 Borradores privados

1. Como Laura, avance hasta Proceso y escriba un identificador ficticio.
2. Abra Borradores guardados y pulse Guardar borrador ahora. Espere Borrador guardado en servidor.
3. Recargue la página; abra Borradores guardados y pulse Recuperar borrador sobre el registro correspondiente.
4. Muestre los campos recuperados y explique que la radicación aún requiere confirmación.

**Diga:** «Se puede retomar una solicitud sin empezar de nuevo; el borrador es privado del solicitante y no inicia el reparto».

**Precisión:** recargar el navegador no equivale a reconstruir el servidor. En Hugging Face, conservar datos entre reemplazos del contenedor requiere almacenamiento duradero.

### 11 Archivos de solicitud y documentos durante la ejecución

1. En la radicación, cargue un PDF ficticio en Documentos y complete el envío. Muestre la confirmación de radicación.
2. Abra Ver detalle del caso, pestaña Documentos, y descargue el archivo de solicitud.
3. En Soportes y versiones, elija Nuevo documento, tipo Actuación, Problema reportado o Prórroga de término, escriba motivo y cargue un PDF.
4. Pulse Guardar documento. Muestre progreso, confirmación, autor, fecha, tipo y descarga.

**Diga:** «El archivo queda vinculado al encargo y recuperable por los usuarios autorizados. Seleccionarlo en el navegador y guardarlo en servidor son momentos distintos».

**Límites del Space:** 10 MB por PDF; 30 MB sumados en la radicación; 50 MB en soportes de un ítem contando sus versiones. Son límites técnicos configurables. No hay SharePoint conectado.

### 12 Reemplazo con conservación de versiones

1. En la pestaña Documentos, seleccione el soporte ya guardado en Documento a incorporar, opción Nueva versión.
2. Indique el motivo del reemplazo y cargue el segundo PDF ficticio.
3. Guarde y muestre Versión 1 y Versión 2 con sus descargas.
4. Descargue ambas para demostrar que el original se conserva.

**Diga:** «Corregir un documento agrega una versión; conserva el contenido, autor y fecha anteriores».

Ya hay una evidencia ficticia de comprobación en `INV-2026-0001`, ítem `MT-2026-0001`, con dos versiones descargables del soporte. Es información de prueba añadida tras publicar; puede usarse si no cambió el entorno.

### 13 Filtros y constancias

1. En la bandeja, use Buscar misión, SPOA, radicado o responsable y combine Regional, Servicio, Responsable y Estado.
2. Cambie también la bandeja cuando busque otro estado. Los filtros se aplican a la bandeja activa; una búsqueda sin resultados no implica que la misión se haya perdido.
3. Pulse Limpiar filtros y compruebe que vuelven los registros.
4. En Ver detalle del caso, Documentos, pulse Descargar constancia. Abra el HTML y use la opción Imprimir del navegador si necesita una copia en PDF.

**Diga:** «Se facilita encontrar el encargo y obtener una constancia de sus eventos registrados, con fecha de corte».

**Precisión:** la constancia no equivale a firma digital ni a acuse de recibo del correo.

### 14 Corrección documental de Víctimas

1. Como Natalia, radique una solicitud pericial ficticia con PDF de solicitud F163 y anote su número.
2. Como Ricardo, devuélvala con la observación «Reemplazar soporte ilegible».
3. Como Natalia, abra Abrir asistente de corrección; avance a Personas y soportes, seleccione el PDF corregido y revise la nueva referencia.
4. Avance a Confirmación, escriba la descripción de la corrección y pulse Reenviar corrección al PAG.
5. Muestre la nueva versión y la anterior en el historial. La solicitud vuelve al aval previo antes del reparto.

**Diga:** «El archivo seleccionado en la corrección se envía y conserva en la nueva versión; el original permanece consultable según permisos».

**Precisión:** no se copia el cierre de Investigación. La entrega ordinaria del F171 de Víctimas cierra sin aprobación final PAG.

### 15 Reserva documental

Como Natalia o el perito asignado, muestre un F171 o soporte reservado descargable. Luego entre como Ricardo y muestre que dispone de metadatos de seguimiento, sin contenido ni descarga del F171. Para soportes adicionales existe una evidencia ficticia en `SVP-2026-0002`; el PAG sólo recibe metadatos autorizados.

**Diga:** «El permiso para supervisar el trámite no implica permiso para consultar el contenido reservado».

### 16 Copias y estado técnico

1. Como Andrés, abra Estado técnico del entorno de pruebas.
2. Muestre persistencia SQLite, última copia verificada y estado agregado de notificaciones.
3. Pulse Crear copia verificada y vuelva a consultar el resultado. Para evitar copias repetidas, el botón no necesariamente genera otro archivo si ya se verificó una copia en el último minuto.
4. Muestre que el antivirus figura sin motor configurado: la validación básica de PDF ya funciona, pero no se presenta como análisis antivirus.

**Diga:** «La aplicación puede verificar y recuperar copias y hace visible el estado técnico. La durabilidad fuera del contenedor y el motor antivirus requieren configurar esos recursos del hosting».

**Precisión:** las copias actuales comparten el disco efímero. No prometa que sobrevivirán a perderlo. La restauración es una operación técnica con el servicio detenido y una ruta nueva; no la ejecute en la presentación compartida.

## Cierre y preguntas previsibles

> Los cambios permiten completar operaciones con archivos, versiones, borradores y trazabilidad dentro del entorno de pruebas. Para el piloto institucional necesitamos habilitar identidad, almacenamiento duradero, repositorio documental, correo e integración IRIS, y ratificar los aspectos funcionales pendientes.

| Pregunta | Respuesta sugerida |
|---|---|
| ¿Ya llegan los correos? | Hay avisos y una bandeja de salida preparada; falta conectar el proveedor institucional. |
| ¿Ya está integrado con IRIS o SharePoint? | Se guardan referencias; las conexiones automáticas siguen pendientes. |
| ¿Ya reemplaza el F147? | Consolida información de control; la sustitución formal requiere homologación y aprobación. |
| ¿Tiene antivirus? | Valida el PDF y tiene adaptador para un motor local; ese motor aún no está activo en el Space. |
| ¿Se pierde todo al recargar? | Recargar conserva lo confirmado en SQLite. Reemplazar el contenedor sin volumen duradero sí puede perder base y copias locales. |
| ¿El PAG escoge al investigador? | El servidor calcula el reparto y conserva su explicación; no hay selección libre. |
| ¿Los plazos ya están aprobados? | Son políticas provisionales de prueba, identificadas como tales y pendientes de ratificación. |
| ¿Ya está listo para datos reales? | La publicación actual es pública y usa datos sintéticos. El piloto requiere el entorno y las condiciones institucionales. |
