import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { AccountingService, Account, CostCenter } from '../../../../core/services/accounting.service';
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
export class VoucherLineFormComponent {
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

  // Signals for dropdown data
  accounts = signal<Account[]>([]);
  subaccounts = signal<Account[]>([]);
  costCenters = signal<CostCenter[]>([]);
  elements = signal<Subelement[]>([]);

  // Filtered data for this specific line
  filteredAccounts = signal<Account[]>([]);
  filteredSubaccounts = signal<Account[]>([]);
  filteredCostCenters = signal<CostCenter[]>([]);
  filteredElements = signal<Subelement[]>([]);

  constructor() {
    this.loadMasterData();
  }

  // Load master data once
  private async loadMasterData() {
    try {
      const [accountsRes, costCentersRes, elementsRes] = await Promise.all([
        this.accountingService.getAccounts().toPromise() as unknown as Account[],
        this.accountingService.getCostCenters().toPromise() as unknown as CostCenter[],
        this.subelementsService.findAll().toPromise() as unknown as Subelement[],
      ]);

      this.accounts.set(accountsRes);
      this.costCenters.set(costCentersRes);
      this.elements.set(elementsRes);
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  }

  // Account filtering and selection
  filterAccounts(searchTerm: string) {
    if (!searchTerm) {
      this.filteredAccounts.set([]);
      return;
    }

    const filtered = this.accounts().filter(account =>
      account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    this.filteredAccounts.set(filtered);
  }

  selectAccount(account: Account) {
    this.lineGroup.patchValue({
      accountCode: account.code,
      accountName: account.name,
      subaccountCode: null,
      subaccountName: null,
    });

    // Load subaccounts for selected account
    this.loadSubaccounts(account.code);
    this.filteredAccounts.set([]);
  }

  getAccountDisplay(value?: string): string {
    if (!value) return '';
    const account = this.accounts().find(acc => acc.code === value);
    return account ? `${account.code} - ${account.name}` : value;
  }

  // Subaccount filtering and selection
  private async loadSubaccounts(accountCode: string) {
    try {
      const subaccounts = await this.accountingService.getSubaccountsByAccount(accountCode).toPromise() as unknown as Account[];
      this.subaccounts.set(subaccounts);
    } catch (error) {
      console.error('Error loading subaccounts:', error);
      this.subaccounts.set([]);
    }
  }

  filterSubaccounts(searchTerm: string) {
    if (!searchTerm) {
      this.filteredSubaccounts.set([]);
      return;
    }

    const filtered = this.subaccounts().filter(subaccount =>
      subaccount.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subaccount.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    this.filteredSubaccounts.set(filtered);
  }

  selectSubaccount(subaccount: Account) {
    this.lineGroup.patchValue({
      subaccountCode: subaccount.code,
      subaccountName: subaccount.name,
    });
    this.filteredSubaccounts.set([]);
  }

  getSubaccountDisplay(value?: string): string {
    if (!value) return '';
    const subaccount = this.subaccounts().find(sub => sub.code === value);
    return subaccount ? `${subaccount.code} - ${subaccount.name}` : value;
  }

  // Cost center filtering and selection
  filterCostCenters(searchTerm: string) {
    if (!searchTerm) {
      this.filteredCostCenters.set([]);
      return;
    }

    const filtered = this.costCenters().filter(center =>
      center.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    this.filteredCostCenters.set(filtered);
  }

  selectCostCenter(costCenter: CostCenter) {
    this.lineGroup.patchValue({
      costCenterId: costCenter.id,
      costCenterCode: costCenter.code,
      costCenterName: costCenter.name,
    });
    this.filteredCostCenters.set([]);
  }

  getCostCenterDisplay(value?: string): string {
    if (!value) return '';
    const costCenter = this.costCenters().find(cc => cc.id === value);
    return costCenter ? `${costCenter.code} - ${costCenter.name}` : '';
  }

  // Element filtering and selection
  filterElements(searchTerm: string) {
    if (!searchTerm) {
      this.filteredElements.set([]);
      return;
    }

    const filtered = this.elements().filter(element =>
      element.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      element.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    this.filteredElements.set(filtered);
  }

  selectElement(element: Subelement) {
    this.lineGroup.patchValue({
      element: element.code,
      elementName: element.name,
    });
    this.filteredElements.set([]);
  }

  getElementDisplay(value?: string): string {
    if (!value) return '';
    const element = this.elements().find(el => el.code === value);
    return element ? `${element.code} - ${element.name}` : value;
  }

  // Debit/Credit change handlers
  onDebitChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.debitChange.emit({ index: this.lineIndex, value });
    
    // Clear credit when debit is entered
    if (value > 0) {
      this.lineGroup.patchValue({ credit: 0 });
    }
  }

  onCreditChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.creditChange.emit({ index: this.lineIndex, value });
    
    // Clear debit when credit is entered
    if (value > 0) {
      this.lineGroup.patchValue({ debit: 0 });
    }
  }

  // Remove line
  onRemoveLine() {
    this.removeLine.emit(this.lineIndex);
  }

  // Computed properties for dropdown visibility
  showAccountDropdown = computed(() => 
    this.filteredAccounts().length > 0 && this.lineGroup.get('accountCode')?.value
  );

  showSubaccountDropdown = computed(() => 
    this.filteredSubaccounts().length > 0 && this.lineGroup.get('subaccountCode')?.value
  );

  showCostCenterDropdown = computed(() => 
    this.filteredCostCenters().length > 0 && this.lineGroup.get('costCenterId')?.value
  );

  showElementDropdown = computed(() => 
    this.filteredElements().length > 0 && this.lineGroup.get('element')?.value
  );
}
