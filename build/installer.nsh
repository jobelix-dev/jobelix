; Custom NSIS installer script for Jobelix
; Handles proper shortcut management during install and updates

; ============================================================================
; Install Mode
; ============================================================================
!macro customInstallMode
  ; Use default install mode behavior
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
    
    ; NOTE: We intentionally do NOT delete shortcuts during updates.
    ; The customInstall macro will recreate/overwrite them with correct paths.
    ; Deleting shortcuts during silent updates (from auto-updater) caused them
    ; to disappear permanently because the MUI Finish page doesn't run in silent mode.
    
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
  
  ; Clean up updater temp files only
  RMDir /r "$LOCALAPPDATA\jobelix-updater"
  
  ; Note: User data in $APPDATA\jobelix (configs, resumes, profiles) is intentionally
  ; preserved on uninstall. This matches deleteAppDataOnUninstall: false in package.json
  ; and allows users to reinstall without losing their data.
  
  ; Note: Temp files in $TEMP are automatically cleaned by Windows periodically
  ; We don't remove them explicitly to avoid interfering with any running processes
!macroend
