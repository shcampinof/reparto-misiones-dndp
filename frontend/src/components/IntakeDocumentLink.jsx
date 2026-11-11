import { useState } from "react";
import { apiDownloadIntake } from "../api.js";

export function IntakeDocumentLink({
  document,
  token,
  area,
  itemId,
  index,
  version,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (document.attachment?.kind === "SHAREPOINT")
    return (
      <a href={document.reference} target="_blank" rel="noopener noreferrer">
        Abrir documento en SharePoint
      </a>
    );
  if (document.attachment?.kind !== "PDF") return null;
  return (
    <span className="intake-download">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const blob = await apiDownloadIntake(
              token,
              area,
              itemId,
              index,
              version,
            );
            const url = URL.createObjectURL(blob),
              anchor = window.document.createElement("a");
            anchor.href = url;
            anchor.download = document.attachment.name;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (failure) {
            setError(failure.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Descargando…" : "Descargar archivo de solicitud"}
      </button>
      {error && <small role="alert">{error}</small>}
    </span>
  );
}
