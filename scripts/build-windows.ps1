$ErrorActionPreference = "Stop"
$project = Resolve-Path "../apps/windows/Noname/Noname.csproj"
$publishDir = Resolve-Path "../artifacts/windows" -ErrorAction SilentlyContinue
if (-not $publishDir) {
  $publishDir = New-Item -ItemType Directory -Path "../artifacts/windows"
}

dotnet publish $project -c Release -r win-x64 \
  /p:PublishSingleFile=true \
  /p:SelfContained=true \
  /p:IncludeNativeLibrariesForSelfExtract=true \
  -o $publishDir

Write-Host "Published to $publishDir"
