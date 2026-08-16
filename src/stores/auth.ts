import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import { api, setAuthToken } from '../shared/api/client';
import type { UserDto } from '../shared/api/types';

// ─────────────────────────────────────────────────────────────────────────────
// Auth Store
// Strategy:
//   - Firebase handles its own persistence (IndexedDB).
//   - On page load, onAuthStateChanged restores the Firebase user silently
//     → we call getIdToken() → POST /auth/session → get BFF session token.
//   - BFF session token lives ONLY in-memory (Pinia reactive ref).
//     No localStorage, no sessionStorage — zero XSS surface.
//   - On 401 from API client, auth store clears token + router redirects to /login.
// ─────────────────────────────────────────────────────────────────────────────

export const useAuthStore = defineStore('auth', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  /** BFF session token — in-memory only, never written to any storage */
  const token = ref<string | null>(null);
  const user = ref<UserDto | null>(null);
  const firebaseUser = ref<FirebaseUser | null>(null);
  const loading = ref(false);
  /** True once onAuthStateChanged has resolved (first call) */
  const authReady = ref(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const isAdmin = ref(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  /**
   * Exchange a Firebase ID token for a BFF session token.
   * Sets the in-memory token and attaches it to the API client.
   */
  async function exchangeForSessionToken(idToken: string): Promise<UserDto> {
    const res = await api.post<{ token: string; user: UserDto }>('/auth/session', { idToken });
    token.value = res.token;
    user.value = res.user;
    setAuthToken(res.token);
    return res.user;
  }

  function clearSession() {
    token.value = null;
    user.value = null;
    firebaseUser.value = null;
    isAdmin.value = false;
    setAuthToken(null);
  }

  // ── onAuthStateChanged listener ────────────────────────────────────────────
  /**
   * Called once from main.ts before app mounts.
   * Returns a Promise that resolves after the first auth state check.
   * This enables router guard to wait for auth readiness.
   */
  function initAuthListener(): Promise<void> {
    return new Promise((resolve) => {
      const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
      if (useMocks) {
        // In mock mode: inject the mock user and resolve immediately
        const mockUser: UserDto = {
          id: 'usr-dev-101',
          email: 'alex.sidwell@example.com',
          displayName: 'Alex Sidwell (Dev)',
        };
        token.value = 'mock-jwt-token-dev';
        user.value = mockUser;
        setAuthToken('mock-jwt-token-dev');
        authReady.value = true;
        resolve();
        return;
      }

      // Real mode: listen to Firebase auth state
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
        if (fbUser) {
          firebaseUser.value = fbUser;
          try {
            const idToken = await fbUser.getIdToken();
            await exchangeForSessionToken(idToken);
          } catch {
            // BFF unreachable or session exchange failed — treat as unauthenticated
            clearSession();
          }
        } else {
          clearSession();
        }
        authReady.value = true;
        unsubscribe(); // Only listen once for the initial check
        resolve();

        // After initial check, keep listening for token refresh / sign-out
        onAuthStateChanged(firebaseAuth, async (fbUser) => {
          if (fbUser) {
            firebaseUser.value = fbUser;
            if (!token.value) {
              // Token was lost (e.g. 401 cleared it) — re-exchange silently
              try {
                const idToken = await fbUser.getIdToken(/* forceRefresh */ true);
                await exchangeForSessionToken(idToken);
              } catch {
                clearSession();
              }
            }
          } else {
            clearSession();
          }
        });
      });
    });
  }

  // ── Public actions ─────────────────────────────────────────────────────────
  async function loginWithGoogle(): Promise<UserDto> {
    loading.value = true;
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(firebaseAuth, provider);
      const idToken = await cred.user.getIdToken();
      return await exchangeForSessionToken(idToken);
    } finally {
      loading.value = false;
    }
  }

  /**
   * WebAuthn Passkey — Faza 4 (scaffold now, activates when backend ships).
   * Uses real navigator.credentials API; endpoints are skeleton on BE side.
   */
  async function loginWithPasskey(): Promise<UserDto> {
    loading.value = true;
    try {
      let options: PublicKeyCredentialRequestOptionsJSON;
      try {
        options = await api.get<PublicKeyCredentialRequestOptionsJSON>(
          '/auth/passkey/login/options'
        );
      } catch (err: any) {
        if (err.status === 501 || err.code === 'HTTP_501' || err.message?.includes('not implemented')) {
          throw new Error('Passkey login is not implemented on the server yet.');
        }
        throw err;
      }
      const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
      if (useMocks || typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials?.get) {
        const res = await api.post<{ token: string; user: UserDto }>('/auth/passkey/login', {
          credential: { id: 'mock-passkey-id', type: 'public-key' },
        });
        token.value = res.token;
        user.value = res.user;
        setAuthToken(res.token);
        return res.user;
      }
      try {
        const credential = await navigator.credentials.get({
          publicKey: parseRequestOptions(options),
        });
        if (!credential) throw new Error('Passkey authentication cancelled');
        const res = await api.post<{ token: string; user: UserDto }>('/auth/passkey/login', {
          credential: serializeCredential(credential as PublicKeyCredential),
        });
        token.value = res.token;
        user.value = res.user;
        setAuthToken(res.token);
        return res.user;
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.message?.includes('cancelled') || err.message?.includes('canceled')) {
          throw new Error('Passkey authentication was cancelled.');
        }
        throw err;
      }
    } finally {
      loading.value = false;
    }
  }

  async function registerPasskey(): Promise<boolean> {
    if (!isAuthenticated.value && !firebaseUser.value) {
      throw new Error('Must be signed in to register a passkey');
    }
    loading.value = true;
    try {
      let options: PublicKeyCredentialCreationOptionsJSON;
      try {
        options = await api.get<PublicKeyCredentialCreationOptionsJSON>(
          '/auth/passkey/register/options'
        );
      } catch (err: any) {
        if (err.status === 501 || err.code === 'HTTP_501' || err.message?.includes('not implemented')) {
          throw new Error('Passkey registration is not implemented on the server yet.');
        }
        throw err;
      }
      const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
      if (useMocks || typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials?.create) {
        const result = await api.post<{ ok: boolean }>('/auth/passkey/register', {
          credential: {
            id: 'mock-passkey-id',
            type: 'public-key',
            rawId: 'bW9jay1yYXctaWQ',
            response: {
              clientDataJSON: 'bW9jay1jbGllbnQtZGF0YQ',
              attestationObject: 'bW9jay1hdHRlc3RhdGlvbg',
            },
          },
        });
        return result.ok;
      }
      try {
        const credential = await navigator.credentials.create({
          publicKey: parseCreationOptions(options),
        });
        if (!credential) return false;
        const result = await api.post<{ ok: boolean }>('/auth/passkey/register', {
          credential: serializeCredential(credential as PublicKeyCredential),
        });
        return result.ok;
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.message?.includes('cancelled') || err.message?.includes('canceled')) {
          return false;
        }
        throw err;
      }
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    loading.value = true;
    try {
      await api.post('/auth/logout').catch(() => {}); // best effort
      await signOut(firebaseAuth);
    } finally {
      clearSession();
      loading.value = false;
    }
  }

  /**
   * Called by API client on 401 to clear in-memory session.
   * Router guard will pick up isAuthenticated=false and redirect to /login.
   */
  function onUnauthorized(): void {
    token.value = null;
    user.value = null;
    setAuthToken(null);
    // Let onAuthStateChanged handle Firebase state; it may re-exchange silently.
  }

  return {
    token,
    user,
    firebaseUser,
    loading,
    authReady,
    isAuthenticated,
    isAdmin,
    initAuthListener,
    loginWithGoogle,
    loginWithPasskey,
    registerPasskey,
    logout,
    onUnauthorized,
    exchangeForSessionToken,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// WebAuthn helpers — thin wrappers around the browser API
// ─────────────────────────────────────────────────────────────────────────────

interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: { id: string; type: string; transports?: string[] }[];
  userVerification?: string;
}

