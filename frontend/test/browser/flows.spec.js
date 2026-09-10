import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

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
    .getByRole("button", { name: "Registrar actuación" })
    .click();
  await reloadedExecutionCard
    .getByLabel("Referencia del F-171")
    .fill("F171-2026-E2E-98");
  await reloadedExecutionCard
    .getByRole("button", { name: "Finalizar con F-171" })
    .click();
  await page.getByRole("button", { name: "Cerrados" }).click();
  await expect(requestCard(page, externalId)).toContainText("Cerrada");
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
  await requestCard(page, spoa)
    .getByRole("button", { name: "Aprobar y cerrar" })
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
    await page.getByLabel("Verificación investigativa en terreno").uncheck();
    await page.getByLabel("Análisis técnico balístico").check();
    await page.getByLabel("Cobertura").selectOption("CUNDINAMARCA");
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
    await page.getByLabel("Análisis técnico balístico").check();
  });

  const card = requestCard(page, spoa);
  await expect(card.locator(".item-card")).toHaveCount(2);
  await expect(card).toContainText("Verificación investigativa en terreno");
  await expect(card).toContainText("Análisis técnico balístico");

  await page
    .getByText("Consultar alcance, requisitos y producto", { exact: true })
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
    await expect(
      page.getByText("Servicios o actividades incluidas").first(),
    ).toBeVisible();
    await expect(
      page.getByText("Especialidad o disciplina").first(),
    ).toBeVisible();
    await expect(page.getByText("Cobertura").first()).toBeVisible();
    await expect(page.getByText("Producto esperado").first()).toBeVisible();
    await expect(page.getByText("Plazo").first()).toBeVisible();
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
