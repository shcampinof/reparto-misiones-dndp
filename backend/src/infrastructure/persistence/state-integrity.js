export function assertStateHistory(before, draft) {
  // Audit, transitions and previous documents cannot be silently rewritten.
  if (
    JSON.stringify(before.workspaceDocuments || []) !==
    JSON.stringify(
      (draft.workspaceDocuments || []).slice(
        0,
        (before.workspaceDocuments || []).length,
      ),
    )
  )
    throw new Error("Support document versions are immutable");
  for (const request of before.requests) {
    const next = draft.requests.find((entry) => entry.id === request.id);
    if (!next) throw new Error("Requests cannot be deleted");
    for (const version of request.versions || []) {
      const nextVersion = next.versions?.find(
        (entry) => entry.version === version.version,
      );
      if (
        !nextVersion ||
        JSON.stringify(nextVersion.data) !== JSON.stringify(version.data)
      )
        throw new Error("Submitted versions are immutable");
    }
    for (const item of request.items) {
      const nextItem = next.items.find((entry) => entry.id === item.id);
      if (!nextItem) throw new Error("Items cannot be deleted");
      for (const field of ["timeline"]) {
        const previous = item[field] || [];
        if (
          JSON.stringify(previous) !==
          JSON.stringify((nextItem[field] || []).slice(0, previous.length))
        ) {
          throw new Error("Historical records are immutable");
        }
      }
      for (const product of item.products || []) {
        const nextProduct = nextItem.products?.find(
          (entry) => entry.id === product.id,
        );
        const content = (entry) =>
          entry &&
          Object.fromEntries(
            [
              "id",
              "itemId",
              "type",
              "version",
              "reference",
              "attachment",
              "formatMetadata",
              "author",
              "createdAt",
            ].map((key) => [key, entry[key]]),
          );
        if (
          JSON.stringify(content(product)) !==
          JSON.stringify(content(nextProduct))
        )
          throw new Error("Document content is immutable");
      }
    }
  }
  if (
    JSON.stringify(before.audit) !==
    JSON.stringify(draft.audit.slice(0, before.audit.length))
  )
    throw new Error("Audit is append only");
}
