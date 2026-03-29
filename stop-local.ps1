$ErrorActionPreference = "SilentlyContinue"

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

foreach ($port in 15003, 3001) {
    foreach ($processId in Get-ListeningProcessIds $port) {
        Stop-Process -Id $processId -Force
    }
}

Write-Host "NOX repo base ports stopped."
