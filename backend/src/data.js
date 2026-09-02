export const PROCESS_STAGES = [
  "Imputacion",
  "Acusacion",
  "Preparatoria",
  "Juicio",
  "Incidente de reparacion",
  "Casacion",
];

export const PRIORITIES = ["normal", "alta", "urgente"];

export const STATUS_FLOW = [
  "borrador",
  "radicada",
  "recibida",
  "en_revision",
  "devuelta",
  "aprobada_para_reparto",
  "asignada",
  "en_ejecucion",
  "solicitud_ampliacion",
  "ampliacion_aprobada",
  "ampliacion_rechazada",
  "informe_entregado",
  "finalizada",
  "anulada",
];

export const STATUS_LABELS = {
  borrador: "Borrador",
  radicada: "Radicada",
  recibida: "Recibida",
  en_revision: "En revision",
  devuelta: "Devuelta",
  aprobada_para_reparto: "Aprobada para reparto",
  asignada: "Asignada",
  en_ejecucion: "En ejecucion",
  solicitud_ampliacion: "Solicitud ampliacion",
  ampliacion_aprobada: "Ampliacion aprobada",
  ampliacion_rechazada: "Ampliacion rechazada",
  informe_entregado: "Informe entregado",
  finalizada: "Finalizada",
  anulada: "Anulada",
};

