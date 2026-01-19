// utils/sanitize.ts
export const sanitizeText = (value: string, maxLength?: number) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

export const sanitizeOptionalText = (value?: string | null, maxLength?: number) => {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
};
