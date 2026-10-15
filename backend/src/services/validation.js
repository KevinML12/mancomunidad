import { ValidationError } from './errors.js';

export function text(value, label, { optional = false, max = 200 } = {}) {
  if (optional && (value === undefined || value === null || value === '')) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new ValidationError(`${label}: ingrese texto de hasta ${max} caracteres`);
  return value.trim();
}

export function choice(value, options, label) {
  if (!options.includes(value)) throw new ValidationError(`${label}: seleccione una opción válida`);
  return value;
}

export function numeric(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false, money = false } = {}) {
  if (!['string', 'number'].includes(typeof value) || (typeof value === 'string' && !value.trim())) throw new ValidationError(`${label}: ingrese un número`);
  if (typeof value === 'string' && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) throw new ValidationError(`${label}: ingrese un número decimal`);
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max || (integer && !Number.isSafeInteger(result))) throw new ValidationError(`${label}: valor fuera de rango${integer ? ' o no entero' : ''}`);
  if (money && (!Number.isSafeInteger(Math.round(result * 100)) || Math.abs(result * 100 - Math.round(result * 100)) > 0.000001)) throw new ValidationError(`${label}: use como máximo dos decimales`);
  return result;
}

export function date(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) throw new ValidationError(`${label}: fecha inválida`);
  const day = value.slice(0, 10);
  const calendar = new Date(`${day}T00:00:00.000Z`);
  const result = new Date(value);
  if (isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day || isNaN(result.getTime())) throw new ValidationError(`${label}: fecha inválida`);
  return result;
}

export function chronological(start, end, label = 'La fecha final') {
  if (start && end && end < start) throw new ValidationError(`${label} no puede ser anterior a la fecha inicial`);
}

export function url(value, label, optional = true) {
  if (optional && (value === undefined || value === null || value === '')) return undefined;
  try {
    if (typeof value !== 'string') throw new Error();
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error();
    return parsed.href;
  } catch { throw new ValidationError(`${label}: use un enlace HTTPS sin credenciales`); }
}
