// src/lib/baserow/users.ts
import 'server-only';

export const USERS_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_USERS_TABLE_ID
);

if (!USERS_TABLE_ID || Number.isNaN(USERS_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_USERS_TABLE_ID is not a valid number in .env'
  );
}

type BaserowClientModule = typeof import('./client');
let baserowClientPromise: Promise<BaserowClientModule> | null = null;

const loadBaserowClient = () => {
  if (!baserowClientPromise) {
    baserowClientPromise = import('./client');
  }
  return baserowClientPromise;
};

export type BaserowUserRoleOption = {
  id: number;
  value: string;
  color?: string | null;
};

export type BaserowUserRow = {
  id: number;
  Usuario?: string | null;
  Activo?: boolean | null;
  Rol?: BaserowUserRoleOption[] | null;
  Nombre?: string | null;
  Email?: string | null;
  'Hash Contraseña'?: string | null;
};

const normalizeUsername = (username: string) => username.trim();

export async function getUserByUsername(
  username: string
): Promise<BaserowUserRow | null> {
  const normalizedUsername = normalizeUsername(username || '');
  if (!normalizedUsername) return null;

  const { getTableRows } = await loadBaserowClient();
  const rows = await getTableRows<BaserowUserRow>(USERS_TABLE_ID, {
    filter__Usuario__equal: normalizedUsername,
    limit: 1,
  });

  return rows[0] ?? null;
}

export async function updateUserPasswordHash(
  userId: number,
  newHash: string
): Promise<void> {
  if (!Number.isFinite(userId)) {
    throw new Error('User id must be a finite number');
  }

  const safeHash = newHash?.trim();
  if (!safeHash) {
    throw new Error('New password hash must be a non-empty string');
  }

  const { patchTableRow } = await loadBaserowClient();
  await patchTableRow(USERS_TABLE_ID, userId, {
    'Hash Contraseña': safeHash,
  });
}

