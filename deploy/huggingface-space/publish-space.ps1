param(
  [string]$SpaceId = "shcampinof/reparto-misiones-dndp",
  [string]$Package = ".space-package"
)

$ErrorActionPreference = "Stop"
if ($SpaceId -ne "shcampinof/reparto-misiones-dndp") {
  throw "La publicación solo está permitida en shcampinof/reparto-misiones-dndp."
}
$hfCommand = Get-Command hf -ErrorAction Stop
$pythonFromHf = Join-Path (Split-Path (Split-Path $hfCommand.Source -Parent) -Parent) "python.exe"
$pythonCommand = if (Test-Path -LiteralPath $pythonFromHf) {
  $pythonFromHf
} else {
  (Get-Command python -ErrorAction Stop).Source
}

& $pythonCommand (Join-Path $PSScriptRoot "publish-space.py") --space-id $SpaceId --package $Package
exit $LASTEXITCODE
