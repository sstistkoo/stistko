# CrewAI Server Launcher (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CrewAI Server Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting CrewAI API server on http://localhost:5005" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Přejdi do složky projektu
Set-Location $PSScriptRoot

# Spusť server
python python/crewai_api.py
