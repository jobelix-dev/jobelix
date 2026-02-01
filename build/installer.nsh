; Custom NSIS installer script for Jobelix
; Fixes the issue where installer hangs when launching the app on finish

; Override the default "run after finish" behavior to launch asynchronously
!macro customInstallMode
  ; Use default install mode behavior
!macroend

; This runs after installation completes when user clicks "Finish" with "Run app" checked
; The key is using "Exec" instead of "ExecWait" so installer doesn't wait for app to exit
!macro customRunAfterInstall
  ; Launch the app asynchronously so installer closes immediately
  ; The "/D=" sets working directory, "$INSTDIR" is the installation directory
  Exec '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
!macroend
