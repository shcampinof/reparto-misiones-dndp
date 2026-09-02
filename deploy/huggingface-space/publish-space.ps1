param(
  [string]$SpaceId = "shcampinof/paloma-bot",
  [string]$Package = ".space-package"
)

$ErrorActionPreference = "Stop"
$hfCommand = Get-Command hf -ErrorAction Stop
$pythonFromHf = Join-Path (Split-Path (Split-Path $hfCommand.Source -Parent) -Parent) "python.exe"
$pythonCommand = if (Test-Path -LiteralPath $pythonFromHf) {
  $pythonFromHf
} else {
  (Get-Command python -ErrorAction Stop).Source
}

& $pythonCommand (Join-Path $PSScriptRoot "publish-space.py") --space-id $SpaceId --package $Package
exit $LASTEXITCODE
