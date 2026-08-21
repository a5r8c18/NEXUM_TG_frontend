import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';

export interface CodeComboboxItem {
  code: string;
  name: string;
}

@Component({
  selector: 'app-code-combobox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <input
        type="text"
        [value]="inputValue()"
        [attr.disabled]="disabled ? '' : null"
        (input)="onInput($any($event.target).value)"
        (focus)="onFocus()"
        (blur)="onBlur()"
        [placeholder]="placeholder"
        class="w-full border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
        role="combobox"
        aria-autocomplete="list"
        [attr.aria-expanded]="open()"
      />

      @if (inputValue() && !disabled) {
        <button
          type="button"
          (mousedown)="$event.preventDefault(); clear()"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          title="Limpiar"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }

      @if (open()) {
        <div class="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          @if (filtered().length === 0) {
            <div class="px-3 py-2 text-xs text-slate-400">Sin resultados</div>
          }
          @for (item of filtered(); track item.code) {
            <div
              class="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
              (mousedown)="$event.preventDefault(); select(item)"
              role="option"
              tabindex="0"
              (keydown.enter)="select(item)"
            >
              <div class="text-sm font-medium text-slate-900">{{ item.code }}</div>
              <div class="text-xs text-slate-500">{{ item.name }}</div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class CodeComboboxComponent implements OnInit, OnChanges, OnDestroy {
  @Input() items: CodeComboboxItem[] = [];
  @Input({ required: true }) control!: FormControl;
  @Input() placeholder = 'Buscar...';
  @Input() disabled = false;

  inputValue = signal('');
  filtered = signal<CodeComboboxItem[]>([]);
  open = signal(false);

  private focused = false;
  private sub?: Subscription;

  ngOnInit() {
    this.syncDisplay();
    this.sub = this.control?.valueChanges.subscribe(() => this.syncDisplay());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items'] || changes['control']) {
      this.syncDisplay();
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private syncDisplay() {
    if (this.focused) return;
    const code = this.control?.value;
    if (!code) {
      this.inputValue.set('');
      return;
    }
    const item = this.items.find(i => i.code === code);
    this.inputValue.set(item ? `${item.code} — ${item.name}` : String(code));
  }

  onFocus() {
    if (this.disabled) return;
    this.focused = true;
    this.inputValue.set('');
    this.filtered.set(this.items);
    this.open.set(true);
  }

  onInput(value: string) {
    this.inputValue.set(value);
    const term = value.trim().toLowerCase();
    this.filtered.set(
      !term
        ? this.items
        : this.items.filter(
            i =>
              i.code.toLowerCase().includes(term) ||
              i.name.toLowerCase().includes(term),
          ),
    );
    this.open.set(true);
  }

  onBlur() {
    setTimeout(() => {
      this.open.set(false);
      this.focused = false;
      this.syncDisplay();
    }, 200);
  }

  select(item: CodeComboboxItem) {
    this.focused = false;
    this.open.set(false);
    this.control?.setValue(item.code);
    this.inputValue.set(`${item.code} — ${item.name}`);
  }

  clear() {
    this.focused = false;
    this.open.set(false);
    this.control?.setValue('');
    this.inputValue.set('');
  }
}
