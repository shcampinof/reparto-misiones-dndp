import { createContext, useContext } from "react";
export const FilePolicyContext = createContext({
  maxFileBytes: 2 * 1024 * 1024,
  maxIntakeBytes: 4 * 1024 * 1024,
  maxItemBytes: 50 * 1024 * 1024,
});
export const useFilePolicy = () => useContext(FilePolicyContext);
export const megabytes = (bytes) =>
  `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
export async function readPdf(file, maxBytes) {
  if (!file || !file.size || file.size > maxBytes || !/\.pdf$/i.test(file.name))
    throw new Error(
      `Seleccione un PDF con contenido de hasta ${megabytes(maxBytes)}`,
    );
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No fue posible leer el archivo"));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(file);
  });
  return {
    name: file.name,
    mimeType: file.type || "application/pdf",
    contentBase64: data,
  };
}
