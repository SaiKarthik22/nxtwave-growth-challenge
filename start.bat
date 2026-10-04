@echo off
REM Double-click to run BuildAI-60 on Windows.
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  echo Starting local server on http://localhost:3000 ...
  start "" http://localhost:3000
  node server.js
) else (
  echo Node.js not found - opening index.html directly in your browser.
  start "" "%~dp0index.html"
)
