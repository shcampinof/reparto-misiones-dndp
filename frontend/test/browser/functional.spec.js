import { test, expect } from "@playwright/test";
import { exampleReportPdf } from "../../src/demo-pdf.js";
import { Buffer } from "node:buffer";

async function choose(page, userId, area = "INVESTIGACION") {
  await page.goto("/");
  if (area === "VICTIMAS")
    await page.getByRole("tab", { name: "Víctimas" }).click();
  await page.getByLabel("Perfil de acceso").selectOption(userId);
  await page.getByRole("button", { name: "Ingresar al portal" }).click();
  await expect(page.getByText("Solicitudes y encargos")).toBeVisible();
}
async function logout(page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
}
const card = (page, value) =>
  page.locator(".request-card").filter({ hasText: value });

test("interfaz sobria sin etiquetas de pruebas y detalle centrado accesible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({ path: "../tmp/analisis_sigip/interfaz-acceso.png" });
  await choose(page, "demo-defensor");
  await expect(page.locator("body")).not.toContainText(
    /entorno de pruebas|reglas operativas provisionales|ratificación funcional/i,
  );
  await page.screenshot({ path: "../tmp/analisis_sigip/interfaz-portal.png" });
  const opener = page
    .getByRole("button", { name: "Ver detalle del caso" })
    .first();
  await opener.click();
  const dialog = page.getByRole("dialog");
  const close = dialog.getByRole("button", { name: "Cerrar detalle" });
  await expect(close).toBeFocused();
  for (const width of [1440, 768, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    const bounds = await dialog.boundingBox();
    expect(Math.abs(bounds.x + bounds.width / 2 - width / 2)).toBeLessThan(2);
    expect(bounds.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../tmp/analisis_sigip/interfaz-detalle-${width}.png`,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog.getByRole("button", { name: "Documentos", exact: true }).click();
  const visibleControls = dialog.locator(
    "button:visible:not([disabled]), a:visible, input:visible:not([disabled]), select:visible:not([disabled]), textarea:visible:not([disabled]), summary:visible",
  );
  await visibleControls.last().focus();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(visibleControls.last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("radicación móvil guarda el PDF y permite descargarlo después de recargar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await choose(page, "demo-defensor");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page
    .getByLabel("SPOA u otro identificador")
    .fill("000016000049202600801");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Cargar archivo documental 1").setInputFiles({
    name: "Solicitud-prueba.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(exampleReportPdf("SOLICITUD")),
  });
  await expect(page.getByLabel("Referencia documental 1")).toHaveValue(
    "Solicitud-prueba.pdf",
  );
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page
    .getByLabel("Confirmo que la información está completa para radicar")
    .check();
  await page.getByRole("button", { name: "Radicar solicitud" }).click();
  await expect(
    page.getByText("Radicación confirmada", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await card(page, "000016000049202600801")
    .getByRole("button", { name: "Ver detalle del caso" })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Descargar archivo de solicitud" })
    .click();
  expect((await download).suggestedFilename()).toBe("Solicitud-prueba.pdf");
});

test("RJV solicita continuación con nueva víctima y PAG recibe un encargo vinculado", async ({
  page,
}) => {
  await choose(page, "demo-rjv", "VICTIMAS");
  await page.getByRole("button", { name: "Cerrados" }).click();
  const original = card(page, "RAD-2026-0001");
  await original
    .getByText("Solicitar ampliación o actualización del F171", { exact: true })
    .click();
  await original
    .getByLabel("Motivo de la continuación")
    .fill("Incorporar víctima indirecta a la valoración financiera");
  await original
    .getByLabel("Soporte de la continuación")
    .fill("F163 ampliación 001");
  await original
    .getByRole("button", { name: "Añadir víctima a la ampliación" })
    .click();
  await original
    .getByLabel("Identificación adicional 1")
    .fill("PERSONA-AMPLIADA-TEST");
  await original
    .getByLabel("Tipo de víctima adicional 1")
    .selectOption("INDIRECTA");
  await original.getByLabel("Parentesco adicional 1").fill("Hijo");
  await original.getByLabel("Núcleo familiar adicional 1").fill("NUCLEO-TEST");
  await original.getByLabel("Contacto adicional 1").fill("0000000000");
  await original
    .getByRole("button", { name: "Enviar continuación a aprobación" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Continuación enviada" }),
  ).toBeVisible();
  await logout(page);
  await choose(page, "demo-pag-victimas", "VICTIMAS");
  const pending = card(page, "RAD-2026-0001");
  await expect(pending).toContainText("Encargo vinculado");
  await pending.getByRole("button", { name: "Aprobar solicitud" }).click();
  await expect(card(page, "RAD-2026-0001")).toContainText("Santiago Acosta");
});

test("Investigación solicita y decide prórroga; PAG remite y recibe en regional con reparto automático", async ({
  page,
}) => {
  const loginResponse = await page.request.post("/api/auth/demo-login", {
    data: { userId: "demo-defensor" },
  });
  const { accessToken } = await loginResponse.json();
  const spoa = "000016000049202600802";
  const response = await page.request.post(
    "/api/demo/investigacion/solicitudes",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        identifierType: "SPOA",
        spoa,
        processReference: "Prueba de prórroga",
        delito: "Conducta",
        proceduralStage: "INVESTIGACION",
        hearingApplies: false,
        facts: "Hechos de prueba",
        hypothesis: "Hipótesis",
        requiredWork: "Verificar",
        differentialApproach: { applies: false },
        priority: { type: "ORDINARIA" },
        persons: [{ alias: "Persona", relationship: "Procesado" }],
        documents: [{ type: "SOLICITUD_DEFENSA", reference: "SOLICITUD" }],
        service: "SVC_INV_VERIFICACION_TERRENO",
        region: "BOGOTA",
      },
    },
  );
  expect(response.status()).toBe(201);
  const { request } = await response.json();
  const { accounts } = await (
    await page.request.get("/api/auth/demo-accounts")
  ).json();
  const executor = accounts.find(
    (account) => account.fullName === request.items[0].assigneeName,
  );
  await choose(page, executor.userId);
  await card(page, spoa)
    .getByRole("button", { name: "Iniciar", exact: true })
    .click();
  await page.getByRole("button", { name: "En ejecución" }).click();
  const execution = card(page, spoa);
  await execution
    .getByText("Solicitar ampliación de términos", { exact: true })
    .click();
  await execution
    .getByLabel("Motivo de ampliación")
    .fill("Pendiente un insumo");
  await execution.getByLabel("Soporte de ampliación").fill("CONSTANCIA");
  await execution
    .getByRole("button", { name: "Enviar solicitud de ampliación" })
    .click();
  await expect(execution).toContainText("SOLICITADA");
  await logout(page);
  await choose(page, "demo-gestor-regional-investigacion");
  await page.getByRole("button", { name: "En ejecución" }).click();
  const decision = card(page, spoa);
  await decision
    .getByLabel("Observación de ampliación")
    .fill("Soporte verificado");
  await decision.getByLabel("Días de ampliación").fill("3");
  await decision.getByRole("button", { name: "Aprobar ampliación" }).click();
  await expect(decision).toContainText("APROBADA");
  await logout(page);
  await choose(page, "demo-pag-investigacion");
  await page.getByRole("button", { name: "En ejecución" }).click();
  const referral = card(page, spoa);
  await referral
    .getByText("Remitir actividad a otra regional", { exact: true })
    .click();
  await referral
    .getByLabel("Servicio de la actividad derivada")
    .selectOption("SVC_INV_VERIFICACION_TERRENO");
  await referral
    .getByRole("combobox", { name: "Regional receptora" })
    .selectOption("ANTIOQUIA");
  await referral.getByLabel("Motivo de remisión").fill("Apoyo territorial");
  await referral.getByLabel("Actividades ya realizadas").fill("Entrevista");
  await referral
    .getByLabel("Actividades para la regional receptora")
    .fill("Arraigo");
  await referral
    .getByRole("button", { name: "Crear remisión vinculada" })
    .click();
  await page.getByRole("button", { name: "Pendientes" }).click();
  const receiving = card(page, spoa);
  await receiving
    .getByLabel("Observación de recepción")
    .fill("Encargo recibido en regional");
  await receiving
    .getByRole("button", { name: "Recibir y calcular reparto" })
    .click();
  await expect(receiving).toContainText("Asignada");
  await expect(receiving).toContainText("Antioquia");
});

for (const width of [360, 768, 1440]) {
  test(`interfaces y detalle sin desbordamiento a ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    for (const [user, area] of [
      ["demo-defensor", "INVESTIGACION"],
      ["demo-pag-investigacion", "INVESTIGACION"],
      ["demo-gestor-regional-investigacion", "INVESTIGACION"],
      ["demo-rjv", "VICTIMAS"],
    ]) {
      await choose(page, user, area);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page
        .getByRole("button", { name: "Ver detalle del caso" })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(
        await page
          .getByRole("dialog")
          .evaluate((element) => element.scrollWidth - element.clientWidth),
      ).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: testInfo.outputPath(`${user}-${width}.png`),
        fullPage: false,
      });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await logout(page);
    }
    expect(failures).toEqual([]);
  });
}

