import { createHash } from "node:crypto";
import { AppError } from "../../shared/errors.js";

export function normalizeDelivery(
  payload,
  referenceField,
  { allowIris = false, maxFileBytes = 2 * 1024 * 1024 } = {},
) {
  const fail = (message) => {
    throw new AppError(400, "INVALID_DELIVERY", message);
  };
  const mode = payload.deliveryMode || "REFERENCE";
  if (mode === "IRIS") {
    if (!allowIris)
      fail("La referencia IRIS sólo está habilitada en Investigación");
    const reference = String(payload[referenceField] || "").trim();
    if (
      !reference ||
      reference.length > 200 ||
      !/^[\p{L}\p{N} ._/-]+$/u.test(reference)
    )
      fail("Ingrese una referencia de radicado o expediente IRIS válida");
    return {
      reference,
      attachment: {
        kind: "IRIS",
        reference,
        verificationStatus: "NO_VERIFICADO",
        integrationStatus: "PENDIENTE_TICS",
      },
    };
  }
  if (mode === "SHAREPOINT") {
    let url;
    try {
      url = new URL(payload.sharepointUrl);
    } catch {
      fail("Ingrese un enlace válido de SharePoint");
    }
    if (
      url.href.length > 2000 ||
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".sharepoint.com") ||
      url.username ||
      url.password ||
      url.port
    ) {
      fail("El enlace debe usar HTTPS y un dominio de SharePoint");
    }
    return {
      reference: url.href,
      attachment: { kind: "SHAREPOINT", url: url.href },
    };
  }
  if (mode === "PDF") {
    const file = payload.file || {};
    const name = String(file.name || "").trim();
    if (
      !name ||
      name.length > 180 ||
      [...name].some((character) => character.charCodeAt(0) < 32) ||
      /[/\\]/.test(name) ||
      !/\.pdf$/i.test(name) ||
      file.mimeType !== "application/pdf"
    )
      fail("Seleccione un archivo PDF válido");
    if (
      typeof file.contentBase64 !== "string" ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        file.contentBase64,
      )
    )
      fail("El contenido del PDF no es válido");
    const bytes = Buffer.from(file.contentBase64, "base64");
    if (!bytes.length || bytes.length > maxFileBytes)
      fail(
        `El PDF debe tener contenido y no superar ${maxFileBytes / 1024 / 1024} MB`,
      );
    if (
      !bytes.subarray(0, 8).toString("ascii").startsWith("%PDF-") ||
      !bytes.subarray(-1024).toString("latin1").includes("%%EOF")
    )
      fail("El archivo no contiene un PDF válido");
    if (
      /\/(?:JavaScript|JS|Launch|EmbeddedFile)\b/.test(bytes.toString("latin1"))
    )
      fail("Use un PDF sin scripts ni archivos incrustados");
    return {
      reference: name,
      attachment: {
        kind: "PDF",
        name,
        mimeType: file.mimeType,
        size: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        contentBase64: file.contentBase64,
      },
    };
  }
  if (mode !== "REFERENCE") fail("Forma de entrega no válida");
  const reference = String(payload[referenceField] || "").trim();
  if (!reference || reference.length > 2000)
    fail(
      "La referencia del producto es obligatoria y admite hasta 2.000 caracteres",
    );
  return { reference, attachment: null };
}
