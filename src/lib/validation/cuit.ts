/**
 * Utilidades de validación para documentos de identidad y CUIT en Argentina (AFIP / ARCA).
 * 
 * Regla de Negocio GastroBumeran:
 * El programa de fidelización premia y retiene exclusivamente a PERSONAS HUMANAS (físicas).
 * Las PERSONAS JURÍDICAS (empresas, sociedades comerciales SRL/SA/SAS, entes estatales)
 * están formalmente excluidas de la emisión de puntos y beneficios.
 */

/**
 * Normaliza un documento extrayendo únicamente sus dígitos numéricos.
 */
export function normalizeDocumentDigits(doc: string | null | undefined): string {
  if (!doc) return "";
  return String(doc).replace(/\D/g, "");
}

/**
 * Determina si un documento corresponde a un CUIT de Persona Jurídica (Empresa / Sociedad).
 * 
 * En el sistema tributario argentino:
 * - Los CUITs de empresas y sociedades comerciales tienen 11 dígitos y sus prefijos oficiales son:
 *   - 30: Sociedades comerciales (SRL, SA, SAS, etc.)
 *   - 33: Entes públicos, bancos, instituciones y sociedades estatales
 *   - 34: Sociedades y entidades creadas por leyes especiales
 *   - 50, 51, 55: Sociedades o personas jurídicas del exterior
 * 
 * - Los documentos de 7 u 8 dígitos son DNIs de personas humanas (incluso si comienzan con '30').
 * - Los CUITs/CUILs de 11 dígitos con prefijos 20, 23, 24, 27 corresponden a personas humanas (físicas).
 */
export function isLegalEntityCuit(doc: string | null | undefined): boolean {
  if (!doc) return false;
  const digits = normalizeDocumentDigits(doc);

  // Un CUIT completo tiene 11 dígitos
  if (digits.length !== 11) {
    return false;
  }

  const prefix = digits.slice(0, 2);
  const legalEntityPrefixes = ["30", "33", "34", "50", "51", "55"];
  return legalEntityPrefixes.includes(prefix);
}

export interface DocumentValidationResult {
  valid: boolean;
  isLegalEntity: boolean;
  cleanDocument: string;
  errorMessage?: string;
}

/**
 * Valida un documento para el alta o identificación en el programa de fidelización.
 */
export function validateHumanDocument(doc: string | null | undefined): DocumentValidationResult {
  const clean = (doc || "").trim();
  const digits = normalizeDocumentDigits(clean);

  if (!digits) {
    return {
      valid: false,
      isLegalEntity: false,
      cleanDocument: clean,
      errorMessage: "El número de documento no puede estar vacío.",
    };
  }

  // 1. Bloqueo estricto de Personas Jurídicas / Empresas
  if (isLegalEntityCuit(clean)) {
    const prefix = digits.slice(0, 2);
    return {
      valid: false,
      isLegalEntity: true,
      cleanDocument: clean,
      errorMessage: `El CUIT ingresado (${clean}) corresponde a una persona jurídica o empresa (prefijo ${prefix}). El programa de fidelización es exclusivo para personas humanas.`,
    };
  }

  // 2. Longitud mínima admisible para personas humanas (DNI mínimo 6 dígitos, máximo 11 dígitos para CUIL humano)
  if (digits.length < 6) {
    return {
      valid: false,
      isLegalEntity: false,
      cleanDocument: clean,
      errorMessage: "El número de documento debe tener al menos 6 dígitos.",
    };
  }

  if (digits.length > 11) {
    return {
      valid: false,
      isLegalEntity: false,
      cleanDocument: clean,
      errorMessage: "El número de documento no puede superar los 11 dígitos.",
    };
  }

  return {
    valid: true,
    isLegalEntity: false,
    cleanDocument: clean,
  };
}
