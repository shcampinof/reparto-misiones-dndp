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
  await page.getByLabel("Número de radicado").fill(externalId);
  await expect(
    page.getByLabel(/perito asignado|funcionario responsable/i),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Enviar a aprobación previa" })
    .click();
  await expect(
    page.getByText("Solicitud de Víctimas enviada a aprobación PAG"),
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
  await pagCard
    .getByLabel("Observación para devolución")
    .fill("Adjuntar soporte de parentesco");
  await pagCard.getByRole("button", { name: "Devolver solicitud" }).click();
  await expect(
    page.getByText("Solicitud devuelta al RJV para corrección"),
  ).toBeVisible();
  await expect(requestCard(page, externalId)).toContainText(
    "Devuelta para corrección",
  );

  await logout(page);
  await chooseProfile(page, { area: "VICTIMAS", userId: "demo-rjv" });
  const returnedCard = requestCard(page, externalId);
  await returnedCard
    .getByLabel("Corrección realizada")
    .fill("Soporte incorporado");
  await returnedCard
    .getByRole("button", { name: "Corregir y reenviar" })
    .click();
  await expect(
    page.getByText("Solicitud corregida y reenviada al PAG"),
  ).toBeVisible();
  await expect(requestCard(page, externalId)).toContainText(
    "Pendiente aprobación PAG",
  );
  await requestCard(page, externalId)
    .getByRole("button", { name: "Ver detalle del caso" })
    .click();
  await expect(page.getByText("Versión 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Versión 1", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Devuelta: Adjuntar soporte de parentesco/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar detalle" }).click();

  await logout(page);
  await chooseProfile(page, {
    area: "VICTIMAS",
    userId: "demo-pag-victimas",
  });
  await requestCard(page, externalId)
    .getByRole("button", { name: "Aprobar y repartir" })
    .click();
  await expect(
    page.getByText("Aprobación previa y asignación automática completadas"),
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
  await executionCard
    .getByRole("button", { name: "Registrar actuación" })
    .click();
  await executionCard
    .getByLabel("Referencia del F-171")
    .fill("F171-2026-E2E-98");
  await executionCard
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
  await page.getByLabel("Número SPOA").fill(spoa);
  await expect(
    page.getByLabel(/investigador asignado|funcionario responsable/i),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Radicar solicitud" }).click();
  await requestCard(page, spoa)
    .getByRole("button", { name: "Validar y ejecutar reparto" })
    .click();
  await expect(requestCard(page, spoa)).toContainText("Asignada");

  await logout(page);
  await chooseProfile(page, { userId: "demo-investigador" });
  await requestCard(page, spoa)
    .getByRole("button", { name: "Iniciar" })
    .click();
  await page.getByRole("button", { name: "En ejecución" }).click();
  const executionCard = requestCard(page, spoa);
  await executionCard
    .getByRole("button", { name: "Registrar actuación" })
    .click();
  await executionCard
    .getByLabel("Referencia del informe")
    .fill("INF-2026-E2E-98");
  await executionCard.getByRole("button", { name: "Entregar informe" }).click();

  await logout(page);
  await chooseProfile(page, { userId: "demo-pag-investigacion" });
  await page.getByRole("button", { name: "Por revisar" }).click();
  await requestCard(page, spoa)
    .getByRole("button", { name: "Aprobar y cerrar" })
    .click();
  await page.getByRole("button", { name: "Cerrados" }).click();
  await expect(requestCard(page, spoa)).toContainText("Cerrada");
});

test("el administrador conserva consulta y restablecimiento sin acciones operativas", async ({
  page,
}) => {
  await chooseProfile(page, { userId: "demo-admin" });
  await expect(
    page.getByRole("button", { name: "Restablecer información inicial" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aprobar y repartir" }),
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
  await page.getByLabel("Número SPOA").fill(spoa);
  await page.getByLabel("Verificación investigativa en terreno").uncheck();
  await page.getByLabel("Análisis técnico balístico").check();
  await page.getByLabel("Cobertura").selectOption("CUNDINAMARCA");
  await page.getByRole("button", { name: "Radicar solicitud" }).click();
  await requestCard(page, spoa)
    .getByRole("button", { name: "Validar y ejecutar reparto" })
    .click();
  const card = requestCard(page, spoa);
  await expect(card).toContainText("Sin candidato / pendiente");
  await expect(card).toContainText(/todos fueron excluidos/i);
  await expect(card).toContainText("Cobertura territorial no habilitada");
});

test("una solicitud conserva varios ítems y el catálogo separa servicio de especialidad", async ({
  page,
}) => {
  const spoa = "110016000049202600096";
  await chooseProfile(page, { userId: "demo-defensor" });
  await page.getByLabel("Número SPOA").fill(spoa);
  await page.getByLabel("Análisis técnico balístico").check();
  await page.getByRole("button", { name: "Radicar solicitud" }).click();

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
    page.getByText(/pendientes de aprobación funcional/i).first(),
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
  await expect(page.getByLabel("Número SPOA")).toBeVisible();
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
  await expect(
    dialog.getByText("Días restantes", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("Oportunidad", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar detalle" }).click();
});

test("el catálogo resulta visible por alcance sin exponer acciones o textos internos", async ({
  page,
}) => {
  const profiles = [
    { userId: "demo-defensor" },
    { userId: "demo-investigador" },
    { userId: "demo-pag-investigacion" },
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
