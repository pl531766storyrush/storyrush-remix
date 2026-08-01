import { registerRootComponent } from 'expo';
import App from './App';

// Global Unhandled JS Exception Logger for Android Release / Native
if (typeof global !== 'undefined') {
  if (global.ErrorUtils) {
    const defaultHandler = global.ErrorUtils.getGlobalHandler();
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.error('[STORY RUSH NATIVE ERROR]:', error, 'isFatal:', isFatal);
      if (defaultHandler) {
        try {
          defaultHandler(error, isFatal);
        } catch (e) {
          console.error('[ErrorUtils defaultHandler error]:', e);
        }
      }
    });
  }
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[STORY RUSH UNHANDLED REJECTION]:', event.reason);
  });
}

registerRootComponent(App);

