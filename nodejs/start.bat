@echo off
cd /d %~dp0

IF EXIST %~dp0\nodejs\node.exe (
	SET "PATH=%PATH%;%~dp0nodejs"
) else (
	IF EXIST %~dp0\..\nodejs\node.exe (
		SET "PATH=%PATH%;%~dp0..\nodejs"
	) else echo NODEJS NOT FOUND ^!^!^!
)

if NOT exist node_modules call :missing
:A
cls
node .
echo.
goto :A

:missing
title Please wait a moment...
echo node_modules folder not found, generating new one.
call npm install
goto :EOF