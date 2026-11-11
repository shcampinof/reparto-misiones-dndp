import { useCallback, useEffect, useState } from "react";
import { apiWorkspace } from "../api.js";

export function MaintenancePanel({ token }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(
    () => apiWorkspace(token, "maintenance").then(setData),
    [token],
  );
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  return (
    <details className="maintenance-panel">
      <summary>Estado del sistema</summary>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <dl>
            <dt>Persistencia</dt>
            <dd>{data.storage}</dd>
            <dt>Análisis antimalware</dt>
            <dd>
              {data.scanner === "CONFIGURADO"
                ? "Conexión configurada; se verifica en cada carga"
                : "Sin antivirus; validación básica de PDF"}
            </dd>
            <dt>Última copia verificada</dt>
            <dd>
              {data.backups.lastSuccessAt
                ? new Date(data.backups.lastSuccessAt).toLocaleString("es-CO", {
                    timeZone: "America/Bogota",
                  })
                : "Sin copia registrada"}
            </dd>
            <dt>Resultado de las copias</dt>
            <dd>
              {data.backups.failureCode ||
                (data.backups.configured
                  ? "Destino configurado"
                  : "Destino pendiente de configuración")}
            </dd>
          </dl>
          <p>
            Las copias deben conservarse en un destino duradero. Una copia en el
            mismo disco efímero se pierde si ese disco se reemplaza.
          </p>
          <button
            type="button"
            disabled={busy || !data.backups.configured}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await apiWorkspace(token, "maintenance/backup", "POST");
                await refresh();
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Verificando copia…" : "Crear copia verificada"}
          </button>
          <h3>Estado de las notificaciones</h3>
          <ul>
            {Object.entries(data.notifications).map(([state, count]) => (
              <li key={state}>
                {state}: {count}
              </li>
            ))}
          </ul>
          <p>
            Los avisos pendientes de configuración permanecen en la bandeja; no
            se presentan como correos enviados.
          </p>
        </>
      )}
    </details>
  );
}
