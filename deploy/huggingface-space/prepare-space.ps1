param(
  [string]$Destination = ".space-package"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$target = if ([System.IO.Path]::IsPathRooted($Destination)) {
  [System.IO.Path]::GetFullPath($Destination)
} else {
  [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $Destination))
}
$allowedPrefix = $repositoryRoot.TrimEnd('\') + '\'

if (-not $target.StartsWith($allowedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "El paquete debe generarse dentro del repositorio de trabajo."
}

if (Test-Path -LiteralPath $target) {
  Remove-Item -LiteralPath $target -Recurse -Force
}

New-Item -ItemType Directory -Path $target | Out-Null
New-Item -ItemType Directory -Path (Join-Path $target "backend") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $target "frontend") | Out-Null

Copy-Item -LiteralPath (Join-Path $repositoryRoot "Dockerfile") -Destination $target
Copy-Item -LiteralPath (Join-Path $repositoryRoot ".dockerignore") -Destination $target
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "README.md") -Destination (Join-Path $target "README.md")

Copy-Item -LiteralPath (Join-Path $repositoryRoot "backend\package.json") -Destination (Join-Path $target "backend")
Copy-Item -LiteralPath (Join-Path $repositoryRoot "backend\package-lock.json") -Destination (Join-Path $target "backend")
Copy-Item -LiteralPath (Join-Path $repositoryRoot "backend\src") -Destination (Join-Path $target "backend") -Recurse

Copy-Item -LiteralPath (Join-Path $repositoryRoot "frontend\package.json") -Destination (Join-Path $target "frontend")
Copy-Item -LiteralPath (Join-Path $repositoryRoot "frontend\package-lock.json") -Destination (Join-Path $target "frontend")
Copy-Item -LiteralPath (Join-Path $repositoryRoot "frontend\index.html") -Destination (Join-Path $target "frontend")
Copy-Item -LiteralPath (Join-Path $repositoryRoot "frontend\vite.config.js") -Destination (Join-Path $target "frontend")
Copy-Item -LiteralPath (Join-Path $repositoryRoot "frontend\src") -Destination (Join-Path $target "frontend") -Recurse

$publishedFiles = Get-ChildItem -LiteralPath $target -Recurse -File | ForEach-Object {
  $_.FullName.Substring($target.Length + 1).Replace('\', '/')
}

if ($publishedFiles | Where-Object { $_ -match '(^|/)(docs|\.git|node_modules)(/|$)|\.(zip|mp4|mov|webm|pdf)$' }) {
  throw "El paquete contiene un archivo o directorio no permitido."
}

Write-Output "Paquete saneado preparado: $target"
Write-Output "Archivos incluidos: $($publishedFiles.Count)"
