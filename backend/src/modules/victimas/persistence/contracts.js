import { assertRepositoryMethods } from "../../core/persistence/contracts.js";

export const VICTIMS_REPOSITORY_METHODS = Object.freeze([
  "findVictimsRequestById",
  "listVictimsItemsByAssignee",
  "listRequestPersons",
]);

export function assertVictimsRepository(repository) {
  return assertRepositoryMethods(
    repository,
    VICTIMS_REPOSITORY_METHODS,
    "VictimsRepository",
  );
}
