# ============================================================
# MedAnalytica - Project Structure Creator
# Creates empty folder structure and files
# ============================================================

$ErrorActionPreference = "Stop"
$projectRoot = Get-Location

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  MEDANALYTICA - Project Structure Creator" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Current folder: $projectRoot" -ForegroundColor Gray
Write-Host ""

# ============================================================
# Structure definition
# ============================================================

$structure = @{
    "frontend" = @(
        "src/App.jsx",
        "src/main.jsx",
        "src/index.css",
        "index.html",
        "package.json",
        "vite.config.js"
    )
    "backend" = @(
        "app/__init__.py",
        "app/main.py",
        "app/config.py",
        "app/database.py",
        "app/models.py",
        "app/schemas.py",
        "app/auth.py",
        "app/routers/__init__.py",
        "app/routers/auth.py",
        "app/routers/users.py",
        "app/routers/patients.py",
        "app/routers/indicators.py",
        "app/routers/ml_models.py",
        "app/routers/analyses.py",
        "app/routers/chat.py",
        "requirements.txt",
        ".env",
        "run.py"
    )
    "database" = @(
        "01_schema.sql",
        "02_seed.sql"
    )
    "" = @(
        "docker-compose.yml",
        "README.md"
    )
}

# ============================================================
# Create folders and empty files
# ============================================================

$totalFiles = 0
$totalFolders = 0

Write-Host "[1/2] Creating folders and files..." -ForegroundColor Yellow
Write-Host ""

foreach ($folder in $structure.Keys) {
    $folderPath = if ($folder) { Join-Path $projectRoot $folder } else { $projectRoot }
    
    if (!(Test-Path $folderPath)) {
        New-Item -ItemType Directory -Force -Path $folderPath | Out-Null
        $totalFolders++
    }
    
    foreach ($file in $structure[$folder]) {
        $filePath = Join-Path $folderPath $file
        $fileDir = Split-Path $filePath -Parent
        if (!(Test-Path $fileDir)) {
            New-Item -ItemType Directory -Force -Path $fileDir | Out-Null
            $totalFolders++
        }
        if (!(Test-Path $filePath)) {
            New-Item -ItemType File -Force -Path $filePath | Out-Null
            $totalFiles++
            $relPath = $filePath.Replace($projectRoot, "").TrimStart("\").TrimStart("/")
            Write-Host "  [+] $relPath" -ForegroundColor Green
        } else {
            $relPath = $filePath.Replace($projectRoot, "").TrimStart("\").TrimStart("/")
            Write-Host "  [=] $relPath (already exists)" -ForegroundColor DarkGray
        }
    }
}

# ============================================================
# Visualize tree
# ============================================================

Write-Host ""
Write-Host "[2/2] Project tree:" -ForegroundColor Yellow
Write-Host ""

function Show-Tree {
    param([string]$path, [string]$prefix = "", [int]$depth = 0)
    
    if ($depth -gt 3) { return }
    
    $items = Get-ChildItem -Path $path -Force | Sort-Object @{Expression={$_.PSIsContainer}; Descending=$true}, Name
    
    for ($i = 0; $i -lt $items.Count; $i++) {
        $item = $items[$i]
        $isLast = ($i -eq $items.Count - 1)
        $connector = if ($isLast) { "+-- " } else { "|-- " }
        $childPrefix = if ($isLast) { "    " } else { "|   " }
        
        if ($item.PSIsContainer) {
            Write-Host "$prefix$connector" -NoNewline -ForegroundColor DarkGray
            Write-Host $item.Name -ForegroundColor Yellow
            Show-Tree -path $item.FullName -prefix ($prefix + $childPrefix) -depth ($depth + 1)
        } else {
            Write-Host "$prefix$connector" -NoNewline -ForegroundColor DarkGray
            Write-Host $item.Name -ForegroundColor White
        }
    }
}

$rootName = Split-Path $projectRoot -Leaf
Write-Host "$rootName/" -ForegroundColor Magenta
Show-Tree -path $projectRoot

# ============================================================
# Summary
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  DONE! Structure created successfully" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Folder path: $projectRoot" -ForegroundColor Cyan
Write-Host "  Folders:     $totalFolders" -ForegroundColor Cyan
Write-Host "  Files:       $totalFiles" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open this folder in VS Code" -ForegroundColor White
Write-Host "  2. Fill the files with your code" -ForegroundColor White
Write-Host "  3. Run PostgreSQL (docker-compose up -d)" -ForegroundColor White
Write-Host "  4. Start: .\start.bat" -ForegroundColor White
Write-Host ""

$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")