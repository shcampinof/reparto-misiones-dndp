param(
  [string]$BaseUrl = "http://127.0.0.1:7860"
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd('/')

function Login-Demo([string]$UserId) {
  $response = Invoke-RestMethod "$BaseUrl/api/auth/demo-login" -Method Post -ContentType "application/json" -Body (@{ userId = $UserId } | ConvertTo-Json)
  return $response.accessToken
}

function Auth-Headers([string]$Token) {
  return @{ Authorization = "Bearer $Token" }
}

$health = Invoke-RestMethod "$BaseUrl/api/health"
$ready = Invoke-RestMethod "$BaseUrl/api/ready"
$homeResponse = Invoke-WebRequest "$BaseUrl/" -UseBasicParsing
$internalRoute = Invoke-WebRequest "$BaseUrl/portal" -UseBasicParsing

$defender = Login-Demo "demo-defensor"
$investigation = Invoke-RestMethod "$BaseUrl/api/demo/investigacion/solicitudes" -Method Post -Headers (Auth-Headers $defender) -ContentType "application/json" -Body (@{
  spoa = "110016000049202600077"
  delito = "Delito sintético para smoke test"
  service = "INVESTIGACION_CAMPO"
  region = "BOGOTA"
} | ConvertTo-Json)
$investigationItem = $investigation.request.items[0]
$investigationAssigned = Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/repartir" -Method Post -Headers (Auth-Headers $defender)

$investigator = Login-Demo "demo-investigador"
Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/iniciar" -Method Post -Headers (Auth-Headers $investigator) | Out-Null
Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/avance" -Method Post -Headers (Auth-Headers $investigator) -ContentType "application/json" -Body (@{ progress = 60; observation = "Avance sintético smoke test" } | ConvertTo-Json) | Out-Null
Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/entregar" -Method Post -Headers (Auth-Headers $investigator) -ContentType "application/json" -Body (@{ reference = "INF-DEMO-SMOKE-001" } | ConvertTo-Json) | Out-Null
$pagInvestigation = Login-Demo "demo-pag-investigacion"
$investigationClosed = Invoke-RestMethod "$BaseUrl/api/demo/investigacion/items/$($investigationItem.id)/aprobar-entrega" -Method Post -Headers (Auth-Headers $pagInvestigation)

$rjv = Login-Demo "demo-rjv"
$victims = Invoke-RestMethod "$BaseUrl/api/demo/victimas/solicitudes" -Method Post -Headers (Auth-Headers $rjv) -ContentType "application/json" -Body (@{
  externalId = "RAD-DEMO-2026-077"
  law = "LEY_1448"
  service = "PSICOLOGICO"
  region = "BOGOTA"
  victimCount = 2
} | ConvertTo-Json)
$victimsItem = $victims.request.items[0]
$pagVictims = Login-Demo "demo-pag-victimas"
$victimsAssigned = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/aprobar-y-repartir" -Method Post -Headers (Auth-Headers $pagVictims)
$expert = Login-Demo "demo-perito-psicologia"
Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/iniciar" -Method Post -Headers (Auth-Headers $expert) | Out-Null
Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/avance" -Method Post -Headers (Auth-Headers $expert) -ContentType "application/json" -Body (@{ progress = 75; observation = "Avance sintético smoke test" } | ConvertTo-Json) | Out-Null
$victimsClosed = Invoke-RestMethod "$BaseUrl/api/demo/victimas/items/$($victimsItem.id)/finalizar" -Method Post -Headers (Auth-Headers $expert) -ContentType "application/json" -Body (@{ f171Reference = "F171-DEMO-SMOKE-001" } | ConvertTo-Json)

$admin = Login-Demo "demo-admin"
$reset = Invoke-RestMethod "$BaseUrl/api/demo/reset" -Method Post -Headers (Auth-Headers $admin)

[pscustomobject]@{
  Health = $health.ok
  Ready = $ready.status
  Spa = $homeResponse.StatusCode
  SpaInternalRoute = $internalRoute.StatusCode
  InvestigationAssigned = $investigationAssigned.request.items[0].status
  InvestigationFinal = $investigationClosed.request.items[0].status
  VictimsAssigned = $victimsAssigned.request.items[0].status
  VictimsFinal = $victimsClosed.request.items[0].status
  ResetSeedRequests = $reset.requests.Count
} | ConvertTo-Json
