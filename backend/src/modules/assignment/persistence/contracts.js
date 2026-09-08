import { assertRepositoryMethods } from "../../core/persistence/contracts.js";

export const ASSIGNMENT_REPOSITORY_METHODS = Object.freeze([
  "saveAssignmentDecision",
  "findAssignmentDecisionById",
  "saveDecisionCandidate",
  "saveCandidateExclusion",
  "saveAssignment",
  "currentAssignmentForItem",
  "appendAssignmentHistory",
  "assignmentHistoryForItem",
]);

export function assertAssignmentRepository(repository) {
  return assertRepositoryMethods(
    repository,
    ASSIGNMENT_REPOSITORY_METHODS,
    "AssignmentRepository",
  );
}
