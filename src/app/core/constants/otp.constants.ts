export const OTP_CODE_LENGTH = 4;

export function createEmptyOtpDigits(): string[] {
  return Array.from({ length: OTP_CODE_LENGTH }, () => '');
}
