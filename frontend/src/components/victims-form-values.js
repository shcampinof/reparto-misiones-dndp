export function victimsCaseForm(form) {
  return Object.fromEntries(
    [
      "offenses",
      "judicialAuthority",
      "defendantName",
      "requestedMeasures",
      "hearingPlace",
      "sentenceDate",
    ].map((key) => [key, form[key] || undefined]),
  );
}

export function victimsPersonForm(person) {
  return Object.fromEntries(
    [
      "identityDocument",
      "factNumber",
      "factPlace",
      "incomeSupportReference",
      "contactUnavailableReason",
      "birthDate",
      "factDate",
      "monthlyIncome",
      "emergingDamage",
      "displacementDays",
    ].map((key) => [key, person[key]]),
  );
}
