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

$health = Invoke-RestMethod "$BaseUrl/api/health" -Headers (Gateway-Headers)
$ready = Invoke-RestMethod "$BaseUrl/api/ready" -Headers (Gateway-Headers)
$homeResponse = Invoke-WebRequest "$BaseUrl/" -Headers (Gateway-Headers) -UseBasicParsing
$internalRoute = Invoke-WebRequest "$BaseUrl/portal" -Headers (Gateway-Headers) -UseBasicParsing

$defender = Login-Demo "demo-defensor"
$investigation = Invoke-RestMethod "$BaseUrl/api/demo/investigacion/solicitudes" -Method Post -Headers (Auth-Headers $defender) -ContentType "application/json" -Body (@{
  spoa = "110016000049202600077"
  delito = "Investigación de hechos asociados al caso"
  service = "SVC_INV_VERIFICACION_TERRENO"
  region = "BOGOTA"
} | ConvertTo-Json)
$investigationItem = $investigation.request.items[0]
$investigationAssigned = Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/repartir" -Method Post -Headers (Auth-Headers $defender)

$investigator = Login-Demo "demo-investigador"
Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/iniciar" -Method Post -Headers (Auth-Headers $investigator) | Out-Null
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
  victimCount = 2
} | ConvertTo-Json)
$victimsItem = $victims.request.items[0]
$pagVictims = Login-Demo "demo-pag-victimas"
$victimsReturned = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/devolver-solicitud" -Method Post -Headers (Auth-Headers $pagVictims) -ContentType "application/json" -Body (@{
  observation = "Completar soporte del grupo familiar"
} | ConvertTo-Json)
$victimsResent = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/corregir-reenviar" -Method Post -Headers (Auth-Headers $rjv) -ContentType "application/json" -Body (@{
  correctionSummary = "Soporte incorporado"
} | ConvertTo-Json)
$victimsAssigned = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/aprobar-y-repartir" -Method Post -Headers (Auth-Headers $pagVictims)
$expert = Login-Demo "demo-perito-psicologia"
Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/iniciar" -Method Post -Headers (Auth-Headers $expert) | Out-Null
Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/avance" -Method Post -Headers (Auth-Headers $expert) -ContentType "application/json" -Body (@{ observation = "Actuación registrada" } | ConvertTo-Json) | Out-Null
$victimsClosed = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/finalizar" -Method Post -Headers (Auth-Headers $expert) -ContentType "application/json" -Body (@{ f171Reference = "F171-2026-SMOKE-001" } | ConvertTo-Json)

$admin = Login-Demo "demo-admin"
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
  InvestigationAssigned = $investigationAssigned.request.items[0].status
  InvestigationFinal = $investigationClosed.request.items[0].status
  VictimsReturned = $victimsReturned.request.items[0].status
  VictimsResent = $victimsResent.request.items[0].status
  VictimsAssigned = $victimsAssigned.request.items[0].status
  VictimsFinal = $victimsClosed.request.items[0].status
  AdminOperationalDenied = $true
  ResetSeedRequests = $reset.requests.Count
} | ConvertTo-Json
