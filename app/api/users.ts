import type { 
  AuthenticatorTransportFuture,
  CredentialDeviceType,
  Base64URLString,
} from "@simplewebauthn/types";

export interface Authenticator {
  credentialID: Base64URLString;
  credentialPublicKey: Uint8Array;
  counter: number;
  credentialDeviceType: CredentialDeviceType;
  credentialBackedUp: boolean;
  transports?: AuthenticatorTransportFuture[];
}

export interface User {
  email: string;
  authenticators: Authenticator[];
}

// In-memory user store (persistent across dev reloads)
declare global {
  var __users: Map<string, User> | undefined;
}

const users = globalThis.__users ?? new Map<string, User>();
globalThis.__users = users;

export const userStore = {
  create(email: string): User {
    const user: User = {
      email,
      authenticators: [],
    };
    users.set(email, user);
    return user;
  },

  get(email: string): User | undefined {
    return users.get(email);
  },

  // Debug function
  getAllUsers(): Map<string, User> {
    return users;
  },

  addAuthenticator(email: string, authenticator: Authenticator): void {
    const user = users.get(email);
    if (user) {
      user.authenticators.push(authenticator);
    }
  },

  getAuthenticator(email: string, credentialID: string): Authenticator | undefined {
    const user = users.get(email);
    if (!user) return undefined;
    
    return user.authenticators.find(auth => auth.credentialID === credentialID);
  },
};