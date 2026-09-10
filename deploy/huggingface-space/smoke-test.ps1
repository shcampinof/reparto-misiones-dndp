param(
  [string]$BaseUrl = "http://127.0.0.1:7860",
  [string]$HfToken = ""
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd('/')

function Login-Demo([string]$UserId) {
  $response = Invoke-RestMethod "$BaseUrl/api/auth/demo-login" -Method Post -Headers (Gateway-Headers) -ContentType "application/json" -Body (@{ userId = $UserId } | ConvertTo-Json)
  return $response.accessToken
}

function Auth-Headers([string]$Token) {
  $headers = @{ Authorization = "Bearer $Token" }
  if ($HfToken) {
    $headers["X-HF-Authorization"] = "Bearer $HfToken"
  }
  return $headers
}

function Gateway-Headers() {
  if ($HfToken) {
    return @{ Authorization = "Bearer $HfToken" }
  }
  return @{}
}

function Assert-Forbidden([scriptblock]$Operation) {
  try {
    & $Operation | Out-Null
    throw "La operación administrativa debía responder 403."
  } catch {
    $statusCode = [int]$_.Exception.Response.StatusCode
    if ($statusCode -ne 403) {
      throw
    }
  }
}

function Assert-Value($Actual, $Expected, [string]$Label) {
  if ($Actual -ne $Expected) {
    throw "$Label`: esperado '$Expected', obtenido '$Actual'."
  }
}

$health = Invoke-RestMethod "$BaseUrl/api/health" -Headers (Gateway-Headers)
$ready = Invoke-RestMethod "$BaseUrl/api/ready" -Headers (Gateway-Headers)
$homeResponse = Invoke-WebRequest "$BaseUrl/" -Headers (Gateway-Headers) -UseBasicParsing
$internalRoute = Invoke-WebRequest "$BaseUrl/portal" -Headers (Gateway-Headers) -UseBasicParsing

$defender = Login-Demo "demo-defensor"
$investigation = Invoke-RestMethod "$BaseUrl/api/demo/investigacion/solicitudes" -Method Post -Headers (Auth-Headers $defender) -ContentType "application/json" -Body (@{
  identifierType = "SPOA"
  spoa = "110016000049202600077"
  delito = "Investigación de hechos asociados al caso"
  processReference = "Proceso penal de verificación"
  proceduralStage = "INVESTIGACION"
  hearingApplies = $true
  hearingDate = "2026-10-15"
  facts = "Hechos de verificación sin información personal real"
  hypothesis = "Hipótesis de trabajo para comprobar el recorrido"
  requiredWork = "Verificar fuentes y circunstancias"
  differentialApproach = @{ applies = $false; detail = $null }
  priority = @{ type = "ORDINARIA"; reason = $null; support = $null }
  persons = @(@{ alias = "Persona relacionada A"; relationship = "Procesado/a"; notes = $null })
  documents = @(@{ type = "SOLICITUD_DEFENSA"; reference = "REF-SOL-SMOKE-001" })
  service = "SVC_INV_VERIFICACION_TERRENO"
  region = "BOGOTA"
} | ConvertTo-Json -Depth 8)
$investigationItem = $investigation.request.items[0]
Assert-Forbidden {
  Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/repartir" -Method Post -Headers (Auth-Headers $defender)
}

$investigator = Login-Demo "demo-investigador"
Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/iniciar" -Method Post -Headers (Auth-Headers $investigator) | Out-Null
$investigationProblem = Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/operaciones/problema" -Method Post -Headers (Auth-Headers $investigator) -ContentType "application/json" -Body (@{
  reason = "Insumo incompleto"
  description = "Se requiere una referencia adicional para continuar"
  supportReference = "ANEXO-INV-SMOKE-001"
} | ConvertTo-Json)
Assert-Value $investigationProblem.request.items[0].status "EN_EJECUCION" "Estado tras reporte de Investigación"
Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/avance" -Method Post -Headers (Auth-Headers $investigator) -ContentType "application/json" -Body (@{ observation = "Actuación registrada" } | ConvertTo-Json) | Out-Null
Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/entregar" -Method Post -Headers (Auth-Headers $investigator) -ContentType "application/json" -Body (@{ reference = "INF-2026-SMOKE-001" } | ConvertTo-Json) | Out-Null
$pagInvestigation = Login-Demo "demo-pag-investigacion"
$investigationClosed = Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/aprobar-entrega" -Method Post -Headers (Auth-Headers $pagInvestigation)

$rjv = Login-Demo "demo-rjv"
$victims = Invoke-RestMethod "$BaseUrl/api/demo/victimas/solicitudes" -Method Post -Headers (Auth-Headers $rjv) -ContentType "application/json" -Body (@{
  externalId = "RAD-2026-0077"
  law = "LEY_1448"
  service = "SVC_VIC_EVALUACION_PSICOLOGICA"
  region = "BOGOTA"
  caseData = @{
    processReference = "Proceso de reparación de verificación"
    hearingApplies = $true
    hearingDate = "2026-10-20"
    facts = "Hechos de verificación sin información personal real"
  }
  persons = @(
    @{ alias = "Persona vinculada A"; type = "DIRECTA"; relationship = "Víctima directa"; familyGroup = "Núcleo A"; contact = @{ phone = "3000000001"; email = "persona.a@example.invalid"; preferredChannel = "Correo" } },
    @{ alias = "Persona vinculada B"; type = "INDIRECTA"; relationship = "Familiar"; familyGroup = "Núcleo A"; contact = @{ phone = "3000000002"; email = "persona.b@example.invalid"; preferredChannel = "Teléfono" } }
  )
  documents = @(@{ type = "FORMATO_SOLICITUD"; reference = "REF-FORM-SMOKE-001" })
} | ConvertTo-Json -Depth 8)
$victimsItem = $victims.request.items[0]
$pagVictims = Login-Demo "demo-pag-victimas"
$victimsReturned = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/devolver-solicitud" -Method Post -Headers (Auth-Headers $pagVictims) -ContentType "application/json" -Body (@{
  observation = "Completar soporte del grupo familiar"
} | ConvertTo-Json)
$victimsResent = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/corregir-reenviar" -Method Post -Headers (Auth-Headers $rjv) -ContentType "application/json" -Body (@{
  correctionSummary = "Se precisaron los hechos, el contacto y la referencia documental"
  externalId = "RAD-2026-0077"
  law = "LEY_1448"
  service = "SVC_VIC_EVALUACION_PSICOLOGICA"
  region = "BOGOTA"
  caseData = @{
    processReference = "Proceso de reparación de verificación"
    hearingApplies = $true
    hearingDate = "2026-10-20"
    facts = "Hechos corregidos luego de revisar el soporte del grupo familiar"
  }
  persons = @(
    @{ alias = "Persona vinculada A"; type = "DIRECTA"; relationship = "Víctima directa"; familyGroup = "Núcleo A"; contact = @{ phone = "3000000099"; email = "persona.a@example.invalid"; preferredChannel = "Correo" } },
    @{ alias = "Persona vinculada B"; type = "INDIRECTA"; relationship = "Familiar"; familyGroup = "Núcleo A"; contact = @{ phone = "3000000002"; email = "persona.b@example.invalid"; preferredChannel = "Teléfono" } }
  )
  documents = @(@{ type = "FORMATO_SOLICITUD"; reference = "REF-FORM-SMOKE-001-CORREGIDO" })
} | ConvertTo-Json -Depth 8)
Assert-Value $victimsResent.request.versions.Count 2 "Nueva versión de corrección de Víctimas"
$victimsAssigned = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/aprobar-y-repartir" -Method Post -Headers (Auth-Headers $pagVictims)
$expert = Login-Demo "demo-perito-psicologia"
Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/iniciar" -Method Post -Headers (Auth-Headers $expert) | Out-Null
$victimsProblem = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/operaciones/problema" -Method Post -Headers (Auth-Headers $expert) -ContentType "application/json" -Body (@{
  reason = "Soporte ilegible"
  description = "El soporte requiere una referencia legible"
  supportReference = "ANEXO-VIC-SMOKE-001"
} | ConvertTo-Json)
Assert-Value $victimsProblem.request.items[0].status "EN_EJECUCION" "Estado tras reporte de Víctimas"
Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/avance" -Method Post -Headers (Auth-Headers $expert) -ContentType "application/json" -Body (@{ observation = "Actuación registrada" } | ConvertTo-Json) | Out-Null
$victimsClosed = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/finalizar" -Method Post -Headers (Auth-Headers $expert) -ContentType "application/json" -Body (@{ f171Reference = "F171-2026-SMOKE-001" } | ConvertTo-Json)

