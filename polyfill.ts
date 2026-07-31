// Global Polyfills for React Native and Web environment safety

if (typeof globalThis !== 'undefined') {
  if (typeof (globalThis as any).global === 'undefined') {
    (globalThis as any).global = globalThis;
  }
}

// In-memory polyfill for localStorage in Native Android/iOS environments
if (typeof globalThis.localStorage === 'undefined') {
  const memoryStore = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStore.get(String(key)) ?? null,
    setItem: (key: string, value: string) => { memoryStore.set(String(key), String(value)); },
    removeItem: (key: string) => { memoryStore.delete(String(key)); },
    clear: () => { memoryStore.clear(); },
    key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
    get length() { return memoryStore.size; }
  };
}

// Define global and __DEV__ for React Native Web and other node-style dependencies
if (typeof window !== 'undefined') {
  (window as any).__DEV__ = false;
  if (typeof (window as any).global === 'undefined') {
    (window as any).global = window;
  }

  // Gracefully handle and wrap window.alert and window.confirm to avoid DOMExceptions in sandboxed iframes
  const originalAlert = window.alert;
  window.alert = function (message) {
    console.log('[Safe Polyfill Alert]:', message);
    try {
      if (originalAlert) {
        originalAlert.call(window, message);
      }
    } catch (e) {
      console.warn('[Safe Polyfill Alert] alert blocked or failed (possibly iframe sandbox):', e);
    }
  };

  const originalConfirm = window.confirm;
  window.confirm = function (message) {
    console.log('[Safe Polyfill Confirm]:', message);
    try {
      if (originalConfirm) {
        return originalConfirm.call(window, message);
      }
    } catch (e) {
      console.warn('[Safe Polyfill Confirm] confirm blocked or failed (possibly iframe sandbox):', e);
    }
    return true; // default to true so actions proceed if blocked
  };

  // Gracefully handle and suppress specific unhandled touch responder and circular JSON issues in web
  if (window.addEventListener) {
    window.addEventListener('error', (event) => {
      const msg = event.message || '';
      if (msg.includes('Cannot find single active touch') || msg.includes('Converting circular structure to JSON')) {
        event.preventDefault();
        console.warn('[Ignored Exception]:', msg);
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reasonStr = String(event.reason || '');
      if (reasonStr.includes('Cannot find single active touch') || reasonStr.includes('Converting circular structure to JSON')) {
        event.preventDefault();
        console.warn('[Ignored Rejection]:', reasonStr);
      }
    });
  }

  // Circular-safe JSON stringify helper
  function safeJsonStringify(obj: any): string {
    try {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      });
    } catch (e) {
      return String(obj);
    }
  }

  // Deeply intercept console.error to silence annoying and benign touch/responder exceptions
  const originalConsoleError = console.error;
  console.error = function (...args) {
    const errorString = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return safeJsonStringify(arg);
      }
      return String(arg);
    }).join(' ');

    if (errorString.includes('Cannot find single active touch') || errorString.includes('Converting circular structure to JSON')) {
      // Gracefully silence
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Intercept window.onerror as well
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = String(message || '');
    const errStr = error ? String(error.message || error) : '';
    if (msg.includes('Cannot find single active touch') || errStr.includes('Cannot find single active touch') ||
        msg.includes('Converting circular structure to JSON') || errStr.includes('Converting circular structure to JSON')) {
      console.warn('[Ignored window.onerror exception]:', msg, errStr);
      return true; // prevent default handling
    }
    if (originalOnError) {
      return originalOnError.apply(this, arguments as any);
    }
  };
}

