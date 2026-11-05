@echo off
setlocal
echo ================================================================
echo Running ZeroTax Key Generator...
echo ================================================================

where node >nul 2>nul
if %errorlevel% equ 0 (
    node scripts\generate-keys.js
    goto done
)

if exist "C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Microsoft\VisualStudio\NodeJs\node.exe" (
    "C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Microsoft\VisualStudio\NodeJs\node.exe" scripts\generate-keys.js
    goto done
)

echo [ERROR] node.exe was not found. Please install Node.js or add it to PATH.

:done
echo.
pause

