import { useCallback, useEffect, useState } from "react";
import {
  apiUploadSupport,
  apiWorkspace,
  apiWorkspaceDownload,
} from "../api.js";
import { readPdf, useFilePolicy, megabytes } from "./file-policy.js";
import { IntakeDocumentLink } from "./IntakeDocumentLink.jsx";

const documentLabels = {
  ANEXO: "Anexo",
  ACTUACION: "Actuación",
  PROBLEMA: "Problema reportado",
  PRORROGA: "Prórroga de término",
  VERIFICACION: "Constancia de verificación",
  ENVIO: "Constancia de envío",
  SOLICITUD_DEFENSA: "Solicitud de defensa",
};
const fileSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : megabytes(bytes);

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReceiptDownload({ token, area, itemId }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            saveBlob(
              await apiWorkspaceDownload(
                token,
                `${area}/items/${encodeURIComponent(itemId)}/receipt`,
              ),
              `constancia-${itemId}.html`,
            );
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Descargar constancia
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function WorkspaceDocuments({
  token,
  area,
  itemId,
  intake = [],
  version,
  children,
}) {
  const policy = useFilePolicy(),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [file, setFile] = useState(null),
    [reason, setReason] = useState(""),
    [type, setType] = useState("ANEXO"),
    [replace, setReplace] = useState(""),
    [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  const path = `${area}/items/${encodeURIComponent(itemId)}/documents`;
  const refresh = useCallback(
    () => apiWorkspace(token, path).then(setData),
    [token, path],
  );
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  const latest =
    data?.documents.filter(
      (d) =>
        !data.documents.some(
          (next) =>
            next.documentId === d.documentId && next.version > d.version,
        ),
    ) || [];
  const previous = latest.find((d) => d.documentId === replace);
  const changed = () => {
    setSubmissionId(crypto.randomUUID());
    setNotice("");
  };
  return (
    <section className="workspace-documents">
      <h3>Documentos del encargo</h3>
      <ReceiptDownload token={token} area={area} itemId={itemId} />
      <h4>Documentos de radicación</h4>
      {intake.length ? (
        <ul>
          {intake.map((d, index) => (
            <li key={index}>
              <strong>{documentLabels[d.type] || d.type}</strong> ·{" "}
              {d.reference}
              <IntakeDocumentLink
                document={d}
                token={token}
                area={area}
                itemId={itemId}
                index={index}
                version={version}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p>Sin documentos visibles de radicación.</p>
      )}
      {children}
      <h4>Soportes y versiones</h4>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p>Cargando documentos…</p>}
      {data && (
        <>
          <ul>
            {data.documents.map((d) => (
              <li key={d.id}>
                <strong>
                  {documentLabels[d.type] || d.type} · Versión {d.version}
                </strong>
                {d.reserved ? (
                  <p>Contenido reservado</p>
                ) : (
                  <>
                    <p>
                      {d.name} · {fileSize(d.size)} · {d.author} ·{" "}
                      {new Date(d.createdAt).toLocaleString("es-CO", {
                        timeZone: "America/Bogota",
                      })}
                    </p>
                    <p>{d.reason}</p>
                    <small>
                      {d.validationStatus === "ANTIMALWARE_VERIFICADO"
                        ? "Análisis antimalware completado"
                        : "Validación básica del PDF; sin análisis antivirus"}
                    </small>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setError("");
                        try {
                          saveBlob(
                            await apiWorkspaceDownload(
                              token,
                              `${path}/${d.id}`,
                            ),
                            d.name,
                          );
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      Descargar soporte versión {d.version}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {!data.documents.length && <p>No hay soportes adicionales.</p>}
          {data.canUpload && (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!file) return;
                setBusy(true);
                setError("");
                setNotice("");
                setProgress(0);
                try {
                  await apiUploadSupport(
                    token,
                    path,
                    {
                      submissionId,
                      type,
                      reason,
                      file,
                      documentId: replace || undefined,
                      previousVersion: previous?.version,
                    },
                    setProgress,
                  );
                  setNotice("Documento guardado y confirmado en el servidor");
                  setFile(null);
                  setReason("");
                  setReplace("");
                  setSubmissionId(crypto.randomUUID());
                  await refresh();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Documento a incorporar
                <select
                  value={replace}
                  disabled={busy}
                  onChange={(e) => {
                    setReplace(e.target.value);
                    const d = latest.find(
                      (d) => d.documentId === e.target.value,
                    );
                    if (d) setType(d.type);
                    changed();
                  }}
                >
                  <option value="">Nuevo documento</option>
                  {latest.map((d) => (
                    <option key={d.documentId} value={d.documentId}>
                      {d.name} · Nueva versión
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo de soporte
                <select
                  value={type}
                  disabled={busy || Boolean(replace)}
                  onChange={(e) => {
                    setType(e.target.value);
                    changed();
                  }}
                >
                  {[
                    "ANEXO",
                    "ACTUACION",
                    "PROBLEMA",
                    "PRORROGA",
                    "VERIFICACION",
                    "ENVIO",
                  ].map((value) => (
                    <option key={value} value={value}>
                      {documentLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Motivo o actuación relacionada
                <textarea
                  required
                  maxLength={1000}
                  disabled={busy}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    changed();
                  }}
                />
              </label>
              <label>
                Archivo de soporte PDF
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={busy}
                  onChange={async (e) => {
                    setFile(null);
                    setError("");
                    changed();
                    try {
                      setFile(
                        await readPdf(e.target.files?.[0], policy.maxFileBytes),
                      );
                    } catch (error) {
                      setError(error.message);
                    }
                  }}
                />
              </label>
              <small>
                Hasta {megabytes(policy.maxFileBytes)} por archivo;{" "}
                {megabytes(policy.maxItemBytes)} en soportes y sus versiones.
              </small>
              {file && (
                <p>Archivo seleccionado: {file.name}. Pendiente de guardar.</p>
              )}
              {busy && (
                <>
                  <progress max="100" value={progress} />
                  <p role="status">
                    {progress < 100
                      ? `Cargando ${progress}%`
                      : "Validando y confirmando almacenamiento…"}
                  </p>
                </>
              )}
              <button type="submit" disabled={busy || !file || !reason.trim()}>
                {busy
                  ? "Guardando…"
                  : error
                    ? "Reintentar carga"
                    : "Guardar documento"}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
