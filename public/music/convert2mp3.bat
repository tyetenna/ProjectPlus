@echo off
setlocal enabledelayedexpansion

for %%f in (*.m4a) do (
    set "filename=%%~nf"
    ffmpeg -i "%%f" "!filename!.mp3"
)
del "%%f"
echo Conversion complete.
pause