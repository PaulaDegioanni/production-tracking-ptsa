// src/lib/auth/types.ts
export const APP_ROLES = ['Admin', 'Operador'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type SessionUser = {
  id: number;
  username: string;
  name: string | null;
  role: AppRole;
};

