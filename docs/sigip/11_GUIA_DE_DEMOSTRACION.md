# Guía de demostración SIGIP-DP

## Preparación

Abra `http://localhost:5173`. Confirme que la franja superior diga **“Ambiente de demostración — datos no reales”**. Todas las identidades, solicitudes, víctimas y referencias visibles son sintéticas. Si una ejecución anterior dejó cambios, ingrese como **Alex Demo — Administrador** y use **Restablecer datos de demostración**.

### Nuevo acceso por contexto

1. Seleccione **Investigación** o **Víctimas** en las pestañas horizontales.
2. Elija en **Rol de demostración** una de las identidades sintéticas filtradas para esa área.
3. Pulse **Ingresar al portal**. El selector facilita el guion, pero la cuenta autenticada y el backend siguen determinando los permisos y módulos habilitados.
4. Use **Cerrar sesión** en la cabecera para regresar y cambiar de perfil.

No existe todavía un archivo local del logo institucional autorizado. La demo usa temporalmente la marca textual **Defensoría del Pueblo**; el activo oficial y su autorización de uso quedan pendientes.

## Recorrido sugerido (máximo 8 minutos)

| Tiempo | Usuario / rol | Acción | Resultado esperado | Mensaje clave |
|---:|---|---|---|---|
| 0:00–0:30 | Pantalla inicial | Alternar **Investigación** / **Víctimas** y mostrar el selector de rol. | Los perfiles cambian por área y el aviso de datos no reales permanece visible. | Una plataforma común conserva autorización y procesos separados. |
| 0:30–1:25 | Diana Demo / Defensor/a | Entrar en Investigación, radicar el SPOA precargado y pulsar **Validar y ejecutar reparto**. | La validación y el reparto ocurren en backend; el caso pasa de `RADICADA` a `ASIGNADA`. | El cliente no selecciona investigador. El servidor conserva candidatos, exclusiones, carga y desempate. |
| 1:25–2:20 | Iván Demo / Investigador/a | Abrir **Pendientes**, iniciar la misión recién asignada, registrar avance y entregar `INF-DEMO-...`. | El stepper avanza hasta `INFORME_ENTREGADO`; solo se ven encargos propios y acciones válidas. | Cada acción modifica el repositorio temporal y queda en el historial. |
| 2:20–3:05 | Paula Demo / PAG Investigación | Abrir **Por revisar**, entrar al detalle y mostrar **Devolver informe** / **Aprobar y cerrar**. Aprobar la entrega del recorrido. | La misión queda `CERRADA`; la devolución, si se demuestra, exige observación y regresa a ejecución sin borrar la referencia entregada. | Investigación requiere revisión técnica final del PAG. |
| 3:05–4:00 | Renata Demo / Representante judicial de víctimas | Elegir Víctimas y crear el peritaje psicológico con dos alias sintéticos. | Queda `PENDIENTE_APROBACION_PAG`; no existe selector de perito. | Víctimas aprueba antes del reparto y minimiza datos personales en la demo. |
| 4:00–4:55 | Samuel Demo / PAG-Supervisor Víctimas | Abrir **Pendientes** y pulsar **Aprobar y repartir**. | Se registran aprobación previa y asignación automática, con explicación de elegibilidad separada para Víctimas. | No se heredan filtros ni límites fijos de Investigación. |
| 4:55–5:55 | Pilar Demo / Perito psicología | Abrir **Pendientes**, iniciar, registrar avance y finalizar con `F171-DEMO-...`. | El servicio pasa a `CERRADA` y la referencia del F-171 aparece en detalle. | La entrega ordinaria de Víctimas cierra sin aprobación final PAG. |
| 5:55–7:15 | Alex Demo / Administración demo | Alternar áreas y bandejas; abrir el panel lateral para mostrar solicitante, responsable, plazo, semáforo, documentos e historial. | Se observan hasta tres casos por área en etapas diferentes. | Plazos y semáforo están marcados como pendientes de validación funcional. |
| 7:15–8:00 | Alex Demo / Administración demo | Pulsar **Restablecer datos de demostración** y cerrar con las limitaciones. | Regresan seis casos sintéticos reproducibles, tres por área. | Es una demo funcional temporal, no una implementación productiva. |

## Cuentas precargadas

No usan contraseña; se seleccionan desde la pantalla inicial.

| Área | Identidad sintética | Rol |
|---|---|---|
| Ambas | Alex Demo | Administrador |
| Investigación | Diana Demo | Defensor/a |
| Investigación | Iván Demo | Investigador/a |
| Investigación | Paula Demo | PAG Investigación |
| Víctimas | Renata Demo | Representante judicial de víctimas (RJV) |
| Víctimas | Samuel Demo | PAG / Supervisor Víctimas |
| Víctimas | Pilar Demo | Perito psicología |
| Víctimas | Fabio Demo | Perito administrativo/financiero |

## Limitaciones que deben explicarse

- Es una demo de reunión, no el MVP productivo ni un ambiente institucional.
- El repositorio temporal vive en memoria durante la ejecución. Al reiniciar la API o restablecer la demo se recuperan semillas reproducibles.
- Plazos, catálogos, coberturas y desempates pendientes están identificados como **valores de demostración**; deben validarse antes de producción.
- No hay Oracle, SharePoint, AD/Entra ID, correo real, migración histórica ni interoperabilidad institucional.
- No se incluyen datos reales, credenciales reales ni archivos documentales.
- La futura persistencia Oracle debe sustituir la interfaz de repositorio sin trasladar lógica de negocio al frontend.
