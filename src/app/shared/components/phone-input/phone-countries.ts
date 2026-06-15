import { PHONE_COUNTRY_CODES } from './phone-countries.data';

export interface PhoneCountryOption {
  iso2: string;
  dialCode: string;
  name: string;
  flag: string;
}

const DEFAULT_ISO2 = 'fr';

function isoToFlag(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function buildCountryName(iso2: string, locale: string): string {
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    return displayNames.of(iso2.toUpperCase()) || iso2.toUpperCase();
  } catch {
    return iso2.toUpperCase();
  }
}

export function buildPhoneCountries(locale = 'fr'): PhoneCountryOption[] {
  return PHONE_COUNTRY_CODES
    .map((country) => ({
      iso2: country.iso2,
      dialCode: country.dialCode,
      name: buildCountryName(country.iso2, locale),
      flag: isoToFlag(country.iso2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

export function findCountryByIso2(
  countries: PhoneCountryOption[],
  iso2: string,
): PhoneCountryOption | undefined {
  return countries.find((country) => country.iso2 === iso2);
}

export function getDefaultCountry(countries: PhoneCountryOption[]): PhoneCountryOption {
  return findCountryByIso2(countries, DEFAULT_ISO2) || countries[0];
}

export function parsePhoneValue(
  value: string,
  countries: PhoneCountryOption[],
): { country: PhoneCountryOption; nationalNumber: string } {
  const normalized = value.replace(/[^\d+]/g, '');
  if (!normalized || normalized === '+') {
    return { country: getDefaultCountry(countries), nationalNumber: '' };
  }

  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized;
  const sorted = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);

  for (const country of sorted) {
    if (digits.startsWith(country.dialCode)) {
      return {
        country,
        nationalNumber: digits.slice(country.dialCode.length),
      };
    }
  }

  return {
    country: getDefaultCountry(countries),
    nationalNumber: digits,
  };
}

export function formatPhoneValue(country: PhoneCountryOption, nationalNumber: string): string {
  const digits = nationalNumber.replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  return `+${country.dialCode}${digits}`;
}
