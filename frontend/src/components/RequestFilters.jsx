export function RequestFilters({
  requests,
  filters,
  setFilters,
  statusLabels = {},
}) {
  const items = requests.flatMap((r) => r.items),
    update = (key) => (e) =>
      setFilters((f) => ({
        ...f,
        [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
      }));
  function options(key, label) {
    return [
      ...new Map(
        items.filter((i) => i[key]).map((i) => [i[key], i[label] || i[key]]),
      ).entries(),
    ].sort((a, b) => String(a[1]).localeCompare(String(b[1]), "es"));
  }
  return (
    <fieldset className="request-filters">
      <legend>Buscar y filtrar encargos</legend>
      <label>
        Buscar misión, SPOA, radicado o responsable
        <input
          type="search"
          value={filters.search || ""}
          onChange={update("search")}
        />
      </label>
      {[
        ["region", "Regional", "regionLabel"],
        ["service", "Servicio", "serviceLabel"],
        ["assignee", "Responsable", "assigneeName"],
        ["status", "Estado", "status"],
      ].map(([key, label, text]) => (
        <label key={key}>
          {label}
          <select
            aria-label={label}
            value={filters[key] || ""}
            onChange={update(key)}
          >
            <option value="">Todos</option>
            {options(key === "assignee" ? "assigneeId" : key, text).map(
              ([value, name]) => (
                <option key={value} value={value}>
                  {key === "status" ? statusLabels[value] || name : name}
                </option>
              ),
            )}
          </select>
        </label>
      ))}
      <label>
        <input
          type="checkbox"
          checked={Boolean(filters.overdue)}
          onChange={update("overdue")}
        />
        Sólo vencidos
      </label>
      <button type="button" onClick={() => setFilters({})}>
        Limpiar filtros
      </button>
    </fieldset>
  );
}
