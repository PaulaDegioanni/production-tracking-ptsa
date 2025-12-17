/**
 * datePart: "YYYY-MM-DD"
 * timePart: "HH:mm"
 * returns ISO string "2025-12-17T09:30:00.000Z"
 */
export function combineDateAndTimeToIso(datePart?: string, timePart?: string) {
  const d = (datePart ?? '').trim();
  const t = (timePart ?? '').trim();

  if (!d || !t) {
    throw new Error('La fecha y hora son obligatorias');
  }

  // Build a local datetime from the inputs (HTML date/time are local)
  const local = new Date(`${d}T${t}:00`);
  if (Number.isNaN(local.getTime())) {
    throw new Error('La fecha ingresada no es válida');
  }

  return local.toISOString();
}

/**
 * Takes an ISO datetime and returns { date: "YYYY-MM-DD", time: "HH:mm" } in local time.
 */
export function splitIsoToDateAndTimeLocal(iso?: string | null) {
  if (!iso) return { date: '', time: '' };

  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return { date: '', time: '' };

  const pad = (n: number) => String(n).padStart(2, '0');

  const date = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
    dt.getDate()
  )}`;
  const time = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

  return { date, time };
}
