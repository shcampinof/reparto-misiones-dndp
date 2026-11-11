export function DraftPanel({ draft }) {
  return (
    <details className="draft-panel">
      <summary>Borradores guardados · {draft.list.length}</summary>
      <p>
        Guardado automático privado en el servidor. La radicación requiere
        confirmación.
      </p>
      <button type="button" onClick={draft.save}>
        Guardar borrador ahora
      </button>
      {draft.status && <p role="status">{draft.status}</p>}
      {draft.error && <p role="alert">{draft.error}</p>}
      <ul>
        {draft.list.map((d) => (
          <li key={d.id}>
            <span>
              {d.title} ·{" "}
              {new Date(d.updatedAt).toLocaleString("es-CO", {
                timeZone: "America/Bogota",
              })}
            </span>
            <button type="button" onClick={() => draft.load(d.id)}>
              Recuperar borrador
            </button>
            <button
              type="button"
              onClick={() => draft.archive(d.id, d.revision)}
            >
              Archivar borrador
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
