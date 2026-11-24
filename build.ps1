# 배포 패키지 만들기: 서비스에 필요한 파일만 dist/로 복사한다.
# 실행: powershell -ExecutionPolicy Bypass -File build.ps1
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$dist = Join-Path $root "dist"

if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Force (Join-Path $dist "js") | Out-Null

foreach ($f in "index.html", "admin.html", "styles.css") { Copy-Item (Join-Path $root $f) $dist }
Copy-Item (Join-Path $root "js\*.js") (Join-Path $dist "js")

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
Set-Content -Encoding utf8 (Join-Path $dist "BUILD.txt") "emotionbook build $stamp"
Get-ChildItem -Recurse $dist | Where-Object { -not $_.PSIsContainer } | ForEach-Object { $_.FullName.Substring($dist.Length + 1) }
