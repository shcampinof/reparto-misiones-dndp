import { exclusion, rankAndExplain } from "./shared.js";

export function assignVictims(context) {
  return rankAndExplain({
    professionals: context.professionals,
    context,
    strategyName: "VICTIMAS_DEMO_V1",
    now: context.now,
    exclusionRules: [
      (candidate) =>
        exclusion("Área incompatible", candidate.area !== "VICTIMAS"),
      (candidate) =>
        exclusion(
          "Disciplina no habilitada",
          !candidate.specialties.includes(context.service),
        ),
      (candidate) =>
        exclusion(
          "Cobertura territorial no habilitada",
          !candidate.coverages.includes(context.region),
        ),
      (candidate) =>
        exclusion(
          "Ley/programa no habilitado",
          !candidate.laws.includes(context.law),
        ),
      (candidate) =>
        exclusion("No disponible por novedad vigente", !candidate.available),
    ],
  });
}