interface PublicKeyCredentialCreationOptionsJSON {
  challenge: string;
  rp: { name: string; id?: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: string; alg: number }[];
  timeout?: number;
  excludeCredentials?: { id: string; type: string }[];
  authenticatorSelection?: Record<string, unknown>;
  attestation?: string;
}

function base64UrlDecode(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function parseRequestOptions(opts: PublicKeyCredentialRequestOptionsJSON): PublicKeyCredentialRequestOptions {
  const result: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlDecode(opts.challenge),
  };
  if (opts.timeout !== undefined) result.timeout = opts.timeout;
  if (opts.rpId !== undefined) result.rpId = opts.rpId;
  if (opts.userVerification !== undefined) result.userVerification = opts.userVerification as UserVerificationRequirement;
  if (opts.allowCredentials) {
    result.allowCredentials = opts.allowCredentials.map((c) => ({
      id: base64UrlDecode(c.id),
      type: 'public-key' as PublicKeyCredentialType,
    }));
  }
  return result;
}

function parseCreationOptions(opts: PublicKeyCredentialCreationOptionsJSON): PublicKeyCredentialCreationOptions {
  const result: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlDecode(opts.challenge),
    rp: opts.rp,
    user: {
      id: base64UrlDecode(opts.user.id),
      name: opts.user.name,
      displayName: opts.user.displayName,
    },
    pubKeyCredParams: opts.pubKeyCredParams.map((p) => ({
      type: 'public-key' as PublicKeyCredentialType,
      alg: p.alg,
    })),
  };
  if (opts.timeout !== undefined) result.timeout = opts.timeout;
  if (opts.attestation !== undefined) result.attestation = opts.attestation as AttestationConveyancePreference;
  if (opts.authenticatorSelection !== undefined) result.authenticatorSelection = opts.authenticatorSelection as AuthenticatorSelectionCriteria;
  if (opts.excludeCredentials) {
    result.excludeCredentials = opts.excludeCredentials.map((c) => ({
      id: base64UrlDecode(c.id),
      type: 'public-key' as PublicKeyCredentialType,
    }));
  }
  return result;
}

function serializeCredential(cred: PublicKeyCredential): Record<string, unknown> {
  const response = cred.response as AuthenticatorAssertionResponse | AuthenticatorAttestationResponse;
  const serialized: Record<string, unknown> = {
    id: cred.id,
    type: cred.type,
    rawId: base64UrlEncode(cred.rawId),
  };
  if ('authenticatorData' in response) {
    Object.assign(serialized, {
      response: {
        authenticatorData: base64UrlEncode(response.authenticatorData),
        clientDataJSON: base64UrlEncode(response.clientDataJSON),
        signature: base64UrlEncode((response as AuthenticatorAssertionResponse).signature),
      },
    });
  } else {
    Object.assign(serialized, {
      response: {
        attestationObject: base64UrlEncode((response as AuthenticatorAttestationResponse).attestationObject),
        clientDataJSON: base64UrlEncode(response.clientDataJSON),
      },
    });
  }
  return serialized;
}
