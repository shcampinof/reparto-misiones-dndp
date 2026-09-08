import {
  createArea,
  createCase,
  createCoverage,
  createRegional,
  createRequest,
  createRequestItem,
  createRole,
  createService,
  createUser,
  createUserScope,
} from "../../src/modules/core/domain/model.js";

export const TEST_INSTANT = "2026-09-08T12:00:00.000Z";

export function persistenceFixture(prefix = "T") {
  const area = createArea({
    id: "INVESTIGACION",
    code: "INVESTIGACION",
    name: "Investigación",
    effectiveFrom: TEST_INSTANT,
  });
  const regional = createRegional({
    id: `${prefix}-REG`,
    code: `${prefix}-REG`,
    name: "Regional de prueba",
    effectiveFrom: TEST_INSTANT,
  });
  const role = createRole({
    id: `${prefix}-ROL`,
    code: `${prefix}-INVESTIGADOR`,
    name: "Investigador",
    areaId: area.id,
    effectiveFrom: TEST_INSTANT,
  });
  const requester = createUser({
    id: `${prefix}-REQUESTER`,
    identitySubject: `${prefix}-requester-subject`,
    displayName: "Solicitante de prueba",
    createdAt: TEST_INSTANT,
  });
  const professional = createUser({
    id: `${prefix}-PROFESSIONAL`,
    identitySubject: `${prefix}-professional-subject`,
    displayName: "Profesional de prueba",
    createdAt: TEST_INSTANT,
  });
  const otherProfessional = createUser({
    id: `${prefix}-PROFESSIONAL-2`,
    identitySubject: `${prefix}-professional-subject-2`,
    displayName: "Segundo profesional",
    createdAt: TEST_INSTANT,
  });
  const scope = createUserScope({
    id: `${prefix}-SCOPE`,
    userId: professional.id,
    roleId: role.id,
    areaId: area.id,
    regionalId: regional.id,
    scopeType: "REGIONAL",
    effectiveFrom: TEST_INSTANT,
  });
  const serviceA = createService({
    id: `${prefix}-SERVICE-A`,
    areaId: area.id,
    code: `${prefix}-CAMPO`,
    name: "Investigación de campo",
    kind: "ESPECIALIDAD",
    effectiveFrom: TEST_INSTANT,
  });
  const serviceB = createService({
    id: `${prefix}-SERVICE-B`,
    areaId: area.id,
    code: `${prefix}-BALISTICA`,
    name: "Balística",
    kind: "ESPECIALIDAD",
    effectiveFrom: TEST_INSTANT,
  });
  const coverage = createCoverage({
    id: `${prefix}-COVERAGE`,
    areaId: area.id,
    serviceId: serviceA.id,
    regionalId: regional.id,
    subjectId: professional.id,
    effectiveFrom: TEST_INSTANT,
  });
  const caseRecord = createCase({
    id: `${prefix}-CASE`,
    areaId: area.id,
    externalId: `${prefix}-EXTERNAL`,
    createdAt: TEST_INSTANT,
  });
  const itemA = createRequestItem({
    id: `${prefix}-ITEM-A`,
    requestId: `${prefix}-REQUEST`,
    serviceId: serviceA.id,
    regionalId: regional.id,
    childSequence: 1,
    status: "RADICADA",
    createdAt: TEST_INSTANT,
  });
  const itemB = createRequestItem({
    id: `${prefix}-ITEM-B`,
    requestId: `${prefix}-REQUEST`,
    serviceId: serviceB.id,
    regionalId: regional.id,
    childSequence: 2,
    status: "RADICADA",
    createdAt: TEST_INSTANT,
  });
  const request = createRequest({
    id: `${prefix}-REQUEST`,
    caseId: caseRecord.id,
    areaId: area.id,
    requesterUserId: requester.id,
    status: "RADICADA",
    itemIds: [itemA.id, itemB.id],
    createdAt: TEST_INSTANT,
  });
  return {
    area,
    regional,
    role,
    requester,
    professional,
    otherProfessional,
    scope,
    serviceA,
    serviceB,
    coverage,
    caseRecord,
    request,
    itemA,
    itemB,
  };
}

export async function seedPersistence(repository, fixture) {
  await repository.transaction(async (unit) => {
    await unit.saveArea(fixture.area);
    await unit.saveRegional(fixture.regional);
    await unit.saveRole(fixture.role);
    await unit.saveUser(fixture.requester);
    await unit.saveUser(fixture.professional);
    await unit.saveUser(fixture.otherProfessional);
    await unit.saveUserScope(fixture.scope);
    await unit.saveService(fixture.serviceA);
    await unit.saveService(fixture.serviceB);
    await unit.saveCoverage(fixture.coverage);
    await unit.saveCase(fixture.caseRecord);
    await unit.saveRequest(fixture.request);
    await unit.saveRequestItem(fixture.itemA);
    await unit.saveRequestItem(fixture.itemB);
  });
}
