@echo off
cd /d %~dp0

IF EXIST %~dp0\nodejs\node.exe (
	SET "PATH=%PATH%;%~dp0nodejs"
) else (
	IF EXIST %~dp0\..\nodejs\node.exe (
		SET "PATH=%PATH%;%~dp0..\nodejs"
	) else echo NODEJS NOT FOUND ^!^!^!
)

:A
set /P "nc=> "
call %nc%
echo.
goto :A
