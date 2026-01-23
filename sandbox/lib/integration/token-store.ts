/**
 * Token Store Utility
 * 
 * Shared token storage for authentication tokens
 * In production, replace with Redis or database storage
 */

interface TokenData {
  expiresAt: number;
}

const tokenStore = new Map<string, TokenData>();

// Clean expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt < now) {
      tokenStore.delete(token);
    }
  }
}, 60000); // Clean every minute

export function storeToken(token: string, expiresInMs: number): void {
  const expiresAt = Date.now() + expiresInMs;
  tokenStore.set(token, { expiresAt });
}

export function validateToken(token: string): boolean {
  const tokenData = tokenStore.get(token);
  if (!tokenData) {
    return false;
  }

  // Check if token expired
  if (tokenData.expiresAt < Date.now()) {
    tokenStore.delete(token);
    return false;
  }

  return true;
}

export function revokeToken(token: string): void {
  tokenStore.delete(token);
}
