; Custom NSIS installer script for Jobelix
; Handles proper shortcut management during install and updates

; ============================================================================
; Install Mode
; ============================================================================
!macro customInstallMode
  ; Use default install mode behavior
!macroend

; ============================================================================
; Run After Install
; ============================================================================
; This runs after installation completes when user clicks "Finish" with "Run app" checked
; Uses "Exec" instead of "ExecWait" so installer doesn't wait for app to exit
!macro customRunAfterInstall
  Exec '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
!macroend

; ============================================================================
; Pre-Installation Cleanup (fixes shortcut issues during updates)
; ============================================================================
; This macro runs BEFORE files are installed
; It removes old shortcuts to prevent "shortcut broken" errors after update
!macro customInit
  ; Check if this is an update (app already installed)
  IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 skip_cleanup
    
    DetailPrint "Detected existing installation - cleaning up for update"
    
    ; Try to close running app gracefully
    ; The updater should have already quit the app, but double-check
    nsExec::ExecToLog 'taskkill /IM "${APP_EXECUTABLE_FILENAME}" /F'
    Pop $0
    ${If} $0 == 0
      DetailPrint "Closed running application"
      Sleep 1000
    ${EndIf}
    
    ; Remove old Start Menu shortcut if it exists
    SetShellVarContext current
    Delete "$SMPROGRAMS\${PRODUCT_NAME}.lnk"
    
    ; Also try all users location (for per-machine installs)
    SetShellVarContext all
    Delete "$SMPROGRAMS\${PRODUCT_NAME}.lnk"
    
    ; Remove old Desktop shortcut if it exists
    SetShellVarContext current
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
    
    SetShellVarContext all
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
    
    ; Reset to current user context
    SetShellVarContext current
    
  skip_cleanup:
!macroend

; ============================================================================
; Post-Installation (recreate shortcuts with correct paths)
; ============================================================================
; This macro runs AFTER files are installed
; Ensures shortcuts are created with the correct paths
!macro customInstall
  ; Create Start Menu shortcut
  SetShellVarContext current
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  
  ; Note: Desktop shortcut is handled by electron-builder's nsis.createDesktopShortcut option
  ; We only need to ensure Start Menu shortcut exists since that's often where issues occur
!macroend

; ============================================================================
; Uninstall Cleanup
; ============================================================================
!macro customUnInstall
  ; Clean up shortcuts on uninstall
  SetShellVarContext current
  Delete "$SMPROGRAMS\${PRODUCT_NAME}.lnk"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  
  SetShellVarContext all
  Delete "$SMPROGRAMS\${PRODUCT_NAME}.lnk"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  
  SetShellVarContext current
!macroend
