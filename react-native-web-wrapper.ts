// Wrapper around react-native-web to provide missing Native exports during web builds
import { Alert as RNWAlert } from 'react-native-web';
export * from 'react-native-web';

export const Alert = {
  ...RNWAlert,
  alert: (title: string, message?: string, buttons?: any[], options?: any) => {
    console.log(`[SafeAlert] alert requested: "${title}" - "${message || ''}"`);
    try {
      RNWAlert.alert(title, message, buttons, options);
    } catch (e) {
      console.warn("[SafeAlert] Native Alert.alert blocked/failed (possibly due to iframe sandbox):", e);
      // Automatically execute confirmation/action buttons so user operations can proceed
      if (buttons && buttons.length > 0) {
        const actionButton = buttons.find(b => b.style === 'destructive' || b.text === 'OK' || b.text === 'Delete' || b.text === 'Yes') || buttons[buttons.length - 1];
        if (actionButton && typeof actionButton.onPress === 'function') {
          console.log(`[SafeAlert] Automatically executing button action: "${actionButton.text}"`);
          try {
            actionButton.onPress();
          } catch (err) {
            console.error("[SafeAlert] Error executing button action:", err);
          }
        }
      }
    }
  }
};

export const TurboModuleRegistry = {
  get: (name: string) => null,
  getEnforcing: (name: string) => {
    return null;
  },
};
