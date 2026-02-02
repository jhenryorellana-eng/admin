// Simple auth for MVP - single admin user
// TODO: Migrate to Supabase Auth for production

const ADMIN_EMAIL = 'jhenry.orellana@gmail.com';
const ADMIN_PASSWORD = 'Ceojunior2026$';
const AUTH_TOKEN_KEY = 'admin_auth_token';
const AUTH_EXPIRY_KEY = 'admin_auth_expiry';

// Token expires in 24 hours
const TOKEN_EXPIRY_HOURS = 24;

export interface AdminUser {
  email: string;
  name: string;
}

export function validateCredentials(email: string, password: string): boolean {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function createAuthToken(): string {
  // Simple token for MVP - in production use JWT
  const token = btoa(`${ADMIN_EMAIL}:${Date.now()}`);
  return token;
}

export function login(email: string, password: string): AdminUser | null {
  if (!validateCredentials(email, password)) {
    return null;
  }

  const token = createAuthToken();
  const expiry = Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_EXPIRY_KEY, expiry.toString());
  }

  return {
    email: ADMIN_EMAIL,
    name: 'Administrador',
  };
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);

  if (!token || !expiry) return null;

  // Check if token has expired
  if (Date.now() > parseInt(expiry, 10)) {
    logout();
    return null;
  }

  return token;
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

export function getAdminUser(): AdminUser | null {
  if (!isAuthenticated()) return null;

  return {
    email: ADMIN_EMAIL,
    name: 'Administrador',
  };
}
