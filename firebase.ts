/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Existing Dramax Firebase Project Configuration
const explicitConfig = {
  projectId: "dramax-1fb42",
  appId: "1:586296251513:web:081aec3f4d09b1baeb0a8",
  apiKey: "AIzaSyAVNAHypavbh909CG4wPUefGgSFGkyp5yQ",
  authDomain: "dramax-1fb42.firebaseapp.com",
  storageBucket: "dramax-1fb42.firebasestorage.app",
  messagingSenderId: "586296251513"
};

const app = getApps().length > 0 ? getApp() : initializeApp(explicitConfig);

// Initialize Firebase Auth & Firestore with defensive fallbacks for Native platforms
let authInstance: any;
try {
  authInstance = getAuth(app);
} catch (e) {
  try {
    authInstance = initializeAuth(app, {
      persistence: inMemoryPersistence
    });
  } catch (err) {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;

// Use the existing live database ID for the real dramax-1fb42 project
export const db = getFirestore(app, "ai-studio-storyrushapp-82c2c98a-8e57-4d4c-893c-62d4a8b52c16");


export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Handles Firestore exceptions and formats them into a strict diagnostic JSON string.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId || null,
        email: provider.email || null,
      })) || []
    },
    operationType,
    path
  };

  // Safe circular-resistant stringify helper
  const safeStringify = (obj: any, indent?: number) => {
    try {
      const cache = new Set();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[Circular]';
          }
          cache.add(value);
          if (typeof window !== 'undefined' && (value instanceof Node || value instanceof Event)) {
            return String(value);
          }
        }
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      }, indent);
    } catch (e) {
      return String(errorMessage);
    }
  };

  const logStr = safeStringify(errInfo, 2);
  console.error('Firestore Error Diagnostics: ', logStr);
  throw new Error(logStr);
}
