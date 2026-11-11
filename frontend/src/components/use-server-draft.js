import { useCallback, useEffect, useRef, useState } from "react";
import { apiWorkspace } from "../api.js";

export function useServerDraft(token, area, value, restore) {
  const [list, setList] = useState([]),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const reference = useRef({
      id: crypto.randomUUID(),
      revision: 0,
      complete: false,
    }),
    current = useRef(value),
    baseline = useRef(JSON.stringify(value)),
    inFlight = useRef(false),
    restoreRef = useRef(restore);
  current.current = value;
  restoreRef.current = restore;
  const refresh = useCallback(
    () =>
      apiWorkspace(token, `${area}/drafts`).then((data) =>
        setList(data.drafts),
      ),
    [token, area],
  );
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  const save = useCallback(async () => {
    if (inFlight.current || reference.current.complete) return;
    inFlight.current = true;
    setStatus("Guardando borrador…");
    setError("");
    const data = current.current;
    let succeeded = false;
    try {
      const result = await apiWorkspace(
        token,
        `${area}/drafts/${reference.current.id}`,
        "PUT",
        { revision: reference.current.revision, data },
      );
      reference.current.revision = result.revision;
      succeeded = true;
      if (reference.current.complete) {
        await apiWorkspace(
          token,
          `${area}/drafts/${reference.current.id}`,
          "DELETE",
          { revision: result.revision },
        );
        await refresh();
        return;
      }
      baseline.current = JSON.stringify(data);
      setStatus("Borrador guardado en servidor");
      await refresh();
    } catch (e) {
      setError(e.message);
      setStatus("");
    } finally {
      inFlight.current = false;
      if (
        succeeded &&
        !reference.current.complete &&
        baseline.current !== JSON.stringify(current.current)
      )
        setTimeout(save, 1800);
    }
  }, [token, area, refresh]);
  const serialized = JSON.stringify(value);
  useEffect(() => {
    if (reference.current.complete || serialized === baseline.current || error)
      return undefined;
    const timer = setTimeout(save, 1800);
    return () => clearTimeout(timer);
  }, [serialized, save, error]);
  async function load(id) {
    if (inFlight.current) return;
    try {
      const d = await apiWorkspace(token, `${area}/drafts/${id}`);
      reference.current = { id: d.id, revision: d.revision, complete: false };
      baseline.current = JSON.stringify(d.data);
      restoreRef.current(d.data);
      setError("");
      setStatus("Borrador recuperado");
    } catch (e) {
      setError(e.message);
    }
  }
  async function archive(id, revision) {
    try {
      await apiWorkspace(token, `${area}/drafts/${id}`, "DELETE", { revision });
      if (reference.current.id === id)
        reference.current = {
          id: crypto.randomUUID(),
          revision: 0,
          complete: false,
        };
      await refresh();
      setStatus("Borrador archivado");
    } catch (e) {
      setError(e.message);
    }
  }
  function complete() {
    reference.current.complete = true;
    if (reference.current.revision && !inFlight.current)
      apiWorkspace(token, `${area}/drafts/${reference.current.id}`, "DELETE", {
        revision: reference.current.revision,
      })
        .then(refresh)
        .catch((e) => setError(e.message));
  }
  function reset() {
    reference.current = {
      id: crypto.randomUUID(),
      revision: 0,
      complete: false,
    };
    baseline.current = JSON.stringify(current.current);
    setStatus("");
    setError("");
  }
  return { list, status, error, save, load, archive, complete, reset };
}
