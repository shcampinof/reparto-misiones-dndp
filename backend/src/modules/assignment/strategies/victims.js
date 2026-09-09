import { exclusion, rankAndExplain } from "./shared.js";

export function assignVictims(context) {
  return rankAndExplain({
    professionals: context.professionals,
    context,
    strategyName: "VICTIMAS_PRE_ORACLE_V1",
    now: context.now,
    exclusionRules: [
      (candidate) =>
        exclusion("Área incompatible", candidate.area !== "VICTIMAS"),
      (candidate) =>
        exclusion(
          "Disciplina no habilitada",
          !context.specialtyIds.some((specialtyId) =>
            candidate.specialties.includes(specialtyId),
          ),
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
