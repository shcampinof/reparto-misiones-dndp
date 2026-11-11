// D: technical mapping of the existing domain contract; no new workflow rules.
// DATOS stores the extensible fragment of ONE entity, never the runtime aggregate.
export const model = [
  { table: "SIGIP_AUXILIAR", columns: {} },
  { table: "SIGIP_USUARIO", columns: {} },
  {
    table: "SIGIP_PERFIL",
    columns: {
      USUARIO_ID: "VARCHAR2(256) NOT NULL REFERENCES SIGIP_USUARIO(ID)",
      AREA: "VARCHAR2(20) NOT NULL",
      ROL: "VARCHAR2(80) NOT NULL",
      REGIONAL: "VARCHAR2(128)",
    },
  },
  {
    table: "SIGIP_EJECUTOR",
    columns: { AREA: "VARCHAR2(20) NOT NULL", REGIONAL: "VARCHAR2(128)" },
  },
  {
    table: "SIGIP_CATALOGO",
    columns: {
      CATEGORIA: "VARCHAR2(100) NOT NULL",
      CODIGO: "VARCHAR2(256)",
      VERSION: "NUMBER",
      ESTADO: "VARCHAR2(40)",
      VIGENTE_DESDE: "VARCHAR2(32)",
      VIGENTE_HASTA: "VARCHAR2(32)",
    },
  },
  {
    table: "SIGIP_PARAMETRO",
    columns: {
      AREA: "VARCHAR2(20)",
      TIPO: "VARCHAR2(100)",
      VERSION: "VARCHAR2(256)",
      ESTADO: "VARCHAR2(40)",
      VIGENTE_DESDE: "VARCHAR2(32)",
      VIGENTE_HASTA: "VARCHAR2(32)",
    },
  },
  { table: "SIGIP_CALENDARIO", columns: {} },
  {
    table: "SIGIP_CASO",
    columns: {
      AREA: "VARCHAR2(20) NOT NULL",
      IDENTIFICADOR: "VARCHAR2(256) NOT NULL",
    },
    constraints: [
      "UNIQUE (AREA, IDENTIFICADOR)",
      "CHECK (AREA IN ('INVESTIGACION','VICTIMAS'))",
    ],
  },
  {
    table: "SIGIP_SOLICITUD",
    columns: {
      CASO_ID: "VARCHAR2(256) NOT NULL REFERENCES SIGIP_CASO(ID)",
      AREA: "VARCHAR2(20) NOT NULL",
      TITULAR_ID: "VARCHAR2(256) NOT NULL",
    },
  },
  {
    table: "SIGIP_VERSION_SOL",
    columns: {
      SOLICITUD_ID: "VARCHAR2(256) NOT NULL REFERENCES SIGIP_SOLICITUD(ID)",
      VERSION: "NUMBER NOT NULL",
      CONTENIDO: "CLOB NOT NULL CHECK (CONTENIDO IS JSON)",
    },
    constraints: ["UNIQUE (SOLICITUD_ID, VERSION)", "CHECK (VERSION > 0)"],
    contentImmutable: true,
  },
  {
    table: "SIGIP_ITEM_SOLICITUD",
    columns: {
      SOLICITUD_ID: "VARCHAR2(256) NOT NULL REFERENCES SIGIP_SOLICITUD(ID)",
      AREA: "VARCHAR2(20) NOT NULL",
      SERVICIO: "VARCHAR2(256)",
      ESTADO: "VARCHAR2(80) NOT NULL",
      EJECUTOR_ID: "VARCHAR2(256) REFERENCES SIGIP_EJECUTOR(ID)",
      ASIGNACION_ID: "VARCHAR2(256)",
    },
  },
  {
    table: "SIGIP_ASIGNACION",
    columns: {
      ITEM_ID: "VARCHAR2(256) NOT NULL REFERENCES SIGIP_ITEM_SOLICITUD(ID)",
      EJECUTOR_ID: "VARCHAR2(256) REFERENCES SIGIP_EJECUTOR(ID)",
      POLITICA: "VARCHAR2(256)",
    },
    immutable: true,
  },
  {
    table: "SIGIP_TRANSICION",
    columns: {
      ITEM_ID: "VARCHAR2(256) NOT NULL REFERENCES SIGIP_ITEM_SOLICITUD(ID)",
    },
    constraints: ["UNIQUE (ITEM_ID, ORDEN)"],
    immutable: true,
  },
  {
    table: "SIGIP_PERSONA_SOLICITUD",
    columns: {
      SOLICITUD_ID: "VARCHAR2(256) NOT NULL REFERENCES SIGIP_SOLICITUD(ID)",
      VERSION_SOL: "NUMBER NOT NULL",
      GRUPO_ID: "VARCHAR2(64) NOT NULL",
    },
    constraints: [
      "UNIQUE (SOLICITUD_ID, VERSION_SOL, GRUPO_ID, ORDEN)",
      "CHECK (VERSION_SOL >= 0)",
    ],
    immutable: true,
  },
  {
    table: "SIGIP_DOCUMENTO",
    columns: {
      SOLICITUD_ID: "VARCHAR2(256) NOT NULL REFERENCES SIGIP_SOLICITUD(ID)",
      ITEM_ID: "VARCHAR2(256) REFERENCES SIGIP_ITEM_SOLICITUD(ID)",
      CLASE: "VARCHAR2(32) NOT NULL",
    },
    immutable: true,
  },
  {
    table: "SIGIP_VERSION_DOCUMENTO",
    columns: {
      DOCUMENTO_ID: "VARCHAR2(256) NOT NULL REFERENCES SIGIP_DOCUMENTO(ID)",
      VERSION: "NUMBER NOT NULL",
      VERSION_SOL: "NUMBER",
      CONTENIDO: "CLOB NOT NULL CHECK (CONTENIDO IS JSON)",
    },
    constraints: ["UNIQUE (DOCUMENTO_ID, VERSION)", "CHECK (VERSION > 0)"],
    contentImmutable: true,
  },
  {
    table: "SIGIP_BORRADOR",
    columns: {
      TITULAR_ID: "VARCHAR2(256) NOT NULL",
      AREA: "VARCHAR2(20) NOT NULL",
      REVISION: "NUMBER NOT NULL",
    },
    constraints: ["CHECK (REVISION > 0)"],
  },
  {
    table: "SIGIP_OUTBOX",
    columns: {
      CLAVE: "VARCHAR2(512) NOT NULL UNIQUE",
      ITEM_ID: "VARCHAR2(256) NOT NULL REFERENCES SIGIP_ITEM_SOLICITUD(ID)",
      ESTADO: "VARCHAR2(80) NOT NULL",
    },
  },
  { table: "SIGIP_AUDITORIA", columns: {}, immutable: true },
];

