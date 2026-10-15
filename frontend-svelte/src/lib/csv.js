export function csvCell(value) {
  const raw = String(value ?? '');
  const safe = /^\s*[=+@-]/.test(raw) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
