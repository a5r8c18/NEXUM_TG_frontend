import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AccountingService, Account, CostCenter, Subaccount } from '../../../../core/services/accounting.service';
import { SubelementsService, Subelement } from '../../../../core/services/subelements.service';

export interface VoucherLineData {
  accountCode?: string;
  accountName?: string;
  subaccountCode?: string;
  subaccountName?: string;
  costCenterId?: string;
  costCenterCode?: string;
  costCenterName?: string;
  element?: string;
  elementName?: string;
  debit?: number;
  credit?: number;
  description?: string;
}

@Component({
  selector: 'app-voucher-line-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './voucher-line-form.component.html',
})
export class VoucherLineFormComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private subelementsService = inject(SubelementsService);

  // Inputs
  @Input() lineIndex!: number;
  @Input() lineGroup!: FormGroup;
  @Input() canRemove!: boolean;

  // Outputs
  @Output() removeLine = new EventEmitter<number>();
  @Output() debitChange = new EventEmitter<{ index: number; value: number }>();
  @Output() creditChange = new EventEmitter<{ index: number; value: number }>();

  // Master data signals
  accounts = signal<Account[]>([]);
  subaccounts = signal<Subaccount[]>([]);
  costCenters = signal<CostCenter[]>([]);
  elements = signal<Subelement[]>([]);

  // Filtered data signals
  filteredAccounts = signal<Account[]>([]);
  filteredSubaccounts = signal<Subaccount[]>([]);
  filteredCostCenters = signal<CostCenter[]>([]);
  filteredElements = signal<Subelement[]>([]);

  // Input display value signals (separate from form control values)
  accountInputValue = signal('');
  subaccountInputValue = signal('');
  costCenterInputValue = signal('');
  elementInputValue = signal('');

  // Dropdown visibility (signal-only dependencies)
  showAccountDropdown = computed(() => this.filteredAccounts().length > 0);
  showSubaccountDropdown = computed(() => this.filteredSubaccounts().length > 0);
  showCostCenterDropdown = computed(() => this.filteredCostCenters().length > 0);
  showElementDropdown = computed(() => this.filteredElements().length > 0);

  ngOnInit() {
    this.loadMasterData();
  }

  // Load master data once
  private async loadMasterData() {
    try {
      const [accountsRes, costCentersRes, elementsRes] = await Promise.all([
        firstValueFrom(this.accountingService.getAccounts({ activeOnly: 'true', level: '3' })),
        firstValueFrom(this.accountingService.getCostCenters()),
        firstValueFrom(this.subelementsService.findAll()),
      ]);

      const accountsOnly = (accountsRes ?? []).filter(acc => acc.level === 3);
      this.accounts.set(accountsOnly);
      this.costCenters.set(costCentersRes ?? []);
      this.elements.set(elementsRes ?? []);

      // Initialize display values from existing form data (edit mode)
      this.initializeDisplayValues();
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  }

  private initializeDisplayValues() {
    const accountCode = this.lineGroup.get('accountCode')?.value;
    if (accountCode) {
      const acc = this.accounts().find(a => a.code === accountCode);
      this.accountInputValue.set(acc ? `${acc.code} - ${acc.name}` : accountCode);
      if (acc) this.loadSubaccounts(acc.id);
    }
    const subCode = this.lineGroup.get('subaccountCode')?.value;
    if (subCode) {
      this.subaccountInputValue.set(subCode);
    }
    const ccId = this.lineGroup.get('costCenterId')?.value;
    if (ccId) {
      const cc = this.costCenters().find(c => c.id === ccId);
      this.costCenterInputValue.set(cc ? `${cc.code} - ${cc.name}` : '');
    }
    const elCode = this.lineGroup.get('subelement')?.value || this.lineGroup.get('element')?.value;
    if (elCode) {
      const el = this.elements().find(e => e.code === elCode);
      this.elementInputValue.set(el ? `${el.code} - ${el.name}` : elCode);
    }
  }

  // ── Account ──
  onAccountInput(value: string) {
    this.accountInputValue.set(value);
    if (!value) {
      this.filteredAccounts.set(this.accounts());
      return;
    }
    const term = value.toLowerCase();
    this.filteredAccounts.set(
      this.accounts().filter(a =>
        a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term)
      )
    );
  }

  onAccountFocus() {
    this.accountInputValue.set('');
    this.filteredAccounts.set(this.accounts());
  }

  onAccountBlur() {
    setTimeout(() => {
      this.filteredAccounts.set([]);
      const code = this.lineGroup.get('accountCode')?.value;
      if (code) {
        const acc = this.accounts().find(a => a.code === code);
        this.accountInputValue.set(acc ? `${acc.code} - ${acc.name}` : code);
      }
    }, 200);
  }

  selectAccount(account: Account) {
    this.lineGroup.patchValue({
      accountCode: account.code,
      accountName: account.name,
      subaccountCode: null,
      subaccountName: null,
    });
    this.accountInputValue.set(`${account.code} - ${account.name}`);
    this.filteredAccounts.set([]);
    this.subaccountInputValue.set('');
    this.subaccounts.set([]);
    this.loadSubaccounts(account.id);
  }

  // ── Subaccount ──
  private async loadSubaccounts(accountId: string) {
    try {
      const res = await firstValueFrom(this.accountingService.getSubaccountsByAccount(accountId));
      this.subaccounts.set(res ?? []);
    } catch (error) {
      this.subaccounts.set([]);
    }
  }

  onSubaccountInput(value: string) {
    this.subaccountInputValue.set(value);
    if (!value) {
      this.filteredSubaccounts.set(this.subaccounts());
      return;
    }
    const term = value.toLowerCase();
    this.filteredSubaccounts.set(
      this.subaccounts().filter(s =>
        (s as any).code.toLowerCase().includes(term) || (s as any).name.toLowerCase().includes(term)
      )
    );
  }

  onSubaccountFocus() {
    this.subaccountInputValue.set('');
    // Set filteredSubaccounts to the loaded subaccounts
    this.filteredSubaccounts.set(this.subaccounts());
  }

  onSubaccountBlur() {
    setTimeout(() => {
      this.filteredSubaccounts.set([]);
      const code = this.lineGroup.get('subaccountCode')?.value;
      if (code) {
        const sub = this.subaccounts().find(s => (s as any).code === code);
        this.subaccountInputValue.set(sub ? `${(sub as any).code} - ${(sub as any).name}` : code);
      }
    }, 200);
  }

  selectSubaccount(subaccount: any) {
    this.lineGroup.patchValue({
      subaccountCode: subaccount.code,
      subaccountName: subaccount.name,
    });
    this.subaccountInputValue.set(`${subaccount.code} - ${subaccount.name}`);
    this.filteredSubaccounts.set([]);
  }

  // Helper methods to safely access subaccount properties
  getSubaccountCode(subaccount: any): string {
    return subaccount.code || subaccount.subaccountCode || '';
  }

  getSubaccountName(subaccount: any): string {
    return subaccount.name || subaccount.subaccountName || '';
  }

  // ── Cost Center ──
  onCostCenterInput(value: string) {
    this.costCenterInputValue.set(value);
    if (!value) {
      this.filteredCostCenters.set(this.costCenters());
      return;
    }
    const term = value.toLowerCase();
    this.filteredCostCenters.set(
      this.costCenters().filter(c =>
        c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)
      )
    );
  }

  onCostCenterFocus() {
    this.costCenterInputValue.set('');
    this.filteredCostCenters.set(this.costCenters());
  }

  onCostCenterBlur() {
    setTimeout(() => {
      this.filteredCostCenters.set([]);
      const ccId = this.lineGroup.get('costCenterId')?.value;
      if (ccId) {
        const cc = this.costCenters().find(c => c.id === ccId);
        this.costCenterInputValue.set(cc ? `${cc.code} - ${cc.name}` : '');
      }
    }, 200);
  }

  selectCostCenter(costCenter: CostCenter) {
    this.lineGroup.patchValue({
      costCenterId: costCenter.id,
      costCenterCode: costCenter.code,
      costCenterName: costCenter.name,
    });
    this.costCenterInputValue.set(`${costCenter.code} - ${costCenter.name}`);
    this.filteredCostCenters.set([]);
  }

  // ── Element ──
  onElementInput(value: string) {
    this.elementInputValue.set(value);
    if (!value) {
      this.filteredElements.set(this.elements());
      return;
    }
    const term = value.toLowerCase();
    this.filteredElements.set(
      this.elements().filter(e =>
        e.code.toLowerCase().includes(term) || e.name.toLowerCase().includes(term)
      )
    );
  }

  onElementFocus() {
    this.elementInputValue.set('');
    this.filteredElements.set(this.elements());
  }

  onElementBlur() {
    setTimeout(() => {
      this.filteredElements.set([]);
      const code = this.lineGroup.get('subelement')?.value || this.lineGroup.get('element')?.value;
      if (code) {
        const el = this.elements().find(e => e.code === code);
        this.elementInputValue.set(el ? `${el.code} - ${el.name}` : code);
      }
    }, 200);
  }

  selectElement(element: Subelement) {
    this.lineGroup.patchValue({
      element: element.code,
      subelement: element.code,
    });
    this.elementInputValue.set(`${element.code} - ${element.name}`);
    this.filteredElements.set([]);
  }

  // ── Debit/Credit ──
  onDebitChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.debitChange.emit({ index: this.lineIndex, value });
    if (value > 0) {
      this.lineGroup.patchValue({ credit: 0 });
    }
  }

  onCreditChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.creditChange.emit({ index: this.lineIndex, value });
    if (value > 0) {
      this.lineGroup.patchValue({ debit: 0 });
    }
  }

  // Remove line
  onRemoveLine() {
    this.removeLine.emit(this.lineIndex);
  }
}