$victimsNoCandidate = Invoke-RestMethod "$BaseUrl/api/demo/victimas/solicitudes" -Method Post -Headers (Auth-Headers $rjv) -ContentType "application/json" -Body (@{
  externalId = "SMOKE-VIC-SIN-CANDIDATO"
  law = "LEY_1448"
  service = "SVC_VIC_EVALUACION_PSICOLOGICA"
  region = "ANTIOQUIA"
  caseData = @{
    processReference = "Proceso sin candidato"
    hearingApplies = $false
    facts = "Hechos de verificación sin información personal real"
  }
  persons = @(
    @{ alias = "Persona vinculada C"; type = "DIRECTA"; relationship = "Víctima directa"; familyGroup = "Núcleo C"; contact = @{ phone = "3000000003"; email = "persona.c@example.invalid"; preferredChannel = "Correo" } }
  )
  documents = @(@{ type = "FORMATO_SOLICITUD"; reference = "REF-FORM-SMOKE-002" })
} | ConvertTo-Json -Depth 8)
$victimsNoCandidateResult = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsNoCandidate.request.items[0].id)/aprobar-y-repartir" -Method Post -Headers (Auth-Headers $pagVictims)
Assert-Value $victimsNoCandidateResult.request.items[0].status "PENDIENTE_EXCEPCION" "Excepción inicial de Víctimas"

$admin = Login-Demo "demo-admin"
$regionalManager = Login-Demo "demo-gestor-regional-investigacion"
$centralManager = Login-Demo "demo-gestor-central-excepciones"
$regionalDefender = Login-Demo "demo-defensor-regional"
$regionalManagerView = Invoke-RestMethod "$BaseUrl/api/demo/bootstrap" -Headers (Auth-Headers $regionalManager)
$centralManagerView = Invoke-RestMethod "$BaseUrl/api/demo/bootstrap" -Headers (Auth-Headers $centralManager)
$regionalDefenderView = Invoke-RestMethod "$BaseUrl/api/demo/bootstrap" -Headers (Auth-Headers $regionalDefender)
Assert-Forbidden {
  Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/aprobar-entrega" -Method Post -Headers (Auth-Headers $admin)
}
Assert-Forbidden {
  Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/devolver-solicitud" -Method Post -Headers (Auth-Headers $admin) -ContentType "application/json" -Body (@{ observation = "Operación no autorizada" } | ConvertTo-Json)
}
$reset = Invoke-RestMethod "$BaseUrl/api/demo/reset" -Method Post -Headers (Auth-Headers $admin)

[pscustomobject]@{
  Health = $health.ok
  Ready = $ready.status
  Spa = $homeResponse.StatusCode
  SpaInternalRoute = $internalRoute.StatusCode
  InvestigationAssigned = $investigation.request.items[0].status
  DefenderRetryDenied = $true
  InvestigationFinal = $investigationClosed.request.items[0].status
  InvestigationProblemState = $investigationProblem.request.items[0].status
  InvestigationProductVersions = $investigationClosed.request.items[0].products.Count
  VictimsReturned = $victimsReturned.request.items[0].status
  VictimsResent = $victimsResent.request.items[0].status
  VictimsAssigned = $victimsAssigned.request.items[0].status
  VictimsFinal = $victimsClosed.request.items[0].status
  VictimsProblemState = $victimsProblem.request.items[0].status
  VictimsProductVersions = $victimsClosed.request.items[0].products.Count
  VictimsNoCandidate = $victimsNoCandidateResult.request.items[0].status
  AdminOperationalDenied = $true
  RegionalManagerRequests = $regionalManagerView.requests.Count
  CentralExceptionRequests = $centralManagerView.requests.Count
  RegionalDefenderRequests = $regionalDefenderView.requests.Count
  ResetSeedRequests = $reset.requests.Count
} | ConvertTo-Json
