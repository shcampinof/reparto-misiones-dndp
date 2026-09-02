import { exclusion, rankAndExplain } from "./shared.js";

export function assignInvestigation(context) {
  return rankAndExplain({
    professionals: context.professionals,
    context,
    strategyName: "INVESTIGACION_DEMO_V1",
    now: context.now,
    exclusionRules: [
      (candidate) =>
        exclusion("Área incompatible", candidate.area !== "INVESTIGACION"),
      (candidate) =>
        exclusion(
          "Especialidad no habilitada",
          !candidate.specialties.includes(context.service),
        ),
      (candidate) =>
        exclusion(
          "Cobertura territorial no habilitada",
          !candidate.coverages.includes(context.region),
        ),
      (candidate) =>
        exclusion("No disponible por novedad demo", !candidate.available),
    ],
  });
}
