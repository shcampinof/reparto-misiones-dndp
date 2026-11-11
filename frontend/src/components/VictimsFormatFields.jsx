export function VictimsCaseFields({ form, update }) {
  return (
    <>
      <p>
        Datos del F163. Los campos adicionales se diligencian según el caso.
      </p>
      {[
        ["offenses", "Delito(s)"],
        ["judicialAuthority", "Autoridad judicial"],
        ["defendantName", "Procesado o postulado"],
        ["requestedMeasures", "Medidas solicitadas o pretensiones"],
        ["hearingPlace", "Lugar de audiencia"],
      ].map(([field, label]) => (
        <label key={field}>
          {label}
          <input value={form[field] || ""} onChange={update(field)} />
        </label>
      ))}
      <label>
        Fecha de sentencia
        <input
          type="date"
          value={form.sentenceDate || ""}
          onChange={update("sentenceDate")}
        />
      </label>
    </>
  );
}

export function VictimsPersonFields({ person, update }) {
  return (
    <>
      {[
        ["identityDocument", "Documento de identidad"],
        ["factNumber", "Número del hecho"],
        ["factPlace", "Lugar del hecho"],
        ["incomeSupportReference", "Soporte del ingreso a la fecha del hecho"],
        [
          "contactUnavailableReason",
          "Motivo de ausencia de contacto directo (solo víctima directa)",
        ],
      ].map(([field, label]) => (
        <label key={field}>
          {label}
          <input
            value={person[field] || ""}
            onChange={(event) => update(field, event.target.value)}
          />
        </label>
      ))}
      {[
        ["birthDate", "Fecha de nacimiento"],
        ["factDate", "Fecha del hecho"],
      ].map(([field, label]) => (
        <label key={field}>
          {label}
          <input
            type="date"
            value={person[field] || ""}
            onChange={(event) => update(field, event.target.value)}
          />
        </label>
      ))}
      <label>
        Ingreso laboral mensual a la fecha del hecho (financiero)
        <input
          type="number"
          min="0"
          step="0.01"
          value={person.monthlyIncome ?? ""}
          onChange={(event) => update("monthlyIncome", event.target.value)}
        />
      </label>
      <label>
        Daño emergente documentado por el RJV (financiero)
        <input
          type="number"
          min="0"
          step="0.01"
          value={person.emergingDamage ?? ""}
          onChange={(event) => update("emergingDamage", event.target.value)}
        />
      </label>
      <label>
        Días de desplazamiento (financiero)
        <input
          type="number"
          min="0"
          step="1"
          value={person.displacementDays ?? ""}
          onChange={(event) => update("displacementDays", event.target.value)}
        />
      </label>
      {[
        ["address", "Dirección actual"],
        ["municipality", "Municipio actual"],
        ["department", "Departamento actual"],
      ].map(([field, label]) => (
        <label key={field}>
          {label}
          <input
            value={person[field] || ""}
            onChange={(event) => update(field, event.target.value)}
          />
        </label>
      ))}
      <small>
        Si la víctima directa no puede ser contactada, registre la razón y un
        familiar localizable en el mismo núcleo. Los valores de liquidación
        corresponden al perito financiero.
      </small>
    </>
  );
}

export function F171Guidance({ item, metadata, setMetadata }) {
  const financial = item.assignedDiscipline === "DISC_VIC_FINANCIERA";
  return (
    <fieldset className="documents-editor">
      <legend>
        Informe SD-P06-F171 · {financial ? "Financiero" : "Psicológico"}
      </legend>
      <label>
        Número del informe
        <input
          aria-label="Número del informe F171"
          value={metadata.reportNumber}
          onChange={(event) =>
            setMetadata((current) => ({
              ...current,
              reportNumber: event.target.value,
            }))
          }
        />
      </label>
      <label>
        Fecha de valoración o actividad
        <input
          type="date"
          value={metadata.assessmentDate}
          onChange={(event) =>
            setMetadata((current) => ({
              ...current,
              assessmentDate: event.target.value,
            }))
          }
        />
      </label>
      <p>
        El archivo debe incluir motivo, hechos, metodología, documentos
        examinados, actividades, conclusiones, referencias y firma del perito.
      </p>
      <p>
        {financial
          ? "Desarrollo financiero: instrumentos y fórmulas de daño emergente, lucro cesante, IPC, salario y renta; resultados y análisis. Conserve los anexos F168/F169 sin modificar sus fórmulas."
          : "Desarrollo psicológico: aproximación psicobiográfica, cambios posteriores al hecho, examen mental, interpretación de resultados, discusión forense y recomendaciones. Documente el consentimiento informado."}
      </p>
      <small>
        El autor y la fecha de entrega se registran automáticamente. El
        contenido del F171 queda reservado al RJV titular y al perito asignado.
      </small>
    </fieldset>
  );
}

export function VictimsFormatSummary({ data }) {
  if (!data) return null;
  const caseLabels = {
    offenses: "Delito(s)",
    judicialAuthority: "Autoridad judicial",
    defendantName: "Procesado o postulado",
    requestedMeasures: "Pretensiones",
    hearingPlace: "Lugar de audiencia",
    sentenceDate: "Fecha de sentencia",
  };
  const personLabels = {
    identityDocument: "Documento",
    birthDate: "Nacimiento",
    factNumber: "Número del hecho",
    factDate: "Fecha del hecho",
    factPlace: "Lugar del hecho",
    monthlyIncome: "Ingreso a la fecha del hecho",
    incomeSupportReference: "Soporte del ingreso",
    emergingDamage: "Daño emergente documentado",
    displacementDays: "Días de desplazamiento",
    contactUnavailableReason: "Motivo sin contacto directo",
  };
  return (
    <section className="detail-section">
      <h3>Datos complementarios del F163 y anexos financieros</h3>
      <dl className="detail-facts">
        {Object.entries(caseLabels)
          .filter(([field]) => data.caseData?.[field])
          .map(([field, label]) => (
            <div key={field}>
              <dt>{label}</dt>
              <dd>{data.caseData[field]}</dd>
            </div>
          ))}
      </dl>
      {(data.persons || []).map((person, index) => (
        <article key={index}>
          <strong>{person.alias}</strong>
          <dl className="detail-facts">
            {Object.entries(personLabels)
              .filter(
                ([field]) =>
                  person[field] !== undefined &&
                  person[field] !== null &&
                  person[field] !== "",
              )
              .map(([field, label]) => (
                <div key={field}>
                  <dt>{label}</dt>
                  <dd>{String(person[field])}</dd>
                </div>
              ))}
            {["address", "municipality", "department"].some(
              (field) => person.contact?.[field],
            ) && (
              <div>
                <dt>Ubicación actual</dt>
                <dd>
                  {[
                    person.contact?.address,
                    person.contact?.municipality,
                    person.contact?.department,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              </div>
            )}
          </dl>
        </article>
      ))}
    </section>
  );
}
