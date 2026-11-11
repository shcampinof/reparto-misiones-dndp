import { Buffer } from "node:buffer";
import { exampleReportPdf } from "../../src/demo-pdf.js";
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "default" });

async function chooseProfile(page, { area = "INVESTIGACION", userId }) {
  await page.goto("/");
  if (area === "VICTIMAS") {
    await page.getByRole("tab", { name: "Víctimas" }).click();
  }
  await page.getByLabel("Perfil de acceso").selectOption(userId);
  await page.getByRole("button", { name: "Ingresar al portal" }).click();
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByText("Solicitudes y encargos")).toBeVisible();
}

async function logout(page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function resetPresentation(page) {
  await chooseProfile(page, { userId: "demo-admin" });
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Restablecer información inicial" })
    .click();
  await expect(
    page.getByText("Información inicial restablecida correctamente"),
  ).toBeVisible();
  await logout(page);
}

function requestCard(page, externalId) {
  return page.locator(".request-card").filter({ hasText: externalId });
}

async function submitInvestigation(page, spoa, configureServices) {
  const roleField = page.getByRole("textbox", { name: "Rol", exact: true });
  await expect(roleField).toHaveValue("Defensor/a solicitante");
  await expect(roleField).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("SPOA u otro identificador").fill(spoa);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  if (configureServices) await configureServices();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page
    .getByLabel("Confirmo que la información está completa para radicar")
    .check();
  await page.getByRole("button", { name: "Radicar solicitud" }).click();
}

async function submitVictims(page, externalId, configureServices) {
  const roleField = page.getByRole("textbox", { name: "Rol", exact: true });
  await expect(roleField).toHaveValue("Representante judicial de víctimas");
  await expect(roleField).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Identificador o radicado").fill(externalId);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByLabel("Identificación persona 1")).toBeVisible();
  await expect(page.getByLabel("Identificación persona 2")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  if (configureServices) await configureServices();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Confirmo el envío a aprobación previa").check();
  await page
    .getByRole("button", { name: "Enviar a aprobación previa" })
    .click();
}

async function expectNoInternalPresentationText(page) {
  const visibleText = await page.locator("body").innerText();
  expect(visibleText).not.toMatch(
    /\b(?:demo|sint[eé]tico|semilla|temporal)\b|DEC-|estrategia\s+demo|(?:25|40|45)\s+d[ií]as|m[aá]ximo\s+(?:5|6)/i,
  );
}

test.beforeEach(async ({ page }) => {
  await resetPresentation(page);
});

test("Víctimas confirma el envío y permite registrar otra solicitud con archivo o SharePoint", async ({
  page,
}) => {
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-rjv" });
  await submitVictims(page, "RAD-CONTINUO-1", async () => {
    await page.getByLabel("Cargar archivo documental 1").setInputFiles({
      name: "Solicitud-F163.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(exampleReportPdf("F163")),
    });
    await expect(page.getByLabel("Referencia documental 1")).toHaveValue(
      "Solicitud-F163.pdf",
    );
    await expect(
      page.getByText("Archivo seleccionado: Solicitud-F163.pdf"),
    ).toBeVisible();
  });
  await expect(
    page.getByRole("region", { name: "Confirmación de solicitud de Víctimas" }),
  ).toContainText("RAD-CONTINUO-1");
  await page.getByRole("button", { name: "Crear una nueva solicitud" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByLabel("Identificador o radicado")).toHaveValue("");
  await page.getByLabel("Identificador o radicado").fill("RAD-CONTINUO-2");
  await page
    .getByLabel("Proceso", { exact: true })
    .fill("Proceso de reparación 2");
  await page
    .getByLabel("Hechos", { exact: true })
    .fill("Hechos de la nueva solicitud pericial.");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByLabel("Identificación persona 1")).toHaveValue("");
  await page.getByLabel("Identificación persona 1").fill("Persona vinculada C");
  await page.getByLabel("Parentesco o relación").fill("Víctima directa");
  await page.getByLabel("Núcleo familiar").fill("Núcleo C");
  await page.getByLabel("Teléfono", { exact: true }).fill("3000000003");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page
    .getByLabel("URL de SharePoint documental 1")
    .fill("https://entidad.sharepoint.com/documentos/F163.pdf");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Confirmo el envío a aprobación previa").check();
  await page
    .getByRole("button", { name: "Enviar a aprobación previa" })
    .click();
  await expect(
    page.getByRole("region", { name: "Confirmación de solicitud de Víctimas" }),
  ).toContainText("RAD-CONTINUO-2");
  await expect(requestCard(page, "RAD-CONTINUO-1")).toHaveCount(1);
  await expect(requestCard(page, "RAD-CONTINUO-2")).toHaveCount(1);
});

test("F163 mantiene su tipo al cargar un archivo y la omisión se corrige antes de enviar", async ({
  page,
}) => {
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-rjv" });
  let intakePosts = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().endsWith("/api/demo/victimas/solicitudes")
    )
      intakePosts += 1;
  });
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page
    .getByLabel("Identificador o radicado")
    .fill("RAD-F163-CLASIFICACION");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByLabel("Tipo documental 1")).toHaveValue("F163");
  await expect(page.getByLabel("Tipo documental 1")).toBeDisabled();
  await page.getByLabel("Referencia documental 1").fill("");
  await page.getByRole("button", { name: "Agregar documento" }).click();
  await page
    .getByLabel("Tipo documental 2")
    .selectOption("SENTENCIA_EJECUTORIADA");
  await page.getByLabel("Cargar archivo documental 2").setInputFiles({
    name: "Anexo.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(exampleReportPdf("ANEXO")),
  });
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("alert")).toContainText("Falta el F163");
  expect(intakePosts).toBe(0);
  await page.getByLabel("Cargar archivo documental 1").setInputFiles({
    name: "Solicitud-F163.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(exampleReportPdf("F163")),
  });
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Confirmo el envío a aprobación previa").check();
  await page
    .getByRole("button", { name: "Enviar a aprobación previa" })
    .click();
  await expect(
    page.getByRole("region", { name: "Confirmación de solicitud de Víctimas" }),
  ).toContainText("RAD-F163-CLASIFICACION");
  expect(intakePosts).toBe(1);
  await requestCard(page, "RAD-F163-CLASIFICACION")
    .getByRole("button", { name: "Ver detalle del caso" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Solicitud-F163.pdf");
});

