import { CAPABILITIES, hasCapability } from "./capabilities.js";

// A snapshot never broadens the scope granted for the live item.
function itemData(data, itemIds) {
  if (!data) return null;
  return {
    ...structuredClone(data),
    items: (data.items || []).filter((item) => itemIds.has(item.id)),
  };
}

export function projectRequestForAuth(presented, original, auth) {
  const readsWholeRequest = original.items.every((item) =>
    hasCapability(auth, CAPABILITIES.CONSULTAR_SOLICITUDES, {
      area: original.area,
      ownerUserId: original.ownerUserId,
      region: item.region,
      // Deliberately omit assigneeId: an own-assignment grant cannot
      // authorize the latest shared information or other submissions.
    }),
  );
  const approvedOnly = original.area === "VICTIMAS" && !readsWholeRequest;
  const versions = (presented.versions || []).flatMap((version) => {
    const permittedIds = new Set(
      presented.items
        .filter(
          (item) =>
            !approvedOnly || item.approvedSubmissionVersion === version.version,
        )
        .map((item) => item.id),
    );
    const data = itemData(version.data, permittedIds);
    if (!data?.items.length) return [];
    if (
      !readsWholeRequest &&
      version.correction &&
      !permittedIds.has(version.correction.itemId)
    ) {
      return [];
    }
    return [
      {
        ...version,
        data,
        reviews: (version.reviews || []).filter((review) =>
          permittedIds.has(review.itemId),
        ),
        ...(!readsWholeRequest
          ? { correction: null, correctionSummary: null }
          : {}),
      },
    ];
  });
  const items = presented.items.map((item) => {
    const ownId = new Set([item.id]);
    const projected = {
      ...item,
      approvedRequestData: itemData(item.approvedRequestData, ownId),
      applicableRequestData: itemData(item.applicableRequestData, ownId),
    };
    if (approvedOnly) {
      delete projected.submittedRequestData;
      delete projected.pagObservations;
      delete projected.correctionHistory;
      delete projected.nextSubmissionVersion;
    }
    return projected;
  });
  if (approvedOnly) {
    // Shared current fields may have changed through another item's return.
    // Executors get each approved context exclusively inside its own item.
    return {
      id: presented.id,
      area: presented.area,
      ownerUserId: presented.ownerUserId,
      requesterName: presented.requesterName,
      createdAt: presented.createdAt,
      aggregateStatus: presented.aggregateStatus,
      aggregateCounts: presented.aggregateCounts,
      versions,
      items,
    };
  }
  return { ...presented, versions, items };
}
