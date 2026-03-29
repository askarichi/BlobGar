$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtime = Join-Path $root ".runtime"
$null = New-Item -ItemType Directory -Force -Path $runtime

function Get-ListeningProcessIds($port) {
    $lines = netstat -ano -p tcp | Select-String -Pattern (":{0}\s" -f $port)
    $processIds = @()
    foreach ($line in $lines) {
        $parts = (($line.ToString() -replace "\s+", " ").Trim()) -split " "
        if ($parts.Length -lt 5) {
            continue
        }
        if ($parts[1] -notmatch (":{0}$" -f $port) -and $parts[2] -notmatch (":{0}$" -f $port)) {
            continue
        }
        if ($parts[3] -ne "LISTENING") {
            continue
        }
        $processId = 0
        if ([int]::TryParse($parts[4], [ref]$processId)) {
            $processIds += $processId
        }
    }
    return $processIds | Sort-Object -Unique
}

function Stop-Port($port) {
    foreach ($processId in Get-ListeningProcessIds $port) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
        }
    }
}

function New-LauncherScript($scriptPath, $nodePath, $arguments, $workingDirectory, $stdoutLog, $stderrLog) {
    $quotedArgs = @()
    foreach ($argument in $arguments) {
        $quotedArgs += ("'{0}'" -f (($argument + "") -replace "'", "''"))
    }
    $content = @"
Set-Location -LiteralPath '$($workingDirectory -replace "'", "''")'
& '$($nodePath -replace "'", "''")' $($quotedArgs -join " ") 1>> '$($stdoutLog -replace "'", "''")' 2>> '$($stderrLog -replace "'", "''")'
"@
    Set-Content -Path $scriptPath -Value $content -Encoding UTF8
}

function Start-NodeProcess($launcherScript) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = (Get-Command powershell.exe -ErrorAction Stop).Source
    $psi.Arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcherScript`""
    $psi.UseShellExecute = $true
    $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    [System.Diagnostics.Process]::Start($psi) | Out-Null
}

$nodePath = (Get-Command node -ErrorAction Stop).Source

Stop-Port 15003
Stop-Port 3001

$serverOutLog = Join-Path $runtime "server.out.log"
$serverErrLog = Join-Path $runtime "server.err.log"
$clientOutLog = Join-Path $runtime "client.out.log"
$clientErrLog = Join-Path $runtime "client.err.log"
$serverLauncher = Join-Path $runtime "server.launch.ps1"
$clientLauncher = Join-Path $runtime "client.launch.ps1"

New-LauncherScript -ScriptPath $serverLauncher `
    -NodePath $nodePath `
    -Arguments @("index.js", "--noconsole") `
    -WorkingDirectory (Join-Path $root "server\\src") `
    -StdoutLog $serverOutLog `
    -StderrLog $serverErrLog

Start-NodeProcess -LauncherScript $serverLauncher

Start-Sleep -Milliseconds 800

New-LauncherScript -ScriptPath $clientLauncher `
    -NodePath $nodePath `
    -Arguments @("serve-local.js") `
    -WorkingDirectory (Join-Path $root "client") `
    -StdoutLog $clientOutLog `
    -StderrLog $clientErrLog

Start-NodeProcess -LauncherScript $clientLauncher

Write-Host "NOX repo base started."
Write-Host "Client: http://127.0.0.1:3001/?ip=127.0.0.1:15003"
Write-Host "Logs: $runtime"