test("borrador privado recupera formulario después de recargar", async ({
  page,
}) => {
  await choose(page, "demo-defensor");
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page
    .getByLabel("SPOA u otro identificador")
    .fill("000016000049202600909");
  await page.getByText(/Borradores guardados/).click();
  await page.getByRole("button", { name: "Guardar borrador ahora" }).click();
  await expect(
    page.getByText("Borrador guardado en servidor", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByText(/Borradores guardados/).click();
  await page
    .locator(".draft-panel li")
    .filter({ hasText: "000016000049202600909" })
    .getByRole("button", { name: "Recuperar borrador" })
    .click();
  await expect(page.getByLabel("SPOA u otro identificador")).toHaveValue(
    "000016000049202600909",
  );
});

test("documentos del encargo cargan y reemplazan PDF conservando ambas descargas", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await choose(page, "demo-defensor");
  await page
    .getByRole("button", { name: "Ver detalle del caso" })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Documentos", exact: true }).click();
  await dialog
    .getByLabel("Motivo o actuación relacionada")
    .fill("Soporte de actuación de prueba");
  await dialog.getByLabel("Archivo de soporte PDF").setInputFiles({
    name: "Actuacion-prueba.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(exampleReportPdf("ACTUACION")),
  });
  await dialog
    .getByRole("button", { name: "Guardar documento", exact: true })
    .click();
  await expect(
    dialog.getByText("Documento guardado y confirmado en el servidor"),
  ).toBeVisible();
  await dialog.getByLabel("Documento a incorporar").selectOption({ index: 1 });
  await dialog
    .getByLabel("Motivo o actuación relacionada")
    .fill("Soporte corregido conservando original");
  await dialog.getByLabel("Archivo de soporte PDF").setInputFiles({
    name: "Actuacion-corregida.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(exampleReportPdf("ACTUACION-CORREGIDA")),
  });
  await dialog
    .getByRole("button", { name: "Guardar documento", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Descargar soporte versión 2" }),
  ).toBeVisible();
  const first = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Descargar soporte versión 1" })
    .click();
  expect((await first).suggestedFilename()).toBe("Actuacion-prueba.pdf");
  const receipt = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descargar constancia" }).click();
  expect((await receipt).suggestedFilename()).toMatch(/^constancia-.+\.html$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: testInfo.outputPath("documentos-movil.png"),
    fullPage: false,
  });
});

test("filtros combinados ocultan y recuperan encargos sin ampliar permisos", async ({
  page,
}) => {
  await choose(page, "demo-defensor");
  await page
    .getByLabel("Buscar misión, SPOA, radicado o responsable")
    .fill("NO-EXISTE-TEST");
  await expect(page.locator(".request-grid .request-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(
    page.locator(".request-grid .request-card").first(),
  ).toBeVisible();
  await page
    .locator(".request-filters")
    .getByLabel("Regional", { exact: true })
    .selectOption("BOGOTA");
  await page
    .locator(".role-trays")
    .getByRole("button", { name: /^En ejecución/ })
    .click();
  await expect(
    page.locator(".request-grid .request-card").first(),
  ).toBeVisible();
});

test("corrección de Víctimas envía el PDF seleccionado y conserva el anterior", async ({
  page,
}) => {
  const login = async (userId) =>
    (
      await (
        await page.request.post("/api/auth/demo-login", { data: { userId } })
      ).json()
    ).accessToken;
  const rjv = await login("demo-rjv"),
    pag = await login("demo-pag-victimas");
  const auth = (token) => ({ Authorization: `Bearer ${token}` });
  const original = Buffer.from(exampleReportPdf("F163-ORIGINAL"));
  const created = await page.request.post("/api/demo/victimas/solicitudes", {
    headers: auth(rjv),
    data: {
      submissionId: "correction-pdf-browser",
      externalId: "RAD-CORRECCION-PDF-BROWSER",
      law: "LEY_1448",
      region: "BOGOTA",
      service: "SVC_VIC_EVALUACION_PSICOLOGICA",
      caseData: {
        processReference: "Proceso de prueba",
        facts: "Hechos de prueba",
      },
      persons: [
        {
          alias: "PERSONA-TEST",
          type: "DIRECTA",
          familyGroup: "NUCLEO",
          contact: { phone: "0000000000" },
        },
      ],
      documents: [
        {
          type: "F163",
          reference: "F163-original.pdf",
          file: {
            name: "F163-original.pdf",
            mimeType: "application/pdf",
            contentBase64: original.toString("base64"),
          },
        },
      ],
    },
  });
  expect(created.ok()).toBeTruthy();
  const { request: record } = await created.json(),
    id = record.items[0].id;
  expect(
    (
      await page.request.post(
        `/api/demo/victimas/items/${id}/devolver-solicitud`,
        {
          headers: auth(pag),
          data: { observation: "Reemplazar PDF ilegible" },
        },
      )
    ).ok(),
  ).toBeTruthy();
  await choose(page, "demo-rjv", "VICTIMAS");
  const target = card(page, "RAD-CORRECCION-PDF-BROWSER");
  await target
    .getByRole("button", { name: "Abrir asistente de corrección" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Siguiente", exact: true }).click();
  await dialog.getByLabel("Cargar archivo documental 1").setInputFiles({
    name: "F163-corregido.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(exampleReportPdf("F163-CORREGIDO")),
  });
  await expect(dialog.getByLabel("Referencia documental 1")).toHaveValue(
    "F163-corregido.pdf",
  );
  await dialog.getByRole("button", { name: "Siguiente", exact: true }).click();
  await dialog
    .getByLabel("Descripción obligatoria de la corrección")
    .fill("Se reemplazó el PDF ilegible");
  await dialog.getByRole("button", { name: /Reenviar/ }).click();
  await expect(
    page.getByText("Solicitud corregida y reenviada al PAG", { exact: true }),
  ).toBeVisible();
  const before = await page.request.get(
      `/api/demo/victimas/items/${id}/documentos/0?version=1`,
      { headers: auth(rjv) },
    ),
    after = await page.request.get(
      `/api/demo/victimas/items/${id}/documentos/0?version=2`,
      { headers: auth(rjv) },
    );
  expect(before.ok()).toBeTruthy();
  expect(after.ok()).toBeTruthy();
  expect(await before.body()).toEqual(original);
  expect(await after.body()).toEqual(
    Buffer.from(exampleReportPdf("F163-CORREGIDO")),
  );
});