export function schemaStatements() {
  const statements = [
    "CREATE TABLE SIGIP_CONTROL (ID NUMBER PRIMARY KEY CHECK (ID = 1), REVISION NUMBER DEFAULT 0 NOT NULL, INICIALIZADO NUMBER DEFAULT 0 NOT NULL CHECK (INICIALIZADO IN (0,1)))",
  ];
  for (const entry of model) {
    const columns = [
      "ID VARCHAR2(256) PRIMARY KEY",
      "ORDEN NUMBER NOT NULL",
      "DATOS CLOB NOT NULL CHECK (DATOS IS JSON)",
      "REGISTRADO_EN TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL",
      ...Object.entries(entry.columns).map(
        ([key, definition]) => `${key} ${definition}`,
      ),
      ...(entry.constraints || []),
    ];
    statements.push(`CREATE TABLE ${entry.table} (${columns.join(", ")})`);
    if (entry.immutable)
      statements.push(
        `CREATE OR REPLACE TRIGGER ${entry.table}_INM BEFORE UPDATE OR DELETE ON ${entry.table} BEGIN RAISE_APPLICATION_ERROR(-20001, 'Historial inmutable'); END;`,
      );
    if (entry.contentImmutable)
      statements.push(
        `CREATE OR REPLACE TRIGGER ${entry.table}_INM BEFORE UPDATE OR DELETE ON ${entry.table} FOR EACH ROW BEGIN IF DELETING THEN RAISE_APPLICATION_ERROR(-20001, 'Version inmutable'); ELSIF DBMS_LOB.COMPARE(:OLD.CONTENIDO, :NEW.CONTENIDO) <> 0 THEN RAISE_APPLICATION_ERROR(-20001, 'Contenido inmutable'); END IF; END;`,
      );
  }
  statements.push(
    "CREATE INDEX SIGIP_ITEM_EJEC_EST ON SIGIP_ITEM_SOLICITUD(EJECUTOR_ID, ESTADO)",
  );
  statements.push(
    "CREATE INDEX SIGIP_SOL_TITULAR ON SIGIP_SOLICITUD(TITULAR_ID, AREA)",
  );
  statements.push("CREATE INDEX SIGIP_OUT_ESTADO ON SIGIP_OUTBOX(ESTADO)");
  statements.push("CREATE INDEX SIGIP_DOC_ITEM ON SIGIP_DOCUMENTO(ITEM_ID)");
  return statements;
}
