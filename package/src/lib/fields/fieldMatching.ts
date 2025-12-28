export type FieldOptionLike = {
  id: number;
  label: string;
};

const removeDiacritics = (value: string): string => {
  if (typeof value.normalize === 'function') {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  return value;
};

export const normalizeFieldLabel = (
  value?: string | null
): string => {
  if (!value) return '';

  const sanitized = removeDiacritics(String(value))
    .replace(/\s*\(\s*#?\d+\s*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  return sanitized;
};

const extractFieldIdFromLabel = (label?: string | null): number | null => {
  if (!label) return null;

  const patterns = [
    /#\s*(\d+)/,
    /\bID[:\s-]*(\d+)/i,
    /\((\d+)\)/,
  ];

  for (const pattern of patterns) {
    const match = label.match(pattern);
    if (match?.[1]) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
};

const getCandidateId = (
  search: { id?: number | null; label?: string | null }
): number | null => {
  if (typeof search.id === 'number' && Number.isFinite(search.id)) {
    return search.id;
  }
  if (typeof search.id === 'string' && search.id.trim() !== '') {
    const parsed = Number(search.id);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return extractFieldIdFromLabel(search.label);
};

export const areFieldLabelsEquivalent = (
  a?: string | null,
  b?: string | null
): boolean => {
  const normalizedA = normalizeFieldLabel(a);
  const normalizedB = normalizeFieldLabel(b);
  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;
  return (
    normalizedA.startsWith(normalizedB) ||
    normalizedB.startsWith(normalizedA)
  );
};

export const findMatchingFieldOption = <T extends FieldOptionLike>(
  options: T[],
  search: { id?: number | null; label?: string | null }
): T | null => {
  const candidateId = getCandidateId(search);
  if (candidateId) {
    const matchById = options.find((option) => option.id === candidateId);
    if (matchById) return matchById;
  }

  const normalizedLabel = normalizeFieldLabel(search.label);
  if (!normalizedLabel) return null;

  const normalizedOptions = options.map((option) => ({
    option,
    normalized: normalizeFieldLabel(option.label),
  }));

  const exactMatches = normalizedOptions.filter(
    (item) => item.normalized === normalizedLabel
  );
  if (exactMatches.length === 1) {
    return exactMatches[0].option;
  }

  const startsWithMatches = normalizedOptions.filter(
    (item) =>
      item.normalized.startsWith(normalizedLabel) ||
      normalizedLabel.startsWith(item.normalized)
  );
  if (startsWithMatches.length === 1) {
    return startsWithMatches[0].option;
  }

  return null;
};
