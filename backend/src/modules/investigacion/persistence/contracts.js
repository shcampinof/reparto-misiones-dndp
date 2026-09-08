import { assertRepositoryMethods } from "../../core/persistence/contracts.js";

export const INVESTIGATION_REPOSITORY_METHODS = Object.freeze([
  "findInvestigationRequestById",
  "listInvestigationItemsByAssignee",
]);

export function assertInvestigationRepository(repository) {
  return assertRepositoryMethods(
    repository,
    INVESTIGATION_REPOSITORY_METHODS,
    "InvestigationRepository",
  );
}
