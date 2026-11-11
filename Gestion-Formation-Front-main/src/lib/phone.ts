export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8 && !value.startsWith("+")) {
    return `+216${digits}`;
  }
  if (!value.startsWith("+") && digits.length > 0 && digits.length < 8) {
    return value;
  }
  return value;
}
