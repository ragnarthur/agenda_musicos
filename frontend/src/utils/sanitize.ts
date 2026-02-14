// utils/sanitize.ts
const stripUnsafeText = (value: string): string => {
  // Remove tags HTML para reduzir risco de payloads refletidos em outros canais.
  const withoutTags = value.replace(/<[^>]*>/g, '');
  // Remove caracteres de controle (mantendo quebra de linha/tab para legibilidade).
  return Array.from(withoutTags)
    .filter(char => {
      const code = char.charCodeAt(0);
      if (code === 9 || code === 10 || code === 13) return true; // tab / \n / \r
      if (code <= 31 || code === 127) return false;
      return true;
    })
    .join('');
};

const applyMaxLength = (value: string, maxLength?: number): string =>
  maxLength ? value.slice(0, maxLength) : value;

export const sanitizeText = (value: string, maxLength?: number) => {
  const sanitized = stripUnsafeText(value).trim();
  if (!sanitized) return '';
  return applyMaxLength(sanitized, maxLength);
};

export const sanitizeOptionalText = (value?: string | null, maxLength?: number) => {
  if (value === null || value === undefined) return undefined;
  const sanitized = stripUnsafeText(value).trim();
  if (!sanitized) return undefined;
  return applyMaxLength(sanitized, maxLength);
};
