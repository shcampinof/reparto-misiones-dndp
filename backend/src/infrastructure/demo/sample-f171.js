import { normalizeDelivery } from "../../modules/demo/delivery.js";

// Documento de presentación independiente de los archivos institucionales.
export function sampleF171Attachment(item) {
  const reference = String(item.reportReference).replace(/[^A-Za-z0-9-]/g, "");
  const content = `BT /F1 16 Tf 50 750 Td (F171 - Informe de Actividades Periciales Forenses) Tj 0 -30 Td /F1 11 Tf (Referencia: ${reference}) Tj 0 -25 Td (Documento de presentacion del aplicativo SIGIP-DP.) Tj 0 -25 Td (Servicio pericial financiero - entrega al RJV.) Tj 0 -25 Td (Apartados: objeto, documentos, metodologia y resultados.) Tj 0 -25 Td (El informe definitivo es elaborado y suscrito por el perito.) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return normalizeDelivery(
    {
      deliveryMode: "PDF",
      file: {
        name: `${reference}.pdf`,
        mimeType: "application/pdf",
        contentBase64: Buffer.from(pdf, "ascii").toString("base64"),
      },
    },
    "reportReference",
  ).attachment;
}
