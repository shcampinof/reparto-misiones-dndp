import { DEMO_PARAMETERS } from "../../../infrastructure/demo/seeds.js";

export function rankAndExplain({
  professionals,
  context,
  exclusionRules,
  strategyName,
  now,
}) {
  const evaluated = professionals.map((professional) => {
    const exclusions = exclusionRules.flatMap((rule) =>
      rule(professional, context),
    );
    return {
      candidateId: professional.id,
      candidateName: professional.displayName,
      eligible: exclusions.length === 0,
      exclusions,
      metrics: {
        load: professional.load,
        lastAssignmentAt: professional.lastAssignmentAt,
      },
    };
  });

  const eligible = evaluated
    .filter((candidate) => candidate.eligible)
    .sort((left, right) => {
      if (left.metrics.load !== right.metrics.load)
        return left.metrics.load - right.metrics.load;
      const leftDate = left.metrics.lastAssignmentAt || "0000";
      const rightDate = right.metrics.lastAssignmentAt || "0000";
      const dateOrder = leftDate.localeCompare(rightDate);
      return dateOrder || left.candidateId.localeCompare(right.candidateId);
    });

  const selected = eligible[0] || null;
  return {
    strategy: strategyName,
    policyVersion: DEMO_PARAMETERS.version,
    demoParametersLabel: DEMO_PARAMETERS.label,
    selectedId: selected?.candidateId || null,
    selectedName: selected?.candidateName || null,
    selectedReason: selected
      ? `Elegible con menor carga (${selected.metrics.load}); desempate: ${DEMO_PARAMETERS.tieBreak}.`
      : "No existe candidato elegible en los datos de demostración.",
    evaluated,
    createdAt: now,
  };
}

export function exclusion(message, condition) {
  return condition ? [message] : [];
}
