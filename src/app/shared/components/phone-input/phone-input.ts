import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
  buildPhoneCountries,
  findCountryByIso2,
  formatPhoneValue,
  getDefaultCountry,
  parsePhoneValue,
  PhoneCountryOption,
} from './phone-countries';

@Component({
  selector: 'pdj-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './phone-input.html',
  styleUrl: './phone-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PdjPhoneInput),
      multi: true,
    },
  ],
})
export class PdjPhoneInput implements OnInit, AfterViewInit, OnDestroy, ControlValueAccessor {
  @ViewChild('nationalInput') nationalInput!: ElementRef<HTMLInputElement>;
  @Input() placeholder = '';
  @Input() hasError = false;
  @Input() inputId = 'phone';

  countries: PhoneCountryOption[] = [];
  filteredCountries: PhoneCountryOption[] = [];
  selectedCountry: PhoneCountryOption = {
    iso2: 'fr',
    dialCode: '33',
    name: 'France',
    flag: '🇫🇷',
  };
  nationalNumber = '';
  searchQuery = '';
  dropdownOpen = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private pendingValue = '';
  private langSub?: Subscription;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadCountries();
    this.langSub = this.translate.onLangChange.subscribe(() => this.loadCountries(true));
  }

  ngAfterViewInit(): void {
    if (this.pendingValue) {
      this.applyExternalValue(this.pendingValue);
    }
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.dropdownOpen = false;
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.searchQuery = '';
      this.filterCountries();
    }
  }

  onSearchChange(): void {
    this.filterCountries();
  }

  selectCountry(country: PhoneCountryOption, event?: Event): void {
    event?.stopPropagation();
    this.selectedCountry = country;
    this.dropdownOpen = false;
    this.searchQuery = '';
    this.filterCountries();
    this.emitValue();
    setTimeout(() => this.nationalInput?.nativeElement.focus());
  }

  onNumberInput(): void {
    this.nationalNumber = this.nationalNumber.replace(/[^\d\s]/g, '');
    this.emitValue();
  }

  onBlur(): void {
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.pendingValue = value || '';
    if (this.countries.length) {
      this.applyExternalValue(this.pendingValue);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.nationalInput) {
      this.nationalInput.nativeElement.disabled = isDisabled;
    }
  }

  private loadCountries(preserveSelection = false): void {
    const locale = this.translate.currentLang || 'fr';
    const previousIso2 = this.selectedCountry?.iso2;
    this.countries = buildPhoneCountries(locale);
    this.filteredCountries = this.countries;

    if (preserveSelection && previousIso2) {
      this.selectedCountry = findCountryByIso2(this.countries, previousIso2) || getDefaultCountry(this.countries);
    } else {
      this.selectedCountry = getDefaultCountry(this.countries);
    }

    if (this.pendingValue) {
      this.applyExternalValue(this.pendingValue);
    }
  }

  private applyExternalValue(value: string): void {
    const parsed = parsePhoneValue(value, this.countries);
    this.selectedCountry = parsed.country;
    this.nationalNumber = parsed.nationalNumber;
  }

  private filterCountries(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredCountries = this.countries;
      return;
    }

    this.filteredCountries = this.countries.filter((country) => {
      return (
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query.replace(/^\+/, '')) ||
        country.iso2.toLowerCase().includes(query)
      );
    });
  }

  private emitValue(): void {
    this.onChange(formatPhoneValue(this.selectedCountry, this.nationalNumber));
  }
}
