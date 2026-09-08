import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createAssignment,
  createAssignmentDecision,
  createAssignmentHistory,
  createCandidateExclusion,
  createDecisionCandidate,
} from "../../src/modules/assignment/domain/model.js";
import { createStateTransition } from "../../src/modules/core/domain/model.js";
import {
  persistenceFixture,
  seedPersistence,
  TEST_INSTANT,
} from "../helpers/persistence-fixtures.js";

export function registerDomainRepositoryContract(name, factory) {
  describe(`contrato institucional: ${name}`, () => {
    test("persiste solicitud multiítem sin colapsar sus asignaciones", async () => {
      const context = await factory();
      try {
        const fixture = persistenceFixture(context.prefix);
        await seedPersistence(context.repository, fixture);
        const request = await context.repository.findRequestById(
          fixture.request.id,
        );
        const items = await context.repository.listRequestItems(request.id);
        assert.deepEqual(request.itemIds, [fixture.itemA.id, fixture.itemB.id]);
        assert.deepEqual(
          items.map((item) => item.childSequence),
          [1, 2],
        );
      } finally {
        await context.close?.();
      }
    });

    test("revierte completa la unidad de trabajo cuando falla", async () => {
      const context = await factory();
      try {
        const fixture = persistenceFixture(`${context.prefix}R`);
        await assert.rejects(
          context.repository.transaction(async (unit) => {
            await unit.saveArea(fixture.area);
            await unit.saveCase(fixture.caseRecord);
            throw new Error("fallo contractual esperado");
          }),
          /fallo contractual esperado/,
        );
        assert.equal(
          await context.repository.findCaseById(fixture.caseRecord.id),
          undefined,
        );
      } finally {
        await context.close?.();
      }
    });

    test("conserva decisión, candidatos, exclusiones e historial", async () => {
      const context = await factory();
      try {
        const fixture = persistenceFixture(`${context.prefix}A`);
        await seedPersistence(context.repository, fixture);
        const decision = createAssignmentDecision({
          id: `${context.prefix}-DECISION`,
          itemId: fixture.itemA.id,
          policyVersion: "POLICY-TEST-1",
          resultCode: "ASIGNACION_REALIZADA",
          selectedUserId: fixture.professional.id,
          tieBreakRule: "CARGA_ID_ESTABLE",
          explanation: { reason: "menor carga" },
          createdAt: TEST_INSTANT,
        });
        const candidate = createDecisionCandidate({
          id: `${context.prefix}-CANDIDATE`,
          decisionId: decision.id,
          userId: fixture.professional.id,
          eligible: true,
          ranking: 1,
          metrics: { activeAssignments: 0 },
        });
        const excluded = createDecisionCandidate({
          id: `${context.prefix}-CANDIDATE-2`,
          decisionId: decision.id,
          userId: fixture.otherProfessional.id,
          eligible: false,
          metrics: { activeAssignments: 0 },
        });
        const exclusion = createCandidateExclusion({
          id: `${context.prefix}-EXCLUSION`,
          candidateId: excluded.id,
          ruleCode: "COBERTURA",
          explanation: "Cobertura no habilitada",
        });
        const assignment = createAssignment({
          id: `${context.prefix}-ASSIGNMENT`,
          itemId: fixture.itemA.id,
          assigneeId: fixture.professional.id,
          decisionId: decision.id,
          policyVersion: decision.policyVersion,
          assignedAt: TEST_INSTANT,
          reason: "Resultado automático",
        });
        const history = createAssignmentHistory({
          id: `${context.prefix}-HISTORY`,
          assignmentId: assignment.id,
          itemId: assignment.itemId,
          action: "ASIGNADA",
          assigneeId: assignment.assigneeId,
          actorId: fixture.requester.id,
          reason: assignment.reason,
          occurredAt: TEST_INSTANT,
        });
        await context.repository.transaction(async (unit) => {
          await unit.saveAssignmentDecision(decision);
          await unit.saveDecisionCandidate(candidate);
          await unit.saveDecisionCandidate(excluded);
          await unit.saveCandidateExclusion(exclusion);
          await unit.saveAssignment(assignment);
          await unit.appendAssignmentHistory(history);
          await unit.saveStateTransition(
            createStateTransition({
              id: `${context.prefix}-TRANSITION`,
              itemId: fixture.itemA.id,
              areaCode: "INVESTIGACION",
              previousState: "RADICADA",
              newState: "ASIGNADA",
              actorId: fixture.requester.id,
              actorRole: "defensor",
              reason: "Reparto automático",
              occurredAt: TEST_INSTANT,
            }),
          );
        });
        const persistedDecision =
          await context.repository.findAssignmentDecisionById(decision.id);
        assert.equal(persistedDecision.candidates.length, 2);
        assert.equal(
          persistedDecision.candidates.find((entry) => !entry.eligible)
            .exclusions[0].ruleCode,
          "COBERTURA",
        );
        assert.equal(
          (await context.repository.currentAssignmentForItem(fixture.itemA.id))
            .assigneeId,
          fixture.professional.id,
        );
        assert.equal(
          (await context.repository.assignmentHistoryForItem(fixture.itemA.id))
            .length,
          1,
        );
      } finally {
        await context.close?.();
      }
    });
  });
}
