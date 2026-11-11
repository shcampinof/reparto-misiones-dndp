param(
  [ValidateSet('start', 'status', 'restart', 'stop', 'logs', 'save', 'resurrect')]
  [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$env:PM2_HOME = Join-Path $projectRoot 'tmp/pm2-sigip'
$pm2Cli = Join-Path $PSScriptRoot 'node_modules/pm2/bin/pm2'
if (-not (Test-Path -LiteralPath $pm2Cli)) {
  throw 'Instale PM2 primero: npm.cmd --prefix deploy/local ci'
}

switch ($Action) {
  'start' {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'frontend/dist/index.html'))) {
      throw 'Compile la interfaz primero: npm.cmd --prefix frontend run build'
    }
    & node $pm2Cli startOrRestart (Join-Path $PSScriptRoot 'ecosystem.config.cjs') --only sigip-dp --update-env
  }
  'status' { & node $pm2Cli list }
  'restart' { & node $pm2Cli restart sigip-dp }
  'stop' { & node $pm2Cli stop sigip-dp }
  'logs' { & node $pm2Cli logs sigip-dp --lines 50 --nostream }
  'save' { & node $pm2Cli save }
  'resurrect' { & node $pm2Cli resurrect }
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
