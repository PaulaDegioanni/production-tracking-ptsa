// src/lib/auth/token.ts
import 'server-only';

export {
  SESSION_COOKIE_NAME,
  SESSION_DURATIONS,
  signSession,
  verifySession,
  getSessionCookieOptions,
} from './session';

