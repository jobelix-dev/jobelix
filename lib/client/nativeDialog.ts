import { restoreFocusAfterDialog } from './focusRestore';

export function confirmWithFocusRestore(message: string) {
  const result = window.confirm(message);
  restoreFocusAfterDialog();
  return result;
}

export function alertWithFocusRestore(message: string) {
  window.alert(message);
  restoreFocusAfterDialog();
}
