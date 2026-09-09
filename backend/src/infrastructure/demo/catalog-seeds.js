const INVESTIGATION_SPECIALTIES = [
  ["ESP_INV_ANALISIS_INFO", "Análisis de información forense"],
  ["ESP_INV_FINANCIERA", "Financiera forense"],
  ["ESP_INV_ANTROPOLOGIA", "Antropología y morfología forense"],
  ["ESP_INV_FISICA", "Física forense"],
  ["ESP_INV_BALISTICA", "Balística forense"],
  ["ESP_INV_FOTO_VIDEO", "Fotografía y video forense"],
  ["ESP_INV_EXPLOSIVOS", "Explosivos forenses"],
  ["ESP_INV_GRAFOLOGIA", "Grafología y documentología forense"],
  ["ESP_INV_MEDICINA", "Medicina forense"],
  ["ESP_INV_CAMPO", "Investigación de campo"],
  ["ESP_INV_PSICOLOGIA", "Psicología forense"],
  ["ESP_INV_DIGITAL", "Evidencia digital"],
  ["ESP_INV_TOPOGRAFIA", "Topografía forense"],
  ["ESP_INV_CIVIL", "Ingeniería civil forense"],
  ["ESP_INV_LOFOSCOPIA", "Lofoscopia forense"],
  ["ESP_INV_MECANICA", "Ingeniería mecánica forense"],
  ["ESP_INV_AMBIENTAL", "Ingeniería ambiental"],
];

const VICTIMS_DISCIPLINES = [
  ["DISC_VIC_PSICOLOGIA", "Psicología pericial"],
  ["DISC_VIC_FINANCIERA", "Pericia administrativa y financiera"],
];

const SERVICE_SEEDS = [
  serviceSeed({
    id: "SVC_INV_VERIFICACION_TERRENO",
    area: "INVESTIGACION",
    name: "Verificación investigativa en terreno",
    description:
      "Obtención y verificación de información relevante para la teoría del caso.",
    activities: [
      "Visita al lugar de los hechos",
      "Labores de vecindario",
      "Entrevistas a testigos",
    ],
    exclusions: ["Actividades exclusivas de policía judicial"],
    requirements: [
      "Solicitud detallada",
      "Teoría del caso",
      "Información de ubicación",
    ],
    product: "Informe de verificación en terreno",
    specialtyIds: ["ESP_INV_CAMPO"],
  }),
  serviceSeed({
    id: "SVC_INV_RECOLECCION_EMP",
    area: "INVESTIGACION",
    name: "Apoyo técnico en recolección de elementos",
    description:
      "Apoyo investigativo sujeto a las competencias y restricciones legales aplicables.",
    activities: ["Ubicación y recolección técnica de elementos autorizados"],
    exclusions: ["Actos reservados a policía judicial"],
    requirements: [
      "Solicitud detallada",
      "Autorizaciones e insumos aplicables",
    ],
    product: "Informe de actividad investigativa",
    specialtyIds: ["ESP_INV_CAMPO"],
  }),
  serviceSeed({
    id: "SVC_INV_ANALISIS_BALISTICO",
    area: "INVESTIGACION",
    name: "Análisis técnico balístico",
    description:
      "Análisis de armas, proyectiles o trayectorias para apoyar la controversia técnica.",
    activities: [
      "Identificación de aptitud de disparo",
      "Determinación de calibre y marca",
      "Materialización de trayectorias",
    ],
    exclusions: ["Determinación de responsabilidad penal"],
    requirements: [
      "Documentación del proceso",
      "Informe pericial balístico",
      "Elementos y registro fotográfico disponibles",
    ],
    product: "Informe técnico balístico",
    specialtyIds: ["ESP_INV_BALISTICA"],
  }),
  serviceSeed({
    id: "SVC_INV_ANALISIS_DATOS",
    area: "INVESTIGACION",
    name: "Análisis forense de información",
    description:
      "Organización y análisis estructurado de información y contexto probatorio.",
    activities: [
      "Análisis lógico de datos",
      "Construcción de línea de tiempo y espacio",
      "Ayudas demostrativas",
    ],
    exclusions: ["Análisis ajenos a los insumos y la hipótesis informada"],
    requirements: ["Documentos del proceso", "Datos y elementos para analizar"],
    product: "Informe de análisis de información",
    specialtyIds: ["ESP_INV_ANALISIS_INFO"],
  }),
  serviceSeed({
    id: "SVC_INV_RECONSTRUCCION_TECNICA",
    area: "INVESTIGACION",
    name: "Reconstrucción técnica de hechos",
    description:
      "Reconstrucción espacial, física o audiovisual según los insumos disponibles.",
    activities: ["Mediciones", "Fijación técnica", "Reconstrucción analítica"],
    exclusions: ["Emisión de juicios de responsabilidad"],
    requirements: [
      "Documentación del proceso",
      "Planos, imágenes o informes disponibles",
    ],
    product: "Informe de reconstrucción técnica",
    specialtyIds: [
      "ESP_INV_FISICA",
      "ESP_INV_FOTO_VIDEO",
      "ESP_INV_TOPOGRAFIA",
    ],
  }),
  serviceSeed({
    id: "SVC_VIC_EVALUACION_PSICOLOGICA",
    area: "VICTIMAS",
    name: "Evaluación psicológica pericial",
    description:
      "Valoración pericial de afectaciones psicológicas dentro del encargo judicial.",
    activities: [
      "Entrevistas",
      "Evaluación psicológica",
      "Análisis documental",
    ],
    exclusions: [
      "Procesos terapéuticos clínicos",
      "Evaluación de credibilidad",
    ],
    requirements: [
      "Solicitud aplicable",
      "Historia clínica disponible",
      "Consentimiento informado",
    ],
    product: "F-171 o formato oficial aplicable",
    specialtyIds: ["DISC_VIC_PSICOLOGIA"],
  }),
  serviceSeed({
    id: "SVC_VIC_DICTAMEN_PSICOLOGICO",
    area: "VICTIMAS",
    name: "Dictamen pericial psicológico",
    description:
      "Elaboración de dictamen psicológico conforme al encargo aprobado.",
    activities: ["Integración de hallazgos", "Elaboración del dictamen"],
    exclusions: ["Atención terapéutica"],
    requirements: ["Valoración e insumos suficientes"],
    product: "Dictamen psicológico y formato oficial aplicable",
    specialtyIds: ["DISC_VIC_PSICOLOGIA"],
  }),
  serviceSeed({
    id: "SVC_VIC_LIQUIDACION_PERJUICIOS",
    area: "VICTIMAS",
    name: "Liquidación de daño material y perjuicios económicos",
    description:
      "Valoración administrativa y financiera de daños materiales y perjuicios económicos.",
    activities: [
      "Revisión de soportes",
      "Cálculo y liquidación",
      "Juramento estimatorio",
    ],
    exclusions: ["Liquidaciones sin información soporte suficiente"],
    requirements: [
      "Solicitud aplicable",
      "Facturas y documentos de costos y gastos",
    ],
    product: "F-171 o formato oficial aplicable",
    specialtyIds: ["DISC_VIC_FINANCIERA"],
  }),
  serviceSeed({
    id: "SVC_VIC_TASACION_DANOS",
    area: "VICTIMAS",
    name: "Tasación pericial de daños",
    description:
      "Tasación económica de daños conforme al hecho y los soportes disponibles.",
    activities: ["Clasificación de soportes", "Tasación de daños"],
    exclusions: ["Tasaciones sin fuente verificable"],
    requirements: ["Documentación de costos, gastos o bienes afectados"],
    product: "Informe de tasación y formato oficial aplicable",
    specialtyIds: ["DISC_VIC_FINANCIERA"],
  }),
  serviceSeed({
    id: "SVC_VIC_ASISTENCIA_AUDIENCIA",
    area: "VICTIMAS",
    name: "Asistencia técnica a audiencia de reparación",
    description:
      "Acompañamiento técnico relacionado con el producto pericial previamente elaborado.",
    activities: ["Preparación técnica", "Asistencia a audiencia"],
    exclusions: ["Representación judicial del caso"],
    requirements: ["Encargo aprobado", "Producto pericial relacionado"],
    product: "Registro de asistencia técnica",
    specialtyIds: ["DISC_VIC_PSICOLOGIA", "DISC_VIC_FINANCIERA"],
  }),
];

