export const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

/**
 * Parsea una fecha de cumpleaños aceptando formatos con o sin año:
 * - 'MM-DD' (ej: '10-01' -> 1 de Octubre)
 * - 'DD/MM' (ej: '01/10' -> 1 de Octubre)
 * - 'YYYY-MM-DD' (legacy compatible)
 */
export function parseBirthday(birthDate?: string | null): { day: number; month: number } | null {
  if (!birthDate) return null;
  const clean = birthDate.trim();
  if (!clean) return null;

  // Formato DD/MM
  if (clean.includes("/")) {
    const parts = clean.split("/").map((p) => parseInt(p, 10));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      let day = parts[0];
      let month = parts[1] - 1;
      if (day <= 12 && parts[1] > 12 && parts[1] <= 31) {
        month = parts[0] - 1;
        day = parts[1];
      }
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        return { day, month };
      }
    }
  }

  // Formato con guión '-' (MM-DD o YYYY-MM-DD)
  if (clean.includes("-")) {
    const parts = clean.split("-").map((p) => parseInt(p, 10));
    if (parts.length === 3) {
      // YYYY-MM-DD
      return { month: parts[1] - 1, day: parts[2] };
    }
    if (parts.length === 2) {
      let month = parts[0] - 1;
      let day = parts[1];
      if (parts[0] > 12 && parts[1] <= 12) {
        day = parts[0];
        month = parts[1] - 1;
      }
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        return { day, month };
      }
    }
  }

  return null;
}

/**
 * Formatea el cumpleaños de forma amigable y legible para el comensal o cajero.
 * Ej: '10-01' -> '1 de Octubre'
 */
export function formatBirthdayDisplay(birthDate?: string | null): string {
  const parsed = parseBirthday(birthDate);
  if (!parsed) return birthDate || "";
  return `${parsed.day} de ${MONTH_NAMES_ES[parsed.month]}`;
}
