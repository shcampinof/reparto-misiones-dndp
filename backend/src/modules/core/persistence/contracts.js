export const CORE_REPOSITORY_METHODS = Object.freeze([
  "transaction",
  "saveArea",
  "saveRole",
  "saveUser",
  "saveUserScope",
  "saveRegional",
  "saveService",
  "saveCoverage",
  "saveCase",
  "findCaseById",
  "saveRequest",
  "findRequestById",
  "listRequestsByCaseId",
  "saveRequestItem",
  "findRequestItemById",
  "listRequestItems",
  "saveRequestPerson",
  "listRequestPersons",
  "saveStateTransition",
  "listStateTransitionsForItem",
  "appendAudit",
  "listAudit",
]);

export function assertRepositoryMethods(repository, methods, contractName) {
  const missing = methods.filter(
    (method) => typeof repository?.[method] !== "function",
  );
  if (missing.length) {
    throw new TypeError(
      `${contractName} incompleto; faltan: ${missing.join(", ")}`,
    );
  }
  return repository;
}

export function assertCoreRepository(repository) {
  return assertRepositoryMethods(
    repository,
    CORE_REPOSITORY_METHODS,
    "CoreRepository",
  );
}
