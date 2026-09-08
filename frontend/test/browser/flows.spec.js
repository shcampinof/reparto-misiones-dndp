import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const BRAND = {
  shortName: "SIGIP-DP",
  mediumName: "SIGIP-DP — Gestión investigativa y pericial",
  fullName:
    "SIGIP-DP — Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo",
};

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
  await expect(page.getByText("Versión 2")).toBeVisible();
  await expect(page.getByText("Versión 1")).toBeVisible();
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
  await executionCard.getByRole("button", { name: "Guardar avance" }).click();
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
  await executionCard.getByRole("button", { name: "Guardar avance" }).click();
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
  await expect(page).toHaveTitle(BRAND.mediumName);
  await expect(page.locator(".login-heading .brand-name-full")).toHaveText(
    BRAND.fullName,
  );
  await expect(page.locator(".login-heading .brand-name-full")).toBeVisible();
  await chooseProfile(page, { userId: "demo-admin" });
  await expect(page.locator(".demo-brand > div > span")).toHaveText(
    BRAND.shortName,
  );
  await expect(page.locator(".demo-brand small")).toHaveText(BRAND.fullName);
  await expect(page.locator(".demo-brand small")).toBeVisible();
  await expect(page.locator(".demo-disclaimer .brand-name-full")).toHaveText(
    BRAND.fullName,
  );
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
  await expect(page.locator("body")).not.toContainText(
    /demo|sint[eé]tic|semilla|temporal/i,
  );
  await page.getByRole("button", { name: "Víctimas" }).click();
  await expect(
    page.getByText("Solicitud pericial", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator(".request-grid")).not.toContainText(BRAND.fullName);

  await logout(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".login-heading .brand-name-full")).toBeHidden();
  await expect(page.locator(".login-heading .brand-name-medium")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);

  await chooseProfile(page, { userId: "demo-admin" });
  await expect(page.locator(".demo-brand small")).toBeHidden();
  await expect(page.locator(".demo-brand > div > span")).toHaveText(
    BRAND.shortName,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);

  await logout(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator(".login-heading .brand-name-medium")).toBeHidden();
  await expect(page.locator(".login-heading .brand-name-short")).toBeVisible();
});

test("sin candidato muestra la cola pendiente y su explicación", async ({
  page,
}) => {
  const spoa = "110016000049202600097";
  await chooseProfile(page, { userId: "demo-defensor" });
  await page.getByLabel("Número SPOA").fill(spoa);
  await page.getByLabel("Especialidad").selectOption("BALISTICA");
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
