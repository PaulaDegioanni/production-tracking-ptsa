// src/lib/auth/user.ts
import 'server-only';

import type { BaserowUserRow } from '@/lib/baserow/users';

import type { SessionPayload } from './session';
import type { AppRole, SessionUser } from './types';

const ROLE_PRIORITY: AppRole[] = ['Admin', 'Operador'];

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

export const extractUserRole = (user: BaserowUserRow): AppRole | null => {
  const roles = Array.isArray(user.Rol) ? user.Rol : [];
  for (const priorityRole of ROLE_PRIORITY) {
    const match = roles.find((role) => {
      const roleValue = normalizeString(role?.value);
      return (
        roleValue.length > 0 &&
        roleValue.localeCompare(priorityRole, 'es-ES', {
          sensitivity: 'accent',
        }) === 0
      );
    });
    if (match) return priorityRole;
  }
  return null;
};

export const mapBaserowUserToSession = (
  user: BaserowUserRow
): SessionUser | null => {
  const role = extractUserRole(user);
  const username = normalizeString(user.Usuario);
  if (!role || !username) {
    return null;
  }

  const name = normalizeString(user.Nombre) || null;

  return {
    id: user.id,
    username,
    name,
    role,
  };
};

export const isUserActive = (user: BaserowUserRow | null): boolean =>
  Boolean(user?.Activo);

const toPayloadRole = (role: AppRole): SessionPayload['role'] =>
  role === 'Operador' ? 'operador' : 'admin';

const fromPayloadRole = (role: SessionPayload['role']): AppRole =>
  role === 'operador' ? 'Operador' : 'Admin';

export const mapSessionUserToPayload = (
  user: SessionUser
): SessionPayload => {
  const payload: SessionPayload = {
    uid: user.id,
    username: user.username,
    role: toPayloadRole(user.role),
  };

  if (user.name) {
    payload.name = user.name;
  }

  return payload;
};

export const mapPayloadToSessionUser = (
  payload: SessionPayload
): SessionUser => ({
  id: payload.uid,
  username: payload.username,
  name: payload.name ?? null,
  role: fromPayloadRole(payload.role),
});

