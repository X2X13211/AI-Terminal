@echo off
chcp 65001 >nul
title AI Terminal

echo.
echo ════════════════════════════════════════
echo            AI TERMINAL LAUNCHER
echo ════════════════════════════════════════
echo.
echo    Create desktop shortcut for easy access?
echo.
set /p CREATE_SHORTCUT="    [y] Yes, create shortcut  |  [n] No, just start: "

if /i "%CREATE_SHORTCUT%"=="y" goto CreateShortcut
if /i "%CREATE_SHORTCUT%"=="yes" goto CreateShortcut
goto StartApp

:CreateShortcut
echo @echo off > launch.bat
echo node terminal.js >> launch.bat

echo Set s=CreateObject("WScript.Shell"):Set f=s.CreateShortcut(s.SpecialFolders("Desktop")^&"\AI Terminal.lnk") > %temp%\s.vbs
echo f.TargetPath="%~dp0launch.bat" >> %temp%\s.vbs
echo f.WorkingDirectory="%~dp0" >> %temp%\s.vbs
echo f.IconLocation="%%SystemRoot%%\System32\SHELL32.dll,1" >> %temp%\s.vbs
echo f.Save >> %temp%\s.vbs
cscript //nologo %temp%\s.vbs >nul
del %temp%\s.vbs

echo.
echo Shortcut created on Desktop!
echo.

:StartApp
echo Starting AI Terminal...
echo ════════════════════════════════════════
echo.
node terminal.js