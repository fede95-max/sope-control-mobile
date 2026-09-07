$ErrorActionPreference = "Stop"

$source = $PSScriptRoot + "\.."
$target = "C:\dev\sope-control-mobile"

Write-Host "Sincronizando proyecto a $target ..."
robocopy $source $target /E /XD android\.cxx android\app\.cxx android\build android\.gradle .git /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

Set-Location $target
npm install

$localProps = @"
sdk.dir=C\:\\Users\\Federico Huenteman\\AppData\\Local\\Android\\Sdk
ndk.dir=C\:\\ndk\\27.1.12297006
"@
Set-Content -Path "$target\android\local.properties" -Value $localProps -Encoding ASCII

Write-Host "Compilando e instalando (arm64) ..."
npx expo run:android -- -PreactNativeArchitectures=arm64-v8a
