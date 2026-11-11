const normalized = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function matchesRequestFilters(request, item, filters) {
  const fields = [
    request.id,
    request.displayNumber,
    request.externalId,
    item.id,
    item.serviceLabel,
    item.assigneeName,
    item.regionLabel,
    item.applicableRequestData?.externalId,
  ];
  return (
    (!filters.search ||
      normalized(fields.join(" ")).includes(normalized(filters.search))) &&
    (!filters.region || item.region === filters.region) &&
    (!filters.service || item.service === filters.service) &&
    (!filters.assignee || item.assigneeId === filters.assignee) &&
    (!filters.status || item.status === filters.status) &&
    (!filters.overdue ||
      (item.tracking?.configured &&
        item.tracking.daysRemaining < 0 &&
        !["CERRADA", "IMPROCEDENTE"].includes(item.status)))
  );
}