test("RJV puede descargar el F171 inicial", async ({ page }) => {
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-rjv" });
  await page.getByRole("button", { name: "Cerrados" }).click();
  const card = requestCard(page, "RAD-2026-0001");
  const downloadPromise = page.waitForEvent("download");
  await card
    .getByRole("button", { name: "Descargar PDF · F171-2026-0001.pdf" })
    .click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "F171-2026-0001.pdf",
  );
  expect(await page.locator("body").innerText()).not.toMatch(/ficticio/i);
});

test("Víctimas conserva los campos F163 y los muestra en el detalle de la solicitud", async ({
  page,
}) => {
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-rjv" });
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Identificador o radicado").fill("RAD-F163-UI");
  await page
    .getByLabel("Delito(s)", { exact: true })
    .fill("Desplazamiento forzado");
  await page
    .getByLabel("Autoridad judicial", { exact: true })
    .fill("Juzgado ficticio 23");
  await page
    .getByLabel("Medidas solicitadas o pretensiones")
    .fill("Valoración de daños");
  await page.getByRole("button", { name: "Siguiente" }).click();
  const person = page.locator(".person-row").first();
  await person
    .getByLabel("Fecha de nacimiento", { exact: true })
    .fill("1980-01-01");
  await person
    .getByLabel("Fecha del hecho", { exact: true })
    .fill("2005-04-01");
  await person
    .getByLabel("Municipio actual", { exact: true })
    .fill("Municipio ficticio");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Confirmo el envío a aprobación previa").check();
  await page
    .getByRole("button", { name: "Enviar a aprobación previa" })
    .click();
  await requestCard(page, "RAD-F163-UI")
    .getByRole("button", { name: "Ver detalle del caso" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Juzgado ficticio 23");
  await expect(dialog).toContainText("Desplazamiento forzado");
  await expect(dialog).toContainText("2005-04-01");
  await expect(dialog).toContainText("Municipio ficticio");
});

test("Víctimas permite al perito declarar improcedencia y deja la constancia visible al RJV", async ({
  page,
}) => {
  await chooseProfile(page, {
    area: "VICTIMAS",
    userId: "demo-perito-psicologia",
  });
  const card = requestCard(page, "RAD-2026-0003");
  await card.getByText("Declarar improcedencia", { exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Registrar improcedencia" }),
  ).toBeDisabled();
  await card
    .getByLabel("Causal de improcedencia", { exact: true })
    .fill("Causal técnica ficticia");
  await card
    .getByLabel("Constancia motivada", { exact: true })
    .fill("No se puede desarrollar el encargo por la causa documentada.");
  await card
    .getByLabel("Referencia del soporte de improcedencia", { exact: true })
    .fill("CONSTANCIA-UI");
  await card.getByRole("button", { name: "Registrar improcedencia" }).click();
  await page.getByRole("button", { name: "Cerrados" }).click();
  await expect(card).toContainText("Improcedente");
  await expect(
    card.getByRole("button", { name: "Iniciar", exact: true }),
  ).toHaveCount(0);
  await logout(page);
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-rjv" });
  await page.getByRole("button", { name: "Cerrados" }).click();
  await expect(card).toContainText("CONSTANCIA-UI");
  await expect(card).toContainText(
    "El envío por correo requiere configurar el servicio institucional",
  );
});

test("F171 muestra la guía psicológica y reserva el PDF frente al PAG", async ({
  page,
}) => {
  await chooseProfile(page, {
    area: "VICTIMAS",
    userId: "demo-perito-psicologia",
  });
  const card = requestCard(page, "RAD-2026-0003");
  await card.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.getByRole("button", { name: "En ejecución" }).click();
  await expect(card).toContainText("Desarrollo psicológico");
  await card
    .getByLabel("Número del informe F171", { exact: true })
    .fill("F171-UI-RESERVADO");
  await card.getByLabel("Forma de entrega").selectOption("PDF");
  await card.getByLabel("Documento PDF", { exact: true }).setInputFiles({
    name: "Informe-F171.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(exampleReportPdf("F171")),
  });
  await card
    .getByRole("button", { name: "Finalizar con F-171", exact: true })
    .click();
  await page.getByRole("button", { name: "Cerrados" }).click();
  await expect(card.getByRole("button", { name: /Descargar PDF/ })).toHaveCount(
    1,
  );
  await logout(page);
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-pag-victimas" });
  await page.getByRole("button", { name: "Cerrados" }).click();
  await expect(card.getByRole("button", { name: /Descargar PDF/ })).toHaveCount(
    0,
  );
  await card.getByRole("button", { name: "Ver detalle del caso" }).click();
  await expect(page.getByRole("dialog")).toContainText("F171 reservado");
  await expect(page.getByRole("dialog")).not.toContainText("F171-UI-RESERVADO");
});

test("Investigación conserva un envío rechazado y permite radicar dos solicitudes consecutivas", async ({
  page,
}) => {
  await chooseProfile(page, { userId: "demo-defensor" });
  await expect(
    page.getByRole("textbox", { name: "Nombre", exact: true }),
  ).toHaveValue("Laura Méndez");
  await expect(
    page.getByRole("textbox", { name: "Correo", exact: true }),
  ).toHaveValue("laura.mendez@sigip.example");
  const endpoint = "**/api/demo/investigacion/solicitudes";
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        message: "No fue posible radicar esta solicitud",
      }),
    }),
  );
  await submitInvestigation(page, "110016000049202600093", async () => {
    const search = page.getByRole("searchbox", { name: "Buscar servicio" });
    await search.fill("medicina");
    await expect(
      page.getByLabel("Medicina forense", { exact: true }),
    ).toBeVisible();
    await search.fill("");
    await expect(
      page.locator(".service-selector input[type=checkbox]"),
    ).toHaveCount(19);
  });
  await expect(
    page.getByText("No fue posible radicar esta solicitud"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Radicar una nueva solicitud" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Radicar solicitud", exact: true }),
  ).toBeEnabled();
  await page.unroute(endpoint);
  await page
    .getByRole("button", { name: "Radicar solicitud", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Confirmación de radicación" }),
  ).toContainText("110016000049202600093");
  await expect(
    page.getByRole("button", { name: "Radicar solicitud", exact: true }),
  ).toHaveCount(0);
  await expect(requestCard(page, "110016000049202600093")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Radicar una nueva solicitud" })
    .click();
  await expect(page.getByLabel("Identificación persona 1")).toHaveValue("");
  await page.getByLabel("Identificación persona 1").fill("Persona vinculada");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page
    .getByLabel("SPOA u otro identificador")
    .fill("110016000049202600094");
  await page.getByLabel("Proceso o caso").fill("Proceso consecutivo 94");
  await page.getByLabel("Delito o conducta").fill("Hurto");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page
    .getByLabel("Hechos", { exact: true })
    .fill("Se solicita verificar los hechos del caso.");
  await page
    .getByLabel("Hipótesis", { exact: true })
    .fill("Contrastar la ubicación con los registros.");
  await page
    .getByLabel("Labores requeridas")
    .fill("Verificar el lugar y entrevistar a los testigos.");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Referencia documental 1").fill("SOLICITUD-94");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page
    .getByLabel("Confirmo que la información está completa para radicar")
    .check();
  await page
    .getByRole("button", { name: "Radicar solicitud", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Confirmación de radicación" }),
  ).toContainText("110016000049202600094");
  await expect(requestCard(page, "110016000049202600093")).toHaveCount(1);
  await expect(requestCard(page, "110016000049202600094")).toHaveCount(1);
});

test("Víctimas permite devolver, corregir, reenviar, aprobar y completar", async ({
  page,
}) => {
  const externalId = "RAD-2026-0098";
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-rjv" });
  await expect(
    page.getByLabel(/perito asignado|funcionario responsable/i),
  ).toHaveCount(0);
  await submitVictims(page, externalId, async () => {
    await page
      .getByLabel("Liquidación de daño material y perjuicios económicos")
      .check();
  });
  await expect(
    page.getByText("Solicitud de Víctimas enviada a aprobación previa"),
  ).toBeVisible();
  await expect(requestCard(page, externalId)).toContainText(
    "Pendiente aprobación PAG",
  );

  await logout(page);
  await chooseProfile(page, {
    area: "VICTIMAS",
    userId: "demo-pag-victimas",
  });
  const pagCard = requestCard(page, externalId);
  const approvedSibling = pagCard.locator(".item-card").filter({
    hasText: "Liquidación de daño material y perjuicios económicos",
  });
  await approvedSibling
    .getByRole("button", { name: "Aprobar solicitud" })
    .click();
  await expect(
    requestCard(page, externalId).locator(".item-card").filter({
      hasText: "Liquidación de daño material y perjuicios económicos",
    }),
  ).toContainText("Asignada");
  const returnedItem = requestCard(page, externalId)
    .locator(".item-card")
    .filter({ hasText: "Evaluación psicológica pericial" });
  await returnedItem
    .getByLabel("Observación para devolución")
    .fill("Adjuntar soporte de parentesco");
  await returnedItem
    .getByRole("button", { name: "Devolver solicitud" })
    .click();
  await expect(
    page.getByText("Solicitud devuelta al RJV para corrección"),
  ).toBeVisible();
  await expect(requestCard(page, externalId)).toContainText(
    "Devuelta para corrección",
  );

  await logout(page);
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-rjv" });
  const returnedCard = requestCard(page, externalId)
    .locator(".item-card")
    .filter({ hasText: "Evaluación psicológica pericial" });
  await returnedCard
    .getByRole("button", { name: "Abrir asistente de corrección" })
    .click();
  const correctionDialog = page.getByRole("dialog");
  await expect(correctionDialog).toContainText(
    "Adjuntar soporte de parentesco",
  );
  await expect(
    correctionDialog.getByLabel("Identificador externo corregido"),
  ).toHaveValue(externalId);
  await expect(correctionDialog.getByLabel("Proceso corregido")).toHaveValue(
    "Proceso de reparación 2026-0004",
  );

  await correctionDialog.getByRole("button", { name: "Siguiente" }).click();
  await expect(
    correctionDialog.getByLabel("Identificación persona 1"),
  ).toHaveValue("Persona vinculada A");
  await expect(
    correctionDialog.getByLabel("Referencia documental 1"),
  ).toHaveValue("REF-FORM-2026-0004");
  await correctionDialog.getByRole("button", { name: "Siguiente" }).click();
  await expect(
    correctionDialog.getByText("No hay cambios reales para reenviar."),
  ).toBeVisible();
  await expect(
    correctionDialog.getByRole("button", {
      name: "Reenviar corrección al PAG",
    }),
  ).toBeDisabled();

  await correctionDialog.getByRole("button", { name: "Anterior" }).click();
  await correctionDialog.getByLabel("Teléfono").first().fill("3000000099");
  await correctionDialog
    .getByLabel("Referencia documental 1")
    .fill("REF-FORM-2026-0004-CORREGIDO");
  await correctionDialog.getByRole("button", { name: "Anterior" }).click();
  await correctionDialog
    .getByLabel("Proceso corregido")
    .fill("Proceso de reparación 2026-0004 corregido");
  await correctionDialog
    .getByLabel("Hechos corregidos")
    .fill("Hechos corregidos con el soporte familiar verificado.");
  await correctionDialog.getByRole("button", { name: "Siguiente" }).click();
  await correctionDialog.getByRole("button", { name: "Siguiente" }).click();
  await expect(
    correctionDialog.getByText("Versión que será creada"),
  ).toBeVisible();
  await expect(correctionDialog).toContainText("Valor anterior");
  await expect(correctionDialog).toContainText("Valor nuevo");
  await expect(correctionDialog).toContainText("REF-FORM-2026-0004-CORREGIDO");
  const resendButton = correctionDialog.getByRole("button", {
    name: "Reenviar corrección al PAG",
  });
  await expect(resendButton).toBeDisabled();
  await correctionDialog
    .getByLabel("Descripción obligatoria de la corrección")
    .fill("Se corrigieron caso, contacto y referencia documental");
  await expect(resendButton).toBeEnabled();
  await resendButton.click();
  await expect(
    page.getByText("Solicitud corregida y reenviada al PAG"),
  ).toBeVisible();
  await expect(requestCard(page, externalId)).toContainText(
    "Pendiente aprobación PAG",
  );
  await requestCard(page, externalId)
    .locator(".item-card")
    .filter({ hasText: "Evaluación psicológica pericial" })
    .getByRole("button", { name: "Ver detalle del caso" })
    .click();
  await expect(page.getByText("Versión 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Versión 1", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/DEVUELTA \(Adjuntar soporte de parentesco\)/),
  ).toBeVisible();
  await expect(
    page.getByText("Historial de correcciones y diferencias"),
  ).toBeVisible();
  await expect(
    page.getByText("Información vigente de la solicitud"),
  ).toBeVisible();
  await expect(page.getByText("3000000099")).toBeVisible();
  await expect(
    page.getByText("REF-FORM-2026-0004-CORREGIDO", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar detalle" }).click();

  const siblingAfterCorrection = requestCard(page, externalId)
    .locator(".item-card")
    .filter({
      hasText: "Liquidación de daño material y perjuicios económicos",
    });
  await expect(siblingAfterCorrection).toContainText("Asignada");
  await siblingAfterCorrection
    .getByRole("button", { name: "Ver detalle del caso" })
    .click();
  const approvedData = page.getByRole("dialog").locator(".approved-data");
  await expect(approvedData).toContainText("Proceso de reparación 2026-0004");
  await expect(approvedData).toContainText("3000000001");
  await expect(approvedData).toContainText("REF-FORM-2026-0004");
  await expect(approvedData).not.toContainText("3000000099");
  await page.getByRole("button", { name: "Cerrar detalle" }).click();

  await logout(page);
  await chooseProfile(page, {
    area: "VICTIMAS",
    userId: "demo-perito-financiero",
  });
  const firstVersionExpertCard = requestCard(page, externalId);
  await expect(firstVersionExpertCard).toContainText(
    "Datos aprobados aplicables a este encargo",
  );
  await expect(firstVersionExpertCard).toContainText("Versión 1");
  await firstVersionExpertCard
    .getByRole("button", { name: "Ver detalle del caso" })
    .click();
  const firstVersionDetail = page.getByRole("dialog");
  const firstVersionApplicable = firstVersionDetail.locator(".approved-data");
  await expect(firstVersionApplicable).toContainText(
    "Proceso de reparación 2026-0004",
  );
  await expect(firstVersionApplicable).toContainText("3000000001");
  await expect(firstVersionApplicable).toContainText("REF-FORM-2026-0004");
  await expect(firstVersionApplicable).toContainText(
    "Liquidación de daño material y perjuicios económicos",
  );
  await expect(firstVersionApplicable).toContainText("Bogotá");
  await expect(firstVersionApplicable).toContainText("Ley 1448");
  await expect(firstVersionDetail).not.toContainText(
    "Información vigente de la solicitud",
  );
  await expect(firstVersionDetail).not.toContainText("3000000099");
  await expect(firstVersionDetail).not.toContainText(
    "REF-FORM-2026-0004-CORREGIDO",
  );
  await expect(firstVersionDetail).not.toContainText(/SVC_|DEC-/);
  await page.getByRole("button", { name: "Cerrar detalle" }).click();

  await logout(page);
  await chooseProfile(page, {
    area: "VICTIMAS",
    userId: "demo-pag-victimas",
  });
  const correctedForPag = requestCard(page, externalId)
    .locator(".item-card")
    .filter({ hasText: "Evaluación psicológica pericial" });
  await correctedForPag
    .getByRole("button", { name: "Ver detalle del caso" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Proceso de reparación 2026-0004 corregido",
  );
  await expect(page.getByRole("dialog")).toContainText("3000000099");
  await expect(page.getByRole("dialog")).toContainText(
    "REF-FORM-2026-0004-CORREGIDO",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Información vigente de la solicitud",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Historial de correcciones y diferencias",
  );
  await page.getByRole("button", { name: "Cerrar detalle" }).click();
  await requestCard(page, externalId)
    .locator(".item-card")
    .filter({ hasText: "Evaluación psicológica pericial" })
    .getByRole("button", { name: "Aprobar solicitud" })
    .click();
  await expect(
    page.getByText(
      "Aprobación registrada; el reparto automático fue procesado",
    ),
  ).toBeVisible();
  await expect(requestCard(page, externalId)).toContainText("Asignada");

  await logout(page);
  await chooseProfile(page, {
    area: "VICTIMAS",
    userId: "demo-perito-psicologia",
  });
  const secondVersionExpertCard = requestCard(page, externalId);
  await expect(secondVersionExpertCard).toContainText(
    "Datos aprobados aplicables a este encargo",
  );
  await expect(secondVersionExpertCard).toContainText("Versión 2");
  await secondVersionExpertCard
    .getByRole("button", { name: "Ver detalle del caso" })
    .click();
  const secondVersionDetail = page.getByRole("dialog");
  const secondVersionApplicable = secondVersionDetail.locator(".approved-data");
  await expect(secondVersionApplicable).toContainText(
    "Proceso de reparación 2026-0004 corregido",
  );
  await expect(secondVersionApplicable).toContainText("3000000099");
  await expect(secondVersionApplicable).toContainText(
    "REF-FORM-2026-0004-CORREGIDO",
  );
  await expect(secondVersionDetail).not.toContainText(
    "Información vigente de la solicitud",
  );
  await expect(secondVersionDetail).not.toContainText(/SVC_|DEC-/);
  await page.getByRole("button", { name: "Cerrar detalle" }).click();
  await requestCard(page, externalId)
    .getByRole("button", { name: "Iniciar" })
    .click();
  await page.getByRole("button", { name: "En ejecución" }).click();
  const executionCard = requestCard(page, externalId);
  await executionCard.getByText("Reportar problema", { exact: true }).click();
  await executionCard
    .getByLabel("Causal del problema")
    .fill("Soporte ilegible");
  await executionCard
    .getByLabel("Descripción del problema")
    .fill("El anexo remitido requiere una referencia legible");
  await executionCard
    .getByLabel("Soporte o referencia del problema")
    .fill("ANEXO-VIC-E2E-98");
  await executionCard.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(
    page.getByText("Problema registrado sin alterar el estado del ítem"),
  ).toBeVisible();
  await expect(requestCard(page, externalId)).toContainText("En ejecución");
  const reloadedExecutionCard = requestCard(page, externalId);
  await reloadedExecutionCard.getByText(/Problemas reportados · 1/).click();
  await expect(reloadedExecutionCard).toContainText("ANEXO-VIC-E2E-98");
  await reloadedExecutionCard
    .getByLabel("Descripción de la actuación")
    .fill(
      "Se verificaron las fuentes y se registraron hallazgos para el informe.",
    );
  await reloadedExecutionCard
    .getByRole("button", { name: "Registrar actuación" })
    .click();
  await reloadedExecutionCard
    .getByLabel("Forma de entrega")
    .selectOption("PDF");
  await reloadedExecutionCard
    .getByLabel("Documento PDF", { exact: true })
    .setInputFiles({
      name: "Informe-F171.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(exampleReportPdf("F171")),
    });
  await expect(
    reloadedExecutionCard.getByText(/Listo para entregar: Informe-/),
  ).toBeVisible();
  await reloadedExecutionCard
    .getByRole("button", { name: "Finalizar con F-171" })
    .click();
  await page.getByRole("button", { name: "Cerrados" }).click();
  await expect(requestCard(page, externalId)).toContainText("Cerrada");
  await expect(
    requestCard(page, externalId).getByRole("button", {
      name: /Descargar PDF/,
    }),
  ).toBeVisible();
});

test("Investigación completa reparto, ejecución y aprobación PAG", async ({
  page,
}) => {
  const spoa = "110016000049202600098";
  await chooseProfile(page, { userId: "demo-defensor" });
  await expect(
    page.getByLabel(/investigador asignado|funcionario responsable/i),
  ).toHaveCount(0);
  await submitInvestigation(page, spoa);
  await expect(
    requestCard(page, spoa).getByRole("button", {
      name: /reparto|reintentar/i,
    }),
  ).toHaveCount(0);
  await expect(requestCard(page, spoa)).toContainText("Asignada");

  await logout(page);
  await chooseProfile(page, { userId: "demo-investigador" });
  await requestCard(page, spoa)
    .getByRole("button", { name: "Iniciar" })
    .click();
  await page.getByRole("button", { name: "En ejecución" }).click();
  const executionCard = requestCard(page, spoa);
  await executionCard.getByText("Reportar problema", { exact: true }).click();
  await executionCard
    .getByLabel("Causal del problema")
    .fill("Insumo incompleto");
  await executionCard
    .getByLabel("Descripción del problema")
    .fill("Falta una referencia para continuar la labor");
  await executionCard
    .getByLabel("Soporte o referencia del problema")
    .fill("ANEXO-INV-E2E-98");
  await executionCard.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(
    page.getByText("Problema registrado sin alterar el estado del ítem"),
  ).toBeVisible();
  await expect(requestCard(page, spoa)).toContainText("En ejecución");
  const reloadedExecutionCard = requestCard(page, spoa);
  await reloadedExecutionCard.getByText(/Problemas reportados · 1/).click();
  await expect(reloadedExecutionCard).toContainText("ANEXO-INV-E2E-98");
  await reloadedExecutionCard
    .getByLabel("Descripción de la actuación")
    .fill(
      "Se verificaron las fuentes y se registraron hallazgos para el informe.",
    );
  await reloadedExecutionCard
    .getByRole("button", { name: "Registrar actuación" })
    .click();
  await reloadedExecutionCard
    .getByLabel("Referencia del informe")
    .fill("INF-2026-E2E-98");
  await reloadedExecutionCard
    .getByRole("button", { name: "Entregar informe" })
    .click();

  await logout(page);
  await chooseProfile(page, { userId: "demo-pag-investigacion" });
  await page.getByRole("button", { name: "Por revisar" }).click();
  await expect(
    requestCard(page, spoa).getByRole("button", {
      name: "Aprobar informe verificado",
    }),
  ).toBeDisabled();
  await requestCard(page, spoa)
    .getByLabel("Constancia del formulario de verificación")
    .fill("VERIFICACION-FIRMADA-E2E-98");
  await requestCard(page, spoa)
    .getByLabel(
      "Confirmo que revisé el informe y registré su constancia de verificación",
    )
    .check();
  await requestCard(page, spoa)
    .getByRole("button", { name: "Aprobar informe verificado" })
    .click();
  await expect(
    page.getByText(
      "Entrega aprobada; pendiente acreditar el envío al defensor",
    ),
  ).toBeVisible();
  await logout(page);
  await chooseProfile(page, { userId: "demo-investigador" });
  await page.getByRole("button", { name: "En ejecución" }).click();
  await requestCard(page, spoa)
    .getByLabel("Constancia del envío al defensor")
    .fill("CORREO-DEFENSOR-E2E-98");
  await requestCard(page, spoa)
    .getByRole("button", { name: "Registrar envío y cerrar" })
    .click();
  await page.getByRole("button", { name: "Cerrados" }).click();
  await expect(requestCard(page, spoa)).toContainText("Cerrada");

  await logout(page);
  await chooseProfile(page, { userId: "demo-gestor-regional-investigacion" });
  const reportedProblem = page
    .locator(".role-problem-list article")
    .filter({ hasText: "ANEXO-INV-E2E-98" });
  await expect(reportedProblem).toBeVisible();
  await expect(reportedProblem).toContainText(
    "Estado conservado: En ejecución",
  );
});

test("PAG ve supervisión central, filtra personal y el Defensor Regional conserva alcance territorial", async ({
  page,
}) => {
  await chooseProfile(page, { userId: "demo-pag-investigacion" });
  const panel = page.getByRole("region", {
    name: "Supervisión de Investigación",
  });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Toda el área de Investigación");
  await expect(panel.getByRole("row")).toHaveCount(21);
  await panel.getByLabel("Buscar investigador").fill("informática");
  await expect(panel.getByRole("row")).toHaveCount(2);
  await expect(panel).toContainText("Nicolás León");
  await panel.getByLabel("Buscar investigador").fill("");
  await panel
    .getByLabel("Disponibilidad", { exact: true })
    .selectOption("false");
  await expect(panel.getByRole("row")).toHaveCount(2);
  await expect(panel).toContainText("Valeria Castro");
  await panel.getByLabel("Disponibilidad", { exact: true }).selectOption("");
  await panel.getByLabel("Territorio del tablero").selectOption("META");
  await expect(
    panel
      .locator(".supervision-metrics article")
      .filter({ hasText: "Solicitudes" })
      .locator("strong"),
  ).toHaveText("1");
  await panel.getByLabel("Territorio del tablero").selectOption("");
  await page.screenshot({
    path: "../tmp/analisis_sigip/tablero-supervision.png",
  });
  await logout(page);
  await chooseProfile(page, { userId: "demo-defensor-regional" });
  await expect(panel).toContainText("Territorio autorizado: Bogotá");
  await expect(panel).not.toContainText("Ana Villalba");
  await expect(
    panel.getByLabel("Territorio del tablero").locator("option[value=META]"),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
  await logout(page);
  await chooseProfile(page, { userId: "demo-defensor" });
  await expect(panel).toHaveCount(0);
});

test("el catálogo compacto conserva detalles y búsqueda sin desplegar todos los servicios", async ({
  page,
}) => {
  await chooseProfile(page, { userId: "demo-defensor" });
  const catalog = page.locator(".service-catalog");
  await catalog
    .getByText("Consultar alcance, requisitos y producto", { exact: true })
    .click();
  await expect(catalog.locator(".catalog-service-detail")).toHaveCount(19);
  await expect(catalog.locator(".catalog-service-detail[open]")).toHaveCount(0);
  await catalog.getByLabel("Buscar en el catálogo").fill("ingenieria");
  await expect(catalog.locator(".catalog-service-detail")).toHaveCount(3);
  await catalog
    .getByText("Ingeniería ambiental", { exact: true })
    .first()
    .click();
  await expect(
    catalog.getByText("Producto esperado", { exact: true }).last(),
  ).toBeVisible();
  await expect(catalog).toContainText(
    "Análisis de informes técnicos-ambientales.",
  );
  await catalog.getByLabel("Buscar en el catálogo").fill("");
  await catalog.locator(".catalog-service-detail[open] summary").click();
  await catalog.screenshot({
    path: "../tmp/analisis_sigip/catalogo-compacto.png",
  });
});

test("el administrador conserva consulta y restablecimiento sin acciones operativas", async ({
  page,
}) => {
  await chooseProfile(page, { userId: "demo-admin" });
  await expect(
    page.getByRole("button", { name: "Restablecer información inicial" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aprobar solicitud" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Aprobar y cerrar" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Devolver informe" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Devolver solicitud" }),
  ).toHaveCount(0);
  await expectNoInternalPresentationText(page);
  await page.getByRole("button", { name: "Víctimas" }).click();
  await expect(
    page.getByText("Solicitud pericial", { exact: true }).first(),
  ).toBeVisible();
});

test("sin candidato muestra la cola pendiente y su explicación", async ({
  page,
}) => {
  const spoa = "110016000049202600097";
  await chooseProfile(page, { userId: "demo-defensor" });
  await submitInvestigation(page, spoa, async () => {
    await page
      .getByLabel("Verificación investigativa en terreno", { exact: true })
      .uncheck();
    await page
      .getByLabel("Análisis técnico balístico", { exact: true })
      .check();
    await page
      .getByLabel("Cobertura", { exact: true })
      .selectOption("CUNDINAMARCA");
  });
  const card = requestCard(page, spoa);
  await expect(card).toContainText("Pendiente de excepción");
  await expect(
    card.getByRole("button", { name: /reparto|reintentar/i }),
  ).toHaveCount(0);
  await expect(card).toContainText(/todos fueron excluidos/i);
  await expect(card).toContainText("Cobertura territorial no habilitada");
});

test("una solicitud conserva varios ítems y el catálogo separa servicio de especialidad", async ({
  page,
}) => {
  const spoa = "110016000049202600096";
  await chooseProfile(page, { userId: "demo-defensor" });
  await submitInvestigation(page, spoa, async () => {
    await page
      .getByLabel("Análisis técnico balístico", { exact: true })
      .check();
  });

  const card = requestCard(page, spoa);
  await expect(card.locator(".item-card")).toHaveCount(2);
  await expect(card).toContainText("Verificación investigativa en terreno");
  await expect(card).toContainText("Análisis técnico balístico");

  await page
    .getByText("Consultar alcance, requisitos y producto", { exact: true })
    .click();
  await page
    .locator(".service-catalog")
    .getByText("Verificación investigativa en terreno", { exact: true })
    .click();
  await expect(
    page.getByText("Especialidad o disciplina").first(),
  ).toBeVisible();
  await expect(page.getByText("Producto esperado").first()).toBeVisible();
  await expect(
    page.getByText("Plazo parametrizable por servicio").first(),
  ).toBeVisible();

  await logout(page);
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-rjv" });
  const victimsMultiItem = requestCard(page, "RAD-2026-0002");
  await expect(victimsMultiItem.locator(".item-card")).toHaveCount(2);
  await expect(victimsMultiItem).toContainText(
    "Evaluación psicológica pericial",
  );
  await expect(victimsMultiItem).toContainText(
    "Liquidación de daño material y perjuicios económicos",
  );
});

test("el recorrido principal permanece utilizable en viewport móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await chooseProfile(page, { userId: "demo-defensor" });
  await expect(
    page.getByRole("heading", { name: "Investigación", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Rol", exact: true }),
  ).toHaveValue("Defensor/a solicitante");
  await expect(
    page.getByText("Consultar alcance, requisitos y producto", { exact: true }),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await page
    .getByRole("button", { name: "Ver detalle del caso" })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Días restantes", { exact: true })).toHaveCount(
    0,
  );
  await expect(dialog.getByText("Oportunidad", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Cerrar detalle" }).click();
});

test("el asistente de corrección de Víctimas funciona en viewport móvil", async ({
  page,
}) => {
  const externalId = "RAD-MOVIL-CORRECCION-01";
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-rjv" });
  await submitVictims(page, externalId);
  await logout(page);
  await chooseProfile(page, {
    area: "VICTIMAS",
    userId: "demo-pag-victimas",
  });
  const pagItem = requestCard(page, externalId).locator(".item-card");
  await pagItem
    .getByLabel("Observación para devolución")
    .fill("Precisar contacto y soporte");
  await pagItem.getByRole("button", { name: "Devolver solicitud" }).click();
  await logout(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-rjv" });
  await requestCard(page, externalId)
    .getByRole("button", { name: "Abrir asistente de corrección" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Precisar contacto y soporte");
  await dialog
    .getByLabel("Hechos corregidos")
    .fill("Hechos precisados desde el asistente móvil.");
  let discardedChangesWarning = "";
  page.once("dialog", async (confirmation) => {
    discardedChangesWarning = confirmation.message();
    await confirmation.dismiss();
  });
  await dialog.getByRole("button", { name: "Cerrar" }).click();
  expect(discardedChangesWarning).toMatch(/cambios sin guardar/i);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Siguiente" }).click();
  await dialog.getByLabel("Teléfono").first().fill("3000000088");
  await dialog
    .getByLabel("Referencia documental 1")
    .fill("REF-FORM-MOVIL-CORREGIDO");
  await dialog.getByRole("button", { name: "Siguiente" }).click();
  await dialog
    .getByLabel("Descripción obligatoria de la corrección")
    .fill("Corrección verificada en viewport móvil");

  const overflow = await dialog.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await dialog
    .getByRole("button", { name: "Reenviar corrección al PAG" })
    .click();
  await expect(
    page.getByText("Solicitud corregida y reenviada al PAG"),
  ).toBeVisible();
  await expect(requestCard(page, externalId)).toContainText(
    "Pendiente aprobación PAG",
  );
});

test("el catálogo resulta visible por alcance sin exponer acciones o textos internos", async ({
  page,
}) => {
  const profiles = [
    { userId: "demo-defensor" },
    { userId: "demo-investigador" },
    { userId: "demo-pag-investigacion" },
    { userId: "demo-gestor-regional-investigacion" },
    { userId: "demo-gestor-central-excepciones" },
    { userId: "demo-defensor-regional" },
    { area: "VICTIMAS", userId: "demo-rjv" },
    { area: "VICTIMAS", userId: "demo-perito-psicologia" },
    { area: "VICTIMAS", userId: "demo-pag-victimas" },
  ];

  for (const profile of profiles) {
    await chooseProfile(page, profile);
    await page
      .getByText("Consultar alcance, requisitos y producto", { exact: true })
      .click();
    await page.locator(".catalog-service-detail > summary").first().click();
    await expect(
      page.getByText("Servicios o actividades incluidas").first(),
    ).toBeVisible();
    await expect(
      page.getByText("Especialidad o disciplina").first(),
    ).toBeVisible();
    await expect(
      page.getByText("Cobertura y plazo", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Producto esperado").first()).toBeVisible();
    await expect(
      page.getByText(/Plazo parametrizable por servicio/).first(),
    ).toBeVisible();
    await expectNoInternalPresentationText(page);
    await expect(
      page.getByRole("button", {
        name: /novedad|excepción manual|reasignar|transferir|prórroga|ampliación/i,
      }),
    ).toHaveCount(0);
    await logout(page);
  }
});

test("los perfiles adicionales recorren bandejas conservadoras sin acciones operativas", async ({
  page,
}) => {
  const profiles = [
    [
      "demo-gestor-regional-investigacion",
      "Continuidad operativa de Investigación",
    ],
    ["demo-gestor-central-excepciones", "Cola de excepciones de Investigación"],
    ["demo-defensor-regional", "Seguimiento territorial"],
  ];
  for (const [userId, heading] of profiles) {
    await chooseProfile(page, { userId });
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /validar y ejecutar reparto|reintentar reparto|reasignar|transferir|aprobar y cerrar|corregir y reenviar/i,
      }),
    ).toHaveCount(0);
    await logout(page);
  }
});

test("sin regla de plazo no presenta tarjetas de días, semáforo u oportunidad", async ({
  page,
}) => {
  await chooseProfile(page, { userId: "demo-defensor" });
  await expect(page.getByText("Días restantes", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("Semáforo", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Oportunidad", { exact: true })).toHaveCount(0);
  await expect(page.getByText("No calculable")).toHaveCount(0);
  await expect(page.getByText("Sin configuración aprobada")).toHaveCount(0);
});

test("actuación visible, validación de entrega, PDF descargable y nueva versión SharePoint", async ({
  page,
}) => {
  test.setTimeout(60000);
  const spoa = "110016000049202600097";
  await chooseProfile(page, { userId: "demo-defensor" });
  await submitInvestigation(page, spoa);
  await logout(page);
  await chooseProfile(page, { userId: "demo-investigador" });
  await requestCard(page, spoa)
    .getByRole("button", { name: "Iniciar", exact: true })
    .click();
  await page.getByRole("button", { name: "En ejecución" }).click();
  const card = requestCard(page, spoa);
  const textarea = card.getByLabel("Descripción de la actuación");
  await expect(
    card.getByRole("button", { name: "Registrar actuación" }),
  ).toBeDisabled();
  expect((await textarea.boundingBox()).height).toBeGreaterThanOrEqual(140);
  await textarea.fill(
    "Se verificó el lugar y se contrastaron testimonios.\nQueda pendiente anexar fotografías.",
  );
  await card.getByRole("button", { name: "Registrar actuación" }).click();
  await expect(
    card.getByText(
      "Actuación registrada. Puede verla en el historial de esta misión.",
    ),
  ).toBeVisible();
  await expect(card.locator(".activity-history")).toContainText(
    "Queda pendiente anexar fotografías.",
  );
  await expect(textarea).toHaveValue("");
  await page.reload();
  await expect(
    requestCard(page, spoa).locator(".activity-history"),
  ).toContainText("Se verificó el lugar");
  await card.getByLabel("Forma de entrega").selectOption("SHAREPOINT");
  await card
    .getByLabel("URL de SharePoint")
    .fill("https://example.com/informe.pdf");
  await card
    .getByRole("button", { name: "Entregar informe", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "El enlace debe usar HTTPS",
  );
  await expect(card.getByLabel("URL de SharePoint")).toHaveValue(
    "https://example.com/informe.pdf",
  );
  await card.getByLabel("Forma de entrega").selectOption("PDF");
  await card.getByLabel("Documento PDF", { exact: true }).setInputFiles({
    name: "Hallazgos.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(exampleReportPdf("MT-PRESENTACION")),
  });
  await expect(
    card.getByText("Listo para entregar: Hallazgos.pdf"),
  ).toBeVisible();
  await card
    .getByRole("button", { name: "Entregar informe", exact: true })
    .click();
  await page.getByRole("button", { name: "Por revisar" }).click();
  await expect(card).toContainText("Informe entregado");
  const downloadPromise = page.waitForEvent("download");
  await card
    .getByRole("button", { name: "Descargar PDF · Hallazgos.pdf" })
    .click();
  expect((await downloadPromise).suggestedFilename()).toBe("Hallazgos.pdf");
  await logout(page);
  await chooseProfile(page, { userId: "demo-pag-investigacion" });
  await page.getByRole("button", { name: "Por revisar" }).click();
  await card
    .getByLabel("Observación para devolución")
    .fill("Aclarar el contraste de fuentes.");
  await card.getByRole("button", { name: "Devolver informe" }).click();
  await logout(page);
  await chooseProfile(page, { userId: "demo-investigador" });
  await page.getByRole("button", { name: "En ejecución" }).click();
  await card.getByLabel("Forma de entrega").selectOption("SHAREPOINT");
  await card
    .getByLabel("URL de SharePoint")
    .fill("https://sigip.sharepoint.com/sites/informes/Hallazgos-v2.pdf");
  await card
    .getByRole("button", { name: "Entregar informe", exact: true })
    .click();
  await page.getByRole("button", { name: "Por revisar" }).click();
  await expect(
    card.getByRole("link", { name: "Abrir informe en SharePoint" }),
  ).toHaveAttribute(
    "href",
    "https://sigip.sharepoint.com/sites/informes/Hallazgos-v2.pdf",
  );
  await expect(card).toContainText("Versión 1 · DEVUELTO");
  await expect(card).toContainText("Versión 2 · ENTREGADO");
});

test("Investigación solicita prórroga y el gestor ve el control sin aplicar una política pendiente", async ({
  page,
}) => {
  await chooseProfile(page, { userId: "demo-investigador-mateo" });
  await page.getByRole("button", { name: "En ejecución" }).click();
  const card = requestCard(page, "110016000049202600001");
  await expect(card.getByRole("heading", { name: "2026-00001" })).toBeVisible();
  await card
    .getByText("Solicitar ampliación de términos", { exact: true })
    .click();
  await card
    .getByLabel("Motivo de ampliación")
    .fill("Falta insumo para diligencia de campo");
  await card.getByLabel("Soporte de ampliación").fill("SOPORTE-PRORROGA-E2E");
  await card
    .getByRole("button", { name: "Enviar solicitud de ampliación" })
    .click();
  await expect(card).toContainText("SOLICITADA");
  await expect(card).toContainText("Pendiente de política aprobada");
  await card.screenshot({ path: "../tmp/analisis_sigip/ajustes-prorroga.png" });
  await logout(page);
  await chooseProfile(page, { userId: "demo-gestor-regional-investigacion" });
  await page.getByRole("button", { name: "En ejecución" }).click();
  const managerCard = requestCard(page, "110016000049202600001");
  await managerCard
    .getByLabel("Observación de ampliación")
    .fill("Revisada la solicitud y su soporte");
  await managerCard.getByLabel("Días de ampliación").fill("3");
  await managerCard.getByRole("button", { name: "Aprobar ampliación" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "política aprobada y vigente",
  );
  await expect(managerCard).toContainText("SOLICITADA");
});

test("control y Excel respetan filtros y la bandeja ofrece constancia de asignación", async ({
  page,
}) => {
  await chooseProfile(page, { userId: "demo-pag-investigacion" });
  const control = page.locator(".investigation-control");
  await control.getByLabel("Regional del control").selectOption("ANTIOQUIA");
  const rows = control.getByRole("row");
  await expect(rows).toHaveCount(2);
  await expect(control).toContainText("Antioquia");
  const downloadPromise = page.waitForEvent("download");
  await control
    .getByRole("button", { name: "Descargar Excel", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "Control-misiones-Investigacion.xlsx",
  );
  expect(await download.failure()).toBeNull();
  await control.screenshot({
    path: "../tmp/analisis_sigip/ajustes-control.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await control.screenshot({
    path: "../tmp/analisis_sigip/ajustes-control-movil-panel.png",
  });
  await expect(
    control.getByRole("button", { name: "Descargar Excel", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../tmp/analisis_sigip/ajustes-control-movil.png",
    fullPage: true,
  });
  await logout(page);
  await chooseProfile(page, { userId: "demo-investigador" });
  await page.locator(".notification-tray summary").click();
  await expect(page.locator(".notification-tray")).toContainText(
    "Misión asignada",
  );
  await expect(page.locator(".notification-tray")).toContainText(
    "pendiente de configuración",
  );
});

test("portafolio y cobertura por servicio se consultan al radicar y el IRIS queda como referencia", async ({
  page,
}) => {
  await chooseProfile(page, { userId: "demo-defensor" });
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page
    .getByLabel("SPOA u otro identificador")
    .fill("000016000049202600099");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByLabel("Hechos", { exact: true })).toHaveAttribute(
    "maxlength",
    "10000",
  );
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page
    .getByLabel("Cobertura de Verificación investigativa en terreno")
    .selectOption("ANTIOQUIA");
  await page
    .getByText("Consultar alcance del servicio", { exact: true })
    .click();
  await expect(
    page.getByText("Exclusiones:", { exact: false }).last(),
  ).toBeVisible();
  await expect(page.getByText(/Tenga en cuenta los términos/)).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page
    .getByLabel("Confirmo que la información está completa para radicar")
    .check();
  await page.getByRole("button", { name: "Radicar solicitud" }).click();
  await expect(
    page.getByRole("heading", { name: /Solicitud INV-2026-\d{5} radicada/ }),
  ).toBeVisible();
  await expect(requestCard(page, "000016000049202600099")).toContainText(
    "Antioquia",
  );
  await logout(page);
  await chooseProfile(page, { userId: "demo-investigador-mateo" });
  await page.getByRole("button", { name: "En ejecución" }).click();
  const card = requestCard(page, "110016000049202600001");
  await card.getByLabel("Forma de entrega").selectOption("IRIS");
  await card.getByLabel("Radicado o expediente IRIS").fill("EXP-IRIS-E2E-1");
  await card.getByRole("button", { name: "Entregar informe" }).click();
  await page.getByRole("button", { name: "Por revisar" }).click();
  await expect(card).toContainText("Referencia sin verificar");
  await expect(card.getByRole("button", { name: /Descargar PDF/ })).toHaveCount(
    0,
  );
});