export const specialties = [
  {
    id: 1,
    nombre: "Analisis de informacion forense",
    descripcion:
      "Analisis logico y correlacion de datos para controversia tecnica.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: [
      "Linea de tiempo",
      "Correlacion de datos",
      "Apoyo en controversia",
    ],
    informacion_requerida: ["Documentos del proceso", "Evidencia digital"],
    servicios_no_disponibles: ["Casos fuera del alcance tecnico"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 2,
    nombre: "Financiera forense",
    descripcion:
      "Evaluacion financiera, economica y contable para procesos penales.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: [
      "Estados financieros",
      "Tasacion de danos",
      "Cuestionarios",
    ],
    informacion_requerida: ["Documentacion financiera", "Informes contables"],
    servicios_no_disponibles: ["Analisis sin soportes"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 3,
    nombre: "Antropologia y morfologia forense",
    descripcion: "Soporte antropometrico y morfologico para controversia.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: ["Mediciones antropometricas", "Retrato hablado"],
    informacion_requerida: [
      "Descubrimiento probatorio",
      "Material fotografico",
    ],
    servicios_no_disponibles: ["Determinacion de responsabilidad"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 4,
    nombre: "Fisica forense",
    descripcion: "Aplicacion de fisica para reconstruccion de eventos.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: [
      "Trayectorias",
      "Colisiones",
      "Calculos de velocidad",
    ],
    informacion_requerida: ["IPAT", "Planos", "Evidencia fisica"],
    servicios_no_disponibles: ["Animaciones procesales"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 5,
    nombre: "Balistica forense",
    descripcion: "Analisis de armas y elementos balisticos.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: [
      "Aptitud de disparo",
      "Calibre",
      "Estudio microscopico",
    ],
    informacion_requerida: ["Informe de balistica", "Necropsia", "EMP"],
    servicios_no_disponibles: ["Determinacion de autoria"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 6,
    nombre: "Fotografia y video forense",
    descripcion: "Registro y analisis tecnico de evidencia visual.",
    tipo_servicio: "investigacion_campo",
    dias_respuesta: 25,
    activo: true,
    servicios_disponibles: ["Fijacion fotografica", "Analisis de video"],
    informacion_requerida: ["Teoria del caso", "Ubicaciones"],
    servicios_no_disponibles: ["Funciones de policia judicial"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 7,
    nombre: "Explosivos forenses",
    descripcion: "Analisis de incidentes con material explosivo.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: ["Revision documental", "Asesoria tecnica"],
    informacion_requerida: ["Acta de destruccion", "Album fotografico"],
    servicios_no_disponibles: ["Casos ajenos al area"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 8,
    nombre: "Grafologia y documentologia forense",
    descripcion: "Autenticidad documental, firmas y escritura.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: ["Cotejo de firmas", "Verificacion documental"],
    informacion_requerida: ["Informes de policia judicial"],
    servicios_no_disponibles: ["Documentos fotocopiados sin originales"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 9,
    nombre: "Medicina forense",
    descripcion: "Analisis de documentos medico-legales.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: [
      "Analisis de historia clinica",
      "Cuestionarios medicos",
    ],
    informacion_requerida: ["Documentos medicos", "Escrito de acusacion"],
    servicios_no_disponibles: ["Necropsias y exhumaciones"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 10,
    nombre: "Investigacion de campo",
    descripcion: "Labores de campo desde la perspectiva de la defensa.",
    tipo_servicio: "investigacion_campo",
    dias_respuesta: 25,
    activo: true,
    servicios_disponibles: [
      "Visita al lugar",
      "Entrevistas",
      "Labores de vecindario",
    ],
    informacion_requerida: [
      "Solicitud detallada",
      "Descubrimiento de fiscalia",
    ],
    servicios_no_disponibles: ["Labores de policia judicial"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 11,
    nombre: "Psicologia forense",
    descripcion: "Evaluaciones psicologicas para controversia judicial.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: [
      "Analisis psicologico",
      "Acompanamiento como asesor",
    ],
    informacion_requerida: ["Solicitud concreta", "Entrevista argumentativa"],
    servicios_no_disponibles: ["Procesos terapeuticos"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 12,
    nombre: "Laboratorio forense de evidencia digital",
    descripcion: "Analisis de evidencia digital y dispositivos.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: ["Imagen forense", "Asesoria informatica"],
    informacion_requerida: ["Hipotesis clara", "Informes de policia judicial"],
    servicios_no_disponibles: ["Recuperacion sin garantia"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 13,
    nombre: "Topografia forense",
    descripcion: "Representacion tecnica de espacios y escenarios.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: ["Fijacion y replanteo", "Mediciones"],
    informacion_requerida: ["Planos", "Escrito de acusacion"],
    servicios_no_disponibles: ["Estudios de visibilidad"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 14,
    nombre: "Ingenieria civil forense",
    descripcion: "Analisis de predios, danos y obras civiles.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: ["Costos", "Fallas estructurales"],
    informacion_requerida: ["Visita de obra", "Informe policial"],
    servicios_no_disponibles: ["Actuacion sin soporte tecnico"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 15,
    nombre: "Lofoscopia forense",
    descripcion: "Analisis dactilar y evidencia lofoscopica.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: [
      "Cotejo de impresiones",
      "Confrontacion decadactilar",
    ],
    informacion_requerida: ["EMP", "Informes de policia judicial"],
    servicios_no_disponibles: ["Casos fuera del alcance tecnico"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 16,
    nombre: "Ingenieria mecanica forense",
    descripcion: "Analisis de fallas mecanicas y riesgos.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: ["Accidentologia", "Analisis de materiales"],
    informacion_requerida: ["Documentacion del proceso", "Informes tecnicos"],
    servicios_no_disponibles: ["Casos fuera del alcance tecnico"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
  {
    id: 17,
    nombre: "Ingenieria ambiental",
    descripcion:
      "Analisis de impacto ambiental y evidencias asociadas al caso.",
    tipo_servicio: "pericial",
    dias_respuesta: 45,
    activo: true,
    servicios_disponibles: ["Analisis ambiental", "Soporte tecnico pericial"],
    informacion_requerida: ["Documentacion tecnica", "Registros de campo"],
    servicios_no_disponibles: ["Procesos fuera del alcance ambiental"],
    perfiles_habilitados: [
      "coordinador",
      "defensor",
      "investigador",
      "administrador",
    ],
  },
];

export const stageCatalog = PROCESS_STAGES.map((name, index) => ({
  id: index + 1,
  name,
}));

const todayIso = new Date().toISOString().slice(0, 10);

export const investigators = [
  {
    id: "inv-001",
    nombre: "Carlos Lopez Mendez",
    regional: "Bogota",
    especialidades: [10, 6],
    activo: true,
    en_comision: false,
    novedad_administrativa: false,
    recomendacion_medica: false,
    capacidad_maxima: null,
    carga_actual: 2,
    ultima_asignacion: "2026-03-20",
  },
  {
    id: "inv-002",
    nombre: "Andres Felipe Ruiz",
    regional: "Medellin",
    especialidades: [5, 4],
    activo: true,
    en_comision: false,
    novedad_administrativa: false,
    recomendacion_medica: false,
    capacidad_maxima: null,
    carga_actual: 3,
    ultima_asignacion: "2026-03-19",
  },
  {
    id: "inv-003",
    nombre: "Diana Carolina Vargas",
    regional: "Cali",
    especialidades: [11, 3],
    activo: true,
    en_comision: false,
    novedad_administrativa: false,
    recomendacion_medica: false,
    capacidad_maxima: null,
    carga_actual: 1,
    ultima_asignacion: "2026-03-22",
  },
  {
    id: "inv-004",
    nombre: "Santiago Campino",
    regional: "Bogota",
    especialidades: [12, 1, 6],
    activo: true,
    en_comision: false,
    novedad_administrativa: false,
    recomendacion_medica: false,
    capacidad_maxima: null,
    carga_actual: 1,
    ultima_asignacion: "2026-03-24",
  },
];

export const solicitudesMadre = [
  {
    id: "sol-2026-0001",
    numero_mision: "MT-2026-0001",
    fecha_radicacion: "2026-03-02T08:00:00",
    estado: "radicada",
    defensor_nombre: "Dr. Carlos Garcia Perez",
    regional_origen: "Bogota",
    regional_servicio: "Bogota",
    spoa: "110016000049202600001",
    delito: "Homicidio",
    etapa_procesal: "Juicio",
    breve_relacion_hechos: "Relato resumido de hechos",
    hipotesis: "Hipotesis defensiva",
    prioridad: "normal",
    es_urgente: false,
    causal_urgencia: null,
    tipo_tramite: "asignacion_normal",
    created_at: "2026-03-02T08:00:00",
    updated_at: "2026-03-02T08:00:00",
  },
];

export const radicados = [
  {
    id: "rad-2026-0001-01",
    solicitud_id: "sol-2026-0001",
    numero_radicado: "MT-2026-0001-01",
    especialidad_id: 10,
    estado: "en_ejecucion",
    investigador_id: "inv-001",
    tipo_asignacion: "automatica",
    fecha_asignacion: "2026-03-03",
    fecha_limite: "2026-03-28",
    dias_respuesta: 25,
    prioridad: "normal",
    historial: [
      {
        evento: "radicado_generado",
        fecha: "2026-03-02T08:10:00",
        detalle: "Generado por sistema",
      },
      {
        evento: "aprobada_para_reparto",
        fecha: "2026-03-03T08:00:00",
        detalle: "Revision de conformidad",
      },
      {
        evento: "asignada",
        fecha: "2026-03-03T08:30:00",
        detalle: "Asignacion automatica",
      },
      {
        evento: "en_ejecucion",
        fecha: "2026-03-04T09:00:00",
        detalle: "Inicio de labores",
      },
    ],
    ampliaciones: [],
  },
  {
    id: "rad-2026-0002-01",
    solicitud_id: "sol-2026-0001",
    numero_radicado: "MT-2026-0001-02",
    especialidad_id: 5,
    estado: "asignada",
    investigador_id: "inv-002",
    tipo_asignacion: "manual",
    fecha_asignacion: "2026-03-05",
    fecha_limite: "2026-04-19",
    dias_respuesta: 45,
    prioridad: "alta",
    historial: [
      {
        evento: "radicado_generado",
        fecha: "2026-03-02T08:11:00",
        detalle: "Generado por sistema",
      },
      {
        evento: "aprobada_para_reparto",
        fecha: "2026-03-04T09:00:00",
        detalle: "Revision de conformidad",
      },
      {
        evento: "asignada_manual",
        fecha: "2026-03-05T10:00:00",
        detalle: "Asignacion manual justificada",
      },
    ],
    ampliaciones: [],
  },
  {
    id: "rad-2026-0003-01",
    solicitud_id: "sol-2026-0001",
    numero_radicado: "MT-2026-0001-03",
    especialidad_id: 11,
    estado: "recibida",
    investigador_id: null,
    tipo_asignacion: null,
    fecha_asignacion: null,
    fecha_limite: null,
    dias_respuesta: 45,
    prioridad: "urgente",
    historial: [
      {
        evento: "radicado_generado",
        fecha: "2026-03-02T08:12:00",
        detalle: "Generado por sistema",
      },
    ],
    ampliaciones: [],
  },
  {
    id: "rad-2026-0004-01",
    solicitud_id: "sol-2026-0001",
    numero_radicado: "MT-2026-0001-04",
    especialidad_id: 12,
    estado: "asignada",
    investigador_id: "inv-004",
    tipo_asignacion: "manual",
    fecha_asignacion: "2026-03-24",
    fecha_limite: "2026-05-08",
    dias_respuesta: 45,
    prioridad: "normal",
    avance: 20,
    documentos: [
      {
        nombre: "Solicitud SD-P03-F04",
        referencia: "SIMULADO-SGDEA-2026-0142",
        tipo: "Formulario",
      },
      {
        nombre: "Descubrimiento probatorio",
        referencia: "IRIS-EXP-2026-7781",
        tipo: "Soporte",
      },
    ],
    historial: [
      {
        evento: "radicado_generado",
        fecha: "2026-03-02T08:13:00",
        detalle: "Generado por sistema",
      },
      {
        evento: "aprobada_para_reparto",
        fecha: "2026-03-04T09:30:00",
        detalle: "Revision de conformidad",
      },
      {
        evento: "asignada_manual",
        fecha: "2026-03-24T11:00:00",
        detalle: "Asignacion manual a Santiago Campino",
      },
    ],
    ampliaciones: [],
  },
];

export const users = [
  {
    id: "u-000",
    document: "admin",
    password: null,
    fullName: "Administrador",
    accounts: [
      {
        id: "acc-00",
        email: "admin@defensoria.gov.co",
        role: "administrador",
        roleLabel: "Administrador del sistema",
        initials: "AD",
      },
    ],
  },
  {
    id: "u-001",
    document: "1010101010",
    password: null,
    fullName: "Ivan Monterrey",
    accounts: [
      {
        id: "acc-01",
        email: "imonterrey@defensoria.gov.co",
        role: "coordinador",
        roleLabel: "Coordinador GID",
        initials: "IM",
      },
      {
        id: "acc-02",
        email: "imonterrey.inv@defensoria.gov.co",
        role: "investigador",
        roleLabel: "Investigador",
        initials: "IM",
        investigatorId: "inv-001",
      },
    ],
  },
  {
    id: "u-002",
    document: "1234567890",
    password: null,
    fullName: "Carlos Garcia",
    accounts: [
      {
        id: "acc-03",
        email: "cgarcia@defensoria.gov.co",
        role: "defensor",
        roleLabel: "Defensor Publico",
        initials: "CG",
      },
    ],
  },
  {
    id: "u-007",
    document: "scampino",
    password: null,
    fullName: "Santiago Campino",
    accounts: [
      {
        id: "acc-08",
        email: "scampino.inv@defensoria.gov.co",
        role: "investigador",
        roleLabel: "Investigador",
        initials: "SC",
        investigatorId: "inv-004",
      },
    ],
  },
  {
    id: "u-003",
    document: "2002002000",
    password: null,
    fullName: "Martha Rojas",
    accounts: [
      {
        id: "acc-04",
        email: "mrojas@defensoria.gov.co",
        role: "defensor_regional",
        roleLabel: "Defensor Regional",
        initials: "MR",
      },
    ],
  },
  {
    id: "u-004",
    document: "3003003000",
    password: null,
    fullName: "Nancy Albarracin",
    accounts: [
      {
        id: "acc-05",
        email: "nalbarracin@defensoria.gov.co",
        role: "pag",
        roleLabel: "Profesional Administrativo y de Gestion",
        initials: "NA",
      },
    ],
  },
  {
    id: "u-005",
    document: "4004004000",
    password: null,
    fullName: "Laura Medina",
    accounts: [
      {
        id: "acc-06",
        email: "lmedina@defensoria.gov.co",
        role: "administrativo_delegado",
        roleLabel: "Administrativo delegado",
        initials: "LM",
      },
    ],
  },
  {
    id: "u-006",
    document: "5005005000",
    password: null,
    fullName: "Jorge Salazar",
    accounts: [
      {
        id: "acc-07",
        email: "jsalazar@defensoria.gov.co",
        role: "pag_unidad_operativa",
        roleLabel: "PAG unidad operativa",
        initials: "JS",
      },
    ],
  },
];

export const roleSections = {
  coordinador: ["dashboard", "solicitudes", "misiones", "reportes", "catalogo"],
  defensor: ["nueva-solicitud", "mis-solicitudes", "catalogo"],
  investigador: ["mis-misiones", "catalogo"],
  administrador: [
    "dashboard",
    "solicitudes",
    "misiones",
    "reportes",
    "catalogo",
  ],
  pag: ["solicitudes", "misiones", "reportes", "catalogo"],
  administrativo_delegado: ["solicitudes", "catalogo"],
  defensor_regional: ["solicitudes", "reportes", "catalogo"],
  pag_unidad_operativa: ["solicitudes", "misiones", "catalogo"],
};

export function nextMissionNumber() {
  const max = solicitudesMadre.reduce((acc, row) => {
    const seq = Number(row.numero_mision.split("-")[2] || 0);
    return Math.max(acc, seq);
  }, 0);
  return `MT-${new Date().getFullYear()}-${String(max + 1).padStart(4, "0")}`;
}

export function addCalendarDays(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calculateDaysByRule(specialty, tipoTramite) {
  if (!specialty) return 45;
  if (specialty.tipo_servicio === "investigacion_campo") {
    if (tipoTramite === "utilidad_publica") return 15;
    return 25;
  }
  return 45;
}

export function getSemaphore(fechaLimite) {
  if (!fechaLimite) return { color: "gris", label: "Sin fecha limite" };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(`${fechaLimite}T00:00:00`);
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { color: "rojo", label: "Vencido" };
  if (diff <= 3) return { color: "naranja", label: "1 a 3 dias" };
  if (diff <= 7) return { color: "amarillo", label: "4 a 7 dias" };
  return { color: "verde", label: "Mas de 7 dias" };
}

export function buildMissionView() {
  return radicados.map((radicado) => {
    const solicitud = solicitudesMadre.find(
      (item) => item.id === radicado.solicitud_id,
    );
    const specialty = specialties.find(
      (item) => item.id === radicado.especialidad_id,
    );
    const investigator = investigators.find(
      (item) => item.id === radicado.investigador_id,
    );
    const semaforo = getSemaphore(radicado.fecha_limite);

    return {
      id: radicado.numero_radicado,
      parentMission: solicitud?.numero_mision,
      date: (solicitud?.fecha_radicacion || todayIso).slice(0, 10),
      defender: solicitud?.defensor_nombre || "Sin defensor",
      defenderRegion: solicitud?.regional_origen || "Sin regional",
      spoa: solicitud?.spoa || "",
      delito: solicitud?.delito || "",
      specialty: specialty?.nombre || "Especialidad no encontrada",
      specialtyId: radicado.especialidad_id,
      status: radicado.estado,
      priority: radicado.prioridad,
      investigatorId: radicado.investigador_id,
      investigator: investigator?.nombre || "Sin asignar",
      assignmentDate: radicado.fecha_asignacion,
      dueDate: radicado.fecha_limite,
      daysResponse: radicado.dias_respuesta,
      progress:
        radicado.avance ??
        (radicado.estado === "finalizada" ||
        radicado.estado === "informe_entregado"
          ? 100
          : radicado.estado === "en_ejecucion"
            ? 60
            : radicado.estado === "asignada"
              ? 20
              : 0),
      assignmentType: radicado.tipo_asignacion,
      isUrgent: solicitud?.es_urgente || false,
      urgencyCause: solicitud?.causal_urgencia || null,
      semaphore: semaforo,
      history: radicado.historial,
      documents: radicado.documentos || [
        {
          nombre: "Solicitud SD-P03-F04",
          referencia: "SIMULADO-SGDEA",
          tipo: "Formulario",
        },
      ],
      report: radicado.informe || null,
      caseInfo: {
        delito: solicitud?.delito || "",
        etapa: solicitud?.etapa_procesal || "",
        hechos: solicitud?.breve_relacion_hechos || "",
        hipotesis: solicitud?.hipotesis || "",
      },
    };
  });
}

export function buildDashboardData(missionView) {
  const active = missionView.filter((m) =>
    [
      "asignada",
      "en_ejecucion",
      "solicitud_ampliacion",
      "ampliacion_aprobada",
    ].includes(m.status),
  );
  const pending = missionView.filter((m) =>
    ["recibida", "en_revision", "aprobada_para_reparto"].includes(m.status),
  );
  const nearDue = missionView.filter((m) =>
    ["amarillo", "naranja", "rojo"].includes(m.semaphore?.color),
  );
  const expired = missionView.filter((m) => m.semaphore?.color === "rojo");

  return {
    kpis: {
      totalReceived: missionView.length,
      activeMissions: active.length,
      pendingAssignment: pending.length,
      nearDue: nearDue.length,
      expired: expired.length,
    },
  };
}