export function createCatalogSeed() {
  const publishedAt = "2026-09-01T00:00:00.000Z";
  const specialties = [
    ...INVESTIGATION_SPECIALTIES.map((entry) =>
      specialty(entry, "INVESTIGACION", "ESPECIALIDAD", publishedAt),
    ),
    ...VICTIMS_DISCIPLINES.map((entry) =>
      specialty(entry, "VICTIMAS", "DISCIPLINA", publishedAt),
    ),
  ];
  const services = SERVICE_SEEDS.map((entry) => {
    const serviceData = structuredClone(entry);
    delete serviceData.specialtyIds;
    return service(serviceData, publishedAt);
  });
  const serviceSpecialtyRelations = SERVICE_SEEDS.flatMap((entry) =>
    entry.specialtyIds.map((specialtyId) =>
      relation(entry, specialtyId, publishedAt),
    ),
  );
  return { specialties, services, serviceSpecialtyRelations };
}

function specialty([id, name], area, kind, publishedAt) {
  return {
    id,
    area,
    kind,
    name,
    version: 1,
    status: "PUBLICADO",
    validFrom: "2026-09-01",
    validTo: null,
    extensible: true,
    institutionalLimit: false,
    source:
      "Clasificación inicial del portafolio fuente, sujeta a validación funcional",
    history: [history(publishedAt, null, "PUBLICADO", "sistema-pre-oracle")],
  };
}

function service(entry, publishedAt) {
  return {
    ...entry,
    scope: entry.activities,
    coverage: {
      mode: "MATRIZ_VERSIONADA",
      label: "Según oferta y cobertura vigente",
      decisionCode:
        entry.area === "INVESTIGACION" ? "DEC-COB-INV" : "DEC-COB-VIC",
    },
    termPolicy: {
      value: null,
      dayType: null,
      startEvent: null,
      calendarId: null,
      decisionCode: "DEC-PLZ-001",
      label: "Valor y calendario pendientes de aprobación funcional",
    },
    version: 1,
    status: "PUBLICADO",
    validFrom: "2026-09-01",
    validTo: null,
    source: "Contenido inicial revisable derivado del portafolio fuente",
    history: [history(publishedAt, null, "PUBLICADO", "sistema-pre-oracle")],
  };
}

function relation(serviceEntry, specialtyId, publishedAt) {
  return {
    id: `REL-${serviceEntry.id}-${specialtyId}`,
    area: serviceEntry.area,
    serviceId: serviceEntry.id,
    specialtyId,
    version: 1,
    status: "PUBLICADO",
    validFrom: "2026-09-01",
    validTo: null,
    source: "Relación inicial revisable del portafolio fuente",
    history: [history(publishedAt, null, "PUBLICADO", "sistema-pre-oracle")],
  };
}

function serviceSeed(entry) {
  return entry;
}

function history(
  at,
  from,
  to,
  actor,
  reason = "Publicación inicial revisable",
) {
  return { at, from, to, actor, reason };
}
