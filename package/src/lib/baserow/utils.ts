// src/lib/baserow/utils.ts

export type BaserowOption = {
  id: number;
  value: string;
  color?: string | null;
};

// --- Baserow table field metadata ---

export type BaserowTableField = {
  id: number;
  name: string;
  type: string;
  select_options?: BaserowOption[];
  single_select_default?: number | null;
};

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export function toStringOrEmpty(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Normalizes Baserow link_row values into an array of numeric ids.
 * Handles both:
 * - [1, 2, 3]
 * - [{ id: 1, value: '...' }, ...]
 */
export function extractLinkRowIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'number') return item;
      if (item && typeof item === 'object' && 'id' in item) {
        const id = (item as { id: unknown }).id;
        return typeof id === 'number' ? id : null;
      }
      return null;
    })
    .filter((id): id is number => typeof id === 'number');
}

export function extractLinkRowLabels(value: any): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (
        item &&
        typeof item === 'object' &&
        ('value' in item || typeof item.value === 'string')
      ) {
        return String(item.value).trim();
      }
      return '';
    })
    .filter((v) => Boolean(v));
}

/**
 * Extracts shortened labels from a Baserow link_row array.
 *
 * Example:
 *   "VC4-FGZ083-La Victoria-Cerealista" → "VC4-FGZ083"
 *   "co-30/11/2025 10:46-La Victoria"   → "co-30/11/2025 10:46"
 *
 * Rules:
 *   - Keep only the part up to the SECOND occurrence of "-"
 *   - If there is only one "-", return everything (no cut)
 *   - If no "-", return the whole string
 */
export function extractLinkRowLabelsTrimmed(value: any): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const raw =
        item && typeof item === 'object' && typeof item.value === 'string'
          ? item.value.trim()
          : '';

      if (!raw) return '';

      // Split by "-"
      const parts = raw.split('-');

      if (parts.length <= 2) {
        // If there's 0 or 1 "-", return whole string
        return raw;
      }

      // Take first two pieces and join with "-"
      return `${parts[0]}-${parts[1]}`;
    })
    .filter((v) => Boolean(v));
}

export function includesLinkRowId(value: unknown, id: number): boolean {
  return extractLinkRowIds(value).includes(id);
}

export function normalizeField(value: any): string {
  if (value === null || value === undefined) return '';

  // Arrays (lookups múltiples, multiselect, etc.)
  if (Array.isArray(value)) {
    return value.map((v) => normalizeField(v)).join(', ');
  }

  // Desenrollar objetos anidados con propiedad "value"
  // { id, value: "Soja" }
  // { id, value: { id, value: "Soja" } }
  // etc.
  let current: any = value;
  let depth = 0;

  while (
    current &&
    typeof current === 'object' &&
    'value' in current &&
    depth < 5 // por seguridad, evitar bucles raros
  ) {
    current = (current as any).value;
    depth += 1;
  }

  if (
    typeof current === 'string' ||
    typeof current === 'number' ||
    typeof current === 'boolean'
  ) {
    return String(current);
  }

  return '';
}
