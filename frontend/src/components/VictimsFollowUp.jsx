import { useState } from "react";
import { apiVictimsAction } from "../api.js";
import { VictimsPersonFields } from "./VictimsFormatFields.jsx";
import { victimsPersonForm } from "./victims-form-values.js";

export function VictimsFollowUp({ item, token, busy, run }) {
  const [kind, setKind] = useState("AMPLIACION");
  const [reason, setReason] = useState("");
  const [supportReference, setSupport] = useState("");
  const [persons, setPersons] = useState([]);
  const [submissionId, setSubmission] = useState(() => crypto.randomUUID());
  const change = (setter) => (event) => {
    setter(event.target.value);
    setSubmission(crypto.randomUUID());
  };
  const updatePerson = (index, field, value) => {
    setPersons((current) =>
      current.map((person, row) =>
        row === index ? { ...person, [field]: value } : person,
      ),
    );
    setSubmission(crypto.randomUUID());
  };
  return (
    <details className="problem-report victims-follow-up">
      <summary>Solicitar ampliación o actualización del F171</summary>
      <div className="review-actions">
        <p>
          Se crea un encargo vinculado con aprobación previa y continuidad del
          mismo perito. El informe anterior y sus datos se conservan. Ampliar el
          encargo es distinto de ampliar su plazo.
        </p>
        <label>
          Tipo de continuación
          <select value={kind} onChange={change(setKind)}>
            <option value="AMPLIACION">Ampliación del encargo</option>
            <option value="ACTUALIZACION_F171">Actualización del F171</option>
          </select>
        </label>
        <label>
          Motivo de la continuación
          <textarea
            value={reason}
            maxLength={10000}
            onChange={change(setReason)}
          />
        </label>
        <label>
          Soporte de la continuación
          <input
            value={supportReference}
            maxLength={2000}
            onChange={change(setSupport)}
          />
        </label>
        {persons.map((person, index) => (
          <fieldset key={person.key} className="follow-up-person">
            <legend>Persona adicional {index + 1}</legend>
            <label>
              Identificación adicional {index + 1}
              <input
                value={person.alias}
                onChange={(event) =>
                  updatePerson(index, "alias", event.target.value)
                }
              />
            </label>
            <label>
              Tipo de víctima adicional {index + 1}
              <select
                value={person.type}
                onChange={(event) =>
                  updatePerson(index, "type", event.target.value)
                }
              >
                <option value="DIRECTA">Directa</option>
                <option value="INDIRECTA">Indirecta</option>
              </select>
            </label>
            <label>
              Parentesco adicional {index + 1}
              <input
                value={person.relationship}
                onChange={(event) =>
                  updatePerson(index, "relationship", event.target.value)
                }
              />
            </label>
            <label>
              Núcleo familiar adicional {index + 1}
              <input
                value={person.familyGroup}
                onChange={(event) =>
                  updatePerson(index, "familyGroup", event.target.value)
                }
              />
            </label>
            <label>
              Contacto adicional {index + 1}
              <input
                value={person.phone}
                onChange={(event) =>
                  updatePerson(index, "phone", event.target.value)
                }
              />
            </label>
            <details className="follow-up-extra-fields">
              <summary>Datos adicionales y financieros (opcionales)</summary>
              <VictimsPersonFields
                person={person}
                update={(field, value) => updatePerson(index, field, value)}
              />
            </details>
            <button
              type="button"
              onClick={() => {
                setPersons((current) =>
                  current.filter((_, row) => row !== index),
                );
                setSubmission(crypto.randomUUID());
              }}
            >
              Quitar persona adicional {index + 1}
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          onClick={() => {
            setPersons((current) => [
              ...current,
              {
                key: crypto.randomUUID(),
                alias: "",
                type: "DIRECTA",
                familyGroup: "",
                relationship: "",
                phone: "",
              },
            ]);
            setSubmission(crypto.randomUUID());
          }}
        >
          Añadir víctima a la ampliación
        </button>
        <button
          className="primary-demo"
          disabled={
            busy ||
            !reason.trim() ||
            !supportReference.trim() ||
            persons.some(
              (person) =>
                !person.alias.trim() ||
                !person.familyGroup.trim() ||
                !person.phone.trim() ||
                (person.type === "INDIRECTA" && !person.relationship.trim()),
            )
          }
          onClick={() =>
            run(
              item.id,
              () =>
                apiVictimsAction(token, item.id, "continuacion", {
                  kind,
                  reason,
                  supportReference,
                  submissionId,
                  additionalPersons: persons.map((person) => ({
                    ...victimsPersonForm(person),
                    alias: person.alias,
                    type: person.type,
                    familyGroup: person.familyGroup,
                    relationship: person.relationship,
                    contact: {
                      phone: person.phone,
                      address: person.address,
                      municipality: person.municipality,
                      department: person.department,
                    },
                  })),
                }),
              "Continuación enviada a aprobación previa; encargo original conservado",
              () => {
                setReason("");
                setSupport("");
                setPersons([]);
                setSubmission(crypto.randomUUID());
              },
            )
          }
        >
          Enviar continuación a aprobación
        </button>
      </div>
    </details>
  );
}
