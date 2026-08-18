import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { 
  FixedAssetsService, 
  FixedAsset, 
  FixedAssetArea,
  CreateFixedAssetDto, 
  UpdateFixedAssetDto, 
  DepreciationGroup,
  DisposeAssetDto,
  RevalueAssetDto,
  AcquisitionConcept,
  DisposalConcept,
  PendingInvestigation,
  ResolveInvestigationDto,
  AddImprovementDto,
  TransferAssetDto
} from '../../core/services/fixed-assets.service';
import { CompanyService } from '../../core/services/company.service';
import { Company } from '../../models/company.models';
import { HrService, Employee } from '../../core/services/hr.service';
import { AccountingService, CostCenter, Account } from '../../core/services/accounting.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { OfflineFirstService } from '../../core/offline/offline-first.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { signal, computed } from '@angular/core';

@Component({
  selector: 'app-fixed-assets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './fixed-assets.component.html'
})
export class FixedAssetsComponent implements OnInit, OnDestroy {
  private fixedAssetsService = inject(FixedAssetsService);
  private hrService = inject(HrService);
  private accountingService = inject(AccountingService);
  private companyService = inject(CompanyService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private confirmDialog = inject(ConfirmDialogService);
  private offlineFirst = inject(OfflineFirstService);
  private networkStatus = inject(NetworkStatusService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signals
  assets = signal<FixedAsset[]>([]);
  employees = signal<Employee[]>([]);
  areas = signal<FixedAssetArea[]>([]);
  accounts = signal<Account[]>([]);
  costCenters = signal<CostCenter[]>([]);
  catalog = signal<DepreciationGroup[]>([]);
  isLoading = signal(false);
  showForm = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  view = signal<'assets' | 'areas'>('assets');
  showAreaModal = signal(false);
  showAreaForm = signal(false);
  editingArea: FixedAssetArea | null = null;
  areaForm!: FormGroup;

  private groupNumberValue = signal<number | null>(null);
  private costCenterIdValue = signal<string>('');
  private areaIdValue = signal<number | null>(null);

  // Form
  form!: FormGroup;
  editingAsset: FixedAsset | null = null;
  showDisposeModal = signal(false);
  disposeAsset: FixedAsset | null = null;
  disposeForm!: FormGroup;
  showDepreciationModal = signal(false);
  depreciationForm!: FormGroup;

  // ── Conceptos de gestión de AFT ──
  openMenu = signal<'altas' | 'bajas' | 'internos' | null>(null);
  acquisitionConcept = signal<AcquisitionConcept>('compra');
  disposalConcept = signal<DisposalConcept>('deterioro');
  showRevalueModal = signal(false);
  revalueForm!: FormGroup;

  // ── Investigaciones (faltantes/sobrantes) ──
  investigations = signal<PendingInvestigation[]>([]);
  showInvestigationModal = signal(false);
  showResolveModal = signal(false);
  selectedInvestigation: PendingInvestigation | null = null;
  resolveForm!: FormGroup;

  // ── Mejora capitalizable ──
  showImprovementModal = signal(false);
  improvementForm!: FormGroup;

  // ── Traspaso entre dependencias ──
  showTransferModal = signal(false);
  transferForm!: FormGroup;
  companies = signal<Company[]>([]);

  readonly acquisitionConcepts: { value: AcquisitionConcept; label: string }[] = [
    { value: 'compra', label: 'Compra de AFT' },
    { value: 'donacion', label: 'Alta de AFT por donación' },
    { value: 'sobrante', label: 'Alta de AFT por sobrante' },
  ];

  readonly disposalConcepts: { value: DisposalConcept; label: string }[] = [
    { value: 'faltante', label: 'Baja por faltante' },
    { value: 'deterioro', label: 'Baja por deterioro' },
    { value: 'venta', label: 'Venta de AFT (factura manual)' },
    { value: 'devolucion_compra', label: 'Devolución de compra de AFT' },
    { value: 'donacion', label: 'Baja por donación entregada' },
  ];

  activeAssets = computed(() => this.assets().filter(a => a.status === 'active' || a.status === 'fully_depreciated'));
  pendingInvestigationCount = computed(() => this.investigations().length);

  // Computed
  selectedGroup = computed(() => {
    const groupNumber = this.groupNumberValue();
    if (groupNumber === null) return null;
    return this.catalog().find(g => Number(g.group_number) === groupNumber) ?? null;
  });

  selectedCostCenter = computed(() => {
    const costCenterId = this.costCenterIdValue();
    if (!costCenterId) return null;
    return this.costCenters().find(cc => cc.id === costCenterId) ?? null;
  });

  expenseAccountCode = computed(() => {
    return this.selectedCostCenter()?.expenseAccountCode ?? '';
  });

  selectedArea = computed(() => {
    const areaId = this.areaIdValue();
    if (areaId === null) return null;
    return this.areas().find(a => Number(a.id) === areaId) ?? null;
  });

  assetAccounts = computed(() =>
    this.accounts().filter(a => a.level === 3 && a.code.startsWith('24'))
  );

  transferAccounts = computed(() =>
    this.accounts().filter(a => a.level === 3 && a.code.startsWith('696'))
  );

  movementAccounts = computed(() =>
    this.accounts().filter(a => a.level === 3 && !a.code.includes('.'))
  );

  totalAcquisitionValue = computed(() => 
    this.assets().reduce((sum, asset) => sum + asset.acquisitionValue, 0)
  );

  totalCurrentValue = computed(() => 
    this.assets().reduce((sum, asset) => sum + this.calculateCurrentValue(asset), 0)
  );

  totalDepreciated = computed(() => 
    this.totalAcquisitionValue() - this.totalCurrentValue()
  );

  ngOnInit() {
    const tab = this.route.snapshot.data?.['tab'] as 'assets' | 'areas';
    this.view.set(tab || 'assets');
    this.buildForm();
    this.loadAll();
    this.loadEmployees();
    this.loadAreas();
    this.loadCostCenters();
    this.loadInvestigations();
    if (this.view() === 'areas') {
      this.showAreaModal.set(true);
    }
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  buildForm() {
    this.form = this.fb.group({
      assetCode: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      groupNumber: [null, Validators.required],
      subgroup: ['', Validators.required],
      subgroupDetail: [''],
      acquisitionValue: [null, [Validators.required, Validators.min(0.01)]],
      acquisitionDate: ['', Validators.required],
      location: [''],
      areaId: [null],
      employeeId: [''],
      costCenterId: [''],
      responsiblePerson: [''],
      assetAccountCode: ['', Validators.required],
      counterpartAccountCode: ['', Validators.required],
    });

    this.buildAreaForm();
    this.buildDisposeForm();
    this.buildDepreciationForm();
    this.loadAccounts();

    this.form.get('groupNumber')?.valueChanges.subscribe((value) => {
      this.groupNumberValue.set(value === null || value === '' ? null : Number(value));
      this.form.patchValue({ subgroup: '' }, { emitEvent: false });
      this.updateFormControlsState();
    });

    this.form.get('areaId')?.valueChanges.subscribe((value) => {
      this.areaIdValue.set(value === null || value === '' ? null : Number(value));
    });

    this.form.get('costCenterId')?.valueChanges.subscribe((value) => {
      this.costCenterIdValue.set(value || '');
      const cc = this.costCenters().find(c => c.id === value);
      this.form.patchValue({ responsiblePerson: cc?.expenseAccountCode || '' }, { emitEvent: false });
    });
  }

  buildAreaForm() {
    this.areaForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true],
    });
  }

  buildDisposeForm() {
    this.disposeForm = this.fb.group({
      assetId: ['', Validators.required],
      reason: ['', Validators.required],
      disposalType: ['deterioro', Validators.required],
      disposalDate: [''],
      saleAmount: [null],
      assetAccountCode: ['', Validators.required],
      counterpartAccountCode: ['', Validators.required],
      proceedsAccountCode: [''],
    });

    this.buildRevalueForm();
  }

  buildRevalueForm() {
    this.revalueForm = this.fb.group({
      assetId: ['', Validators.required],
      newValue: [null, [Validators.required, Validators.min(0.01)]],
      revaluationDate: ['', Validators.required],
      reason: ['', Validators.required],
      appraisalReference: [''],
    });

    this.resolveForm = this.fb.group({
      resolution: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      resolutionDate: ['', Validators.required],
      responsibleName: [''],
      notes: [''],
    });

    this.improvementForm = this.fb.group({
      assetId: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      description: ['', Validators.required],
      improvementDate: ['', Validators.required],
    });

    this.transferForm = this.fb.group({
      assetId: ['', Validators.required],
      targetCompanyId: [null, Validators.required],
      transferDate: ['', Validators.required],
      reason: ['', Validators.required],
      newLocation: [''],
      newResponsiblePerson: [''],
      assetAccountCode: ['', Validators.required],
      transferAccountCode: ['', Validators.required],
    });
  }

  buildDepreciationForm() {
    const currentDate = new Date();
    this.depreciationForm = this.fb.group({
      year: [currentDate.getFullYear(), Validators.required],
      month: [currentDate.getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    });
  }

  updateFormControlsState() {
    const isEditing = !!this.editingAsset;
    const isGroupSelected = !!this.selectedGroup();

    if (isEditing) {
      this.form.get('groupNumber')?.disable();
      this.form.get('subgroup')?.disable();
    } else {
      this.form.get('groupNumber')?.enable();
      if (isGroupSelected) {
        this.form.get('subgroup')?.enable();
      } else {
        this.form.get('subgroup')?.disable();
      }
    }
  }

  loadAll() {
    this.isLoading.set(true);
    this.hasError.set(false);

    if (this.networkStatus.isOnline()) {
      Promise.all([
        this.fixedAssetsService.getFixedAssets().toPromise(),
        this.fixedAssetsService.getDepreciationCatalog().toPromise()
      ]).then(([assets, catalog]) => {
        this.assets.set(assets || []);
        this.catalog.set(catalog || []);
      }).catch(async () => {
        // Fallback to offline data
        this.offlineFirst.getFixedAssets().subscribe(data => this.assets.set(data));
        this.showToast('Cargando datos locales (sin conexión)', 'info');
      }).finally(() => {
        this.isLoading.set(false);
      });
    } else {
      this.offlineFirst.getFixedAssets().subscribe({
        next: (data) => {
          this.assets.set(data);
          this.isLoading.set(false);
          this.showToast('Datos locales (modo offline)', 'info');
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        }
      });
    }
  }

  loadEmployees() {
    if (this.networkStatus.isOnline()) {
      this.hrService.getEmployees({ status: 'active' })
        .toPromise()
        .then(employees => this.employees.set(employees || []))
        .catch(() => this.employees.set([]));
    }
  }

  loadAreas() {
    if (this.networkStatus.isOnline()) {
      this.fixedAssetsService.getAreas()
        .toPromise()
        .then(areas => this.areas.set(areas || []))
        .catch(() => this.areas.set([]));
    }
  }

  loadCostCenters() {
    if (this.networkStatus.isOnline()) {
      this.accountingService.getCostCenters()
        .toPromise()
        .then(centers => this.costCenters.set(centers || []))
        .catch(() => this.costCenters.set([]));
    }
  }

  loadAccounts() {
    if (this.networkStatus.isOnline()) {
      this.accountingService.getAccounts()
        .toPromise()
        .then(list => this.accounts.set(list || []))
        .catch(() => this.accounts.set([]));
    }
  }

  loadInvestigations() {
    if (this.networkStatus.isOnline()) {
      this.fixedAssetsService.getPendingInvestigations()
        .toPromise()
        .then(list => this.investigations.set(list || []))
        .catch(() => this.investigations.set([]));
    }
  }

  loadCompanies() {
    if (this.companies().length > 0) return;
    this.companyService.getCompanies()
      .toPromise()
      .then(list => this.companies.set(list || []))
      .catch(() => this.companies.set([]));
  }

  toggleMenu(menu: 'altas' | 'bajas' | 'internos') {
    this.openMenu.update(current => (current === menu ? null : menu));
  }

  closeMenus() {
    this.openMenu.set(null);
  }

  openCreate(concept: AcquisitionConcept = 'compra') {
    this.closeMenus();
    this.editingAsset = null;
    this.acquisitionConcept.set(concept);
    this.form.reset();
    this.updateFormControlsState();
    this.showForm.set(true);
  }

  openEdit(asset: FixedAsset) {
    this.editingAsset = asset;
    this.form.patchValue({
      assetCode: asset.assetCode,
      name: asset.name,
      description: asset.description ?? '',
      groupNumber: asset.groupNumber,
      subgroup: asset.subgroup,
      subgroupDetail: asset.subgroupDetail ?? '',
      acquisitionValue: asset.acquisitionValue,
      acquisitionDate: asset.acquisitionDate.substring(0, 10),
      location: asset.location ?? '',
      areaId: asset.areaId ?? null,
      employeeId: asset.employeeId ?? '',
      costCenterId: asset.costCenterId ?? '',
      responsiblePerson: asset.responsiblePerson ?? '',
    });
    this.updateFormControlsState();
    this.showForm.set(true);
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    try {
      if (this.editingAsset) {
        const dto: UpdateFixedAssetDto = {
          name: this.form.value.name,
          description: this.form.value.description || undefined,
          location: this.form.value.location || undefined,
          employeeId: this.form.value.employeeId || undefined,
          responsiblePerson: this.form.value.responsiblePerson || undefined,
        };
        await this.fixedAssetsService.updateFixedAsset(this.editingAsset.id, dto).toPromise();
        this.showToast('Activo actualizado correctamente', 'success');
      } else {
        const dto: CreateFixedAssetDto = {
          assetCode: this.form.value.assetCode,
          name: this.form.value.name,
          description: this.form.value.description || undefined,
          groupNumber: +this.form.value.groupNumber,
          subgroup: this.form.value.subgroup,
          subgroupDetail: this.form.value.subgroupDetail || undefined,
          acquisitionValue: +this.form.value.acquisitionValue,
          acquisitionDate: this.form.value.acquisitionDate,
          acquisitionType: this.acquisitionConcept(),
          location: this.form.value.location || undefined,
          areaId: this.form.value.areaId ? +this.form.value.areaId : undefined,
          employeeId: this.form.value.employeeId || undefined,
          costCenterId: this.form.value.costCenterId || undefined,
          responsiblePerson: this.form.value.responsiblePerson || undefined,
          assetAccountCode: this.form.value.assetAccountCode || undefined,
          counterpartAccountCode: this.form.value.counterpartAccountCode || undefined,
        };
        const result = await this.fixedAssetsService.createFixedAsset(dto).toPromise();
        // El backend puede devolver un aviso contable no bloqueante (p. ej.
        // proveedor inexistente, que deriva la CxP a un proveedor genérico).
        const warning = result?.accountingWarning;
        this.showToast(
          warning ? `Activo creado. ${warning}` : 'Activo creado correctamente',
          warning ? 'info' : 'success',
        );
      }
      await this.loadAll();
      this.showForm.set(false);
    } catch (error) {
      this.showToast(this.getErrorMessage(error, 'Error al guardar activo'), 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Extrae el mensaje de la excepción de negocio del backend, si lo hay. */
  private getErrorMessage(error: unknown, fallback: string): string {
    const message = (error as { error?: { message?: string | string[] } })?.error?.message;
    if (Array.isArray(message)) return message[0] || fallback;
    return message || fallback;
  }

  async deleteAsset(asset: FixedAsset) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar activo fijo',
      message:
        `¿Eliminar el activo "${asset.name}"? ` +
        'Solo es posible si aún no tiene comprobantes contables ni depreciación registrada; ' +
        'en caso contrario debe registrarse la baja.',
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await this.fixedAssetsService.deleteFixedAsset(asset.id).toPromise();
      this.showToast('Activo eliminado correctamente', 'success');
      await this.loadAll();
    } catch (error) {
      this.showToast(this.getErrorMessage(error, 'Error al eliminar activo'), 'error');
    }
  }

  openDispose(asset?: FixedAsset, concept?: DisposalConcept) {
    this.closeMenus();
    this.disposeAsset = asset || null;
    this.disposalConcept.set(concept || 'deterioro');
    this.disposeForm.reset({
      assetId: asset?.id || '',
      reason: '',
      disposalType: concept || 'deterioro',
      disposalDate: new Date().toISOString().split('T')[0],
      saleAmount: null,
    });
    this.showDisposeModal.set(true);
  }

  async disposeSubmit() {
    if (this.disposeForm.invalid) return;

    const assetId = this.disposeForm.value.assetId;
    if (!assetId) return;

    this.isLoading.set(true);
    try {
      const concept = this.disposalConcept();
      const dto: DisposeAssetDto = {
        reason: this.disposeForm.value.reason,
        disposalType: concept,
        disposalDate: this.disposeForm.value.disposalDate,
        assetAccountCode: this.disposeForm.value.assetAccountCode || undefined,
        counterpartAccountCode: this.disposeForm.value.counterpartAccountCode || undefined,
      };
      if (concept === 'venta' && this.disposeForm.value.saleAmount) {
        dto.saleAmount = +this.disposeForm.value.saleAmount;
      }
      if (this.disposeForm.value.proceedsAccountCode) {
        dto.proceedsAccountCode = this.disposeForm.value.proceedsAccountCode;
      }
      const result: any = await this.fixedAssetsService.disposeAsset(assetId, dto).toPromise();
      const notes: string[] = result?.pendingActions || [];
      this.showToast(
        notes.length > 0
          ? `${this.getDisposalConceptLabel(concept)} registrada. ${notes[0]}`
          : `${this.getDisposalConceptLabel(concept)} registrada correctamente`,
        notes.length > 0 ? 'info' : 'success',
      );
      await this.loadAll();
      this.loadInvestigations();
      this.showDisposeModal.set(false);
      this.disposeAsset = null;
    } catch (error) {
      this.showToast(this.getErrorMessage(error, 'Error al registrar la baja del activo'), 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  openRevalueModal(asset?: FixedAsset) {
    this.closeMenus();
    this.revalueForm.reset({
      assetId: asset?.id || '',
      newValue: asset ? asset.currentValue : null,
      revaluationDate: new Date().toISOString().split('T')[0],
      reason: '',
      appraisalReference: '',
    });
    this.showRevalueModal.set(true);
  }

  async revalueSubmit() {
    if (this.revalueForm.invalid) return;

    this.isLoading.set(true);
    try {
      const dto: RevalueAssetDto = {
        newValue: +this.revalueForm.value.newValue,
        reason: this.revalueForm.value.reason,
        revaluationDate: this.revalueForm.value.revaluationDate,
        appraisalReference: this.revalueForm.value.appraisalReference || undefined,
      };
      const result: any = await this.fixedAssetsService
        .revalueAsset(this.revalueForm.value.assetId, dto)
        .toPromise();
      const notes: string[] = result?.pendingActions || [];
      this.showToast(
        notes.length > 0
          ? `Avalúo registrado. ${notes[0]}`
          : 'Avalúo registrado correctamente',
        notes.length > 0 ? 'info' : 'success',
      );
      await this.loadAll();
      this.showRevalueModal.set(false);
    } catch (error) {
      this.showToast(this.getErrorMessage(error, 'Error al registrar el avalúo'), 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ══════════════════════════════════════════════════════════
  // ── Investigaciones de faltantes / sobrantes ──
  // ══════════════════════════════════════════════════════════

  openInvestigationsModal() {
    this.closeMenus();
    this.loadInvestigations();
    this.showInvestigationModal.set(true);
  }

  openResolveModal(investigation: PendingInvestigation) {
    this.selectedInvestigation = investigation;
    this.resolveForm.reset({
      resolution: investigation.type === 'surplus' ? 'income' : '',
      amount: investigation.amount,
      resolutionDate: new Date().toISOString().split('T')[0],
      responsibleName: investigation.responsiblePerson || '',
      notes: '',
    });
    this.showResolveModal.set(true);
  }

  async resolveInvestigationSubmit() {
    if (!this.selectedInvestigation || this.resolveForm.invalid) return;

    this.isLoading.set(true);
    try {
      const dto: ResolveInvestigationDto = {
        resolution: this.resolveForm.value.resolution,
        amount: +this.resolveForm.value.amount,
        resolutionDate: this.resolveForm.value.resolutionDate,
        responsibleName: this.resolveForm.value.responsibleName || undefined,
        notes: this.resolveForm.value.notes || undefined,
      };
      await this.fixedAssetsService
        .resolveInvestigation(this.selectedInvestigation.assetId, dto)
        .toPromise();
      this.showToast('Investigación resuelta correctamente', 'success');
      this.loadInvestigations();
      await this.loadAll();
      this.showResolveModal.set(false);
      this.selectedInvestigation = null;
    } catch (error) {
      this.showToast('Error al resolver la investigación', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  getInvestigationTypeLabel(type?: string | null): string {
    return type === 'shortage' ? 'Faltante' : 'Sobrante';
  }

  // ══════════════════════════════════════════════════════════
  // ── Mejora capitalizable ──
  // ══════════════════════════════════════════════════════════

  openImprovementModal(asset?: FixedAsset) {
    this.closeMenus();
    this.improvementForm.reset({
      assetId: asset?.id || '',
      amount: null,
      description: '',
      improvementDate: new Date().toISOString().split('T')[0],
    });
    this.showImprovementModal.set(true);
  }

  async improvementSubmit() {
    if (this.improvementForm.invalid) return;

    this.isLoading.set(true);
    try {
      const dto: AddImprovementDto = {
        amount: +this.improvementForm.value.amount,
        description: this.improvementForm.value.description,
        improvementDate: this.improvementForm.value.improvementDate,
      };
      const result: any = await this.fixedAssetsService
        .addImprovement(this.improvementForm.value.assetId, dto)
        .toPromise();
      const notes: string[] = result?.pendingActions || [];
      this.showToast(
        notes.length > 0
          ? `Mejora capitalizada. ${notes[0]}`
          : 'Mejora capitalizada correctamente',
        notes.length > 0 ? 'info' : 'success',
      );
      await this.loadAll();
      this.showImprovementModal.set(false);
    } catch (error) {
      this.showToast(this.getErrorMessage(error, 'Error al capitalizar la mejora'), 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ══════════════════════════════════════════════════════════
  // ── Traspaso entre dependencias ──
  // ══════════════════════════════════════════════════════════

  openTransferModal(asset?: FixedAsset) {
    this.closeMenus();
    this.loadCompanies();
    this.transferForm.reset({
      assetId: asset?.id || '',
      targetCompanyId: null,
      transferDate: new Date().toISOString().split('T')[0],
      reason: '',
      newLocation: '',
      newResponsiblePerson: '',
    });
    this.showTransferModal.set(true);
  }

  async transferSubmit() {
    if (this.transferForm.invalid) return;

    this.isLoading.set(true);
    try {
      const dto: TransferAssetDto = {
        targetCompanyId: +this.transferForm.value.targetCompanyId,
        transferDate: this.transferForm.value.transferDate,
        reason: this.transferForm.value.reason,
        newLocation: this.transferForm.value.newLocation || undefined,
        newResponsiblePerson: this.transferForm.value.newResponsiblePerson || undefined,
        assetAccountCode: this.transferForm.value.assetAccountCode || undefined,
        transferAccountCode: this.transferForm.value.transferAccountCode || undefined,
      };
      await this.fixedAssetsService
        .transferAsset(this.transferForm.value.assetId, dto)
        .toPromise();
      this.showToast('Traspaso registrado correctamente', 'success');
      await this.loadAll();
      this.showTransferModal.set(false);
    } catch (error) {
      this.showToast('Error al registrar el traspaso', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ══════════════════════════════════════════════════════════
  // ── Actas oficiales ──
  // ══════════════════════════════════════════════════════════

  async downloadActa(asset: FixedAsset, type: 'baja' | 'recepcion') {
    try {
      const blob = await this.fixedAssetsService.downloadActa(asset.id, type).toPromise();
      if (!blob) throw new Error('No se pudo generar el acta');

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acta-${type}-${asset.assetCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      this.showToast('Acta generada correctamente', 'success');
    } catch (error) {
      this.showToast('Error al generar el acta', 'error');
    }
  }

  getAcquisitionConceptLabel(concept?: string | null): string {
    return this.acquisitionConcepts.find(c => c.value === concept)?.label ?? 'Compra de AFT';
  }

  getDisposalConceptLabel(concept?: string | null): string {
    const legacy: Record<string, string> = {
      obsolescencia: 'Baja por obsolescencia',
      rotura: 'Baja por rotura',
      donacion: 'Baja por donación entregada',
    };
    return (
      this.disposalConcepts.find(c => c.value === concept)?.label ??
      legacy[concept || ''] ??
      'Baja de AFT'
    );
  }

  openDepreciationModal() {
    this.closeMenus();
    const currentDate = new Date();
    this.depreciationForm.patchValue({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    });
    this.showDepreciationModal.set(true);
  }

  async processDepreciationSubmit() {
    if (this.depreciationForm.invalid) return;

    this.isLoading.set(true);
    try {
      const { year, month } = this.depreciationForm.value;
      await this.fixedAssetsService.processDepreciation(year, month).toPromise();
      this.showToast(`Depreciación procesada para ${month}/${year}`, 'success');
      await this.loadAll();
      this.showDepreciationModal.set(false);
    } catch (error) {
      this.showToast('Error al procesar depreciación', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  async exportToExcel() {
    try {
      const blob = await this.fixedAssetsService.exportToExcel().toPromise();
      if (!blob) throw new Error('No se pudo generar el archivo');
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activos_fijos_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.showToast('Activos fijos exportados a Excel correctamente', 'success');
    } catch (error) {
      this.showToast('Error al exportar a Excel', 'error');
    }
  }

  async exportToPdf() {
    try {
      const blob = await this.fixedAssetsService.exportToPdf().toPromise();
      if (!blob) throw new Error('No se pudo generar el archivo');
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activos_fijos_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.showToast('Activos fijos exportados a PDF correctamente', 'success');
    } catch (error) {
      this.showToast('Error al exportar a PDF', 'error');
    }
  }

  getGroupName(groupNumber: number): string {
    return this.catalog().find(g => g.group_number === groupNumber)?.group_name ?? `Grupo ${groupNumber}`;
  }

  getDepreciationRate(asset: FixedAsset): string {
    return `${asset.depreciationRate}%`;
  }

  getMonthlyDepreciation(asset: FixedAsset): string {
    const monthlyDepreciation = (asset.acquisitionValue * asset.depreciationRate / 100) / 12;
    return monthlyDepreciation.toFixed(2);
  }

  getCurrentBookValue(asset: FixedAsset): string {
    return asset.currentValue.toFixed(2);
  }

  calculateCurrentValue(asset: FixedAsset): number {
    return asset.currentValue;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Activo',
      disposed: 'Dado de baja',
      transferred: 'Transferido',
      'fully_depreciated': 'Completamente depreciado',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      disposed: 'bg-red-100 text-red-800',
      transferred: 'bg-blue-100 text-blue-800',
      'fully_depreciated': 'bg-amber-100 text-amber-800',
    };
    return classes[status] || 'bg-slate-100 text-slate-800';
  }

  // ══════════════════════════════════════════════════════════
  // ── ÁREAS ──
  // ══════════════════════════════════════════════════════════

  openAreaModal() {
    this.showAreaModal.set(true);
  }

  closeAreaModal() {
    this.showAreaModal.set(false);
    this.closeAreaForm();
  }

  openAreaForm(area?: FixedAssetArea) {
    this.editingArea = area || null;
    if (area) {
      this.areaForm.patchValue({
        name: area.name,
        description: area.description || '',
        isActive: area.isActive,
      });
    } else {
      this.areaForm.reset({ name: '', description: '', isActive: true });
    }
    this.showAreaForm.set(true);
  }

  closeAreaForm() {
    this.showAreaForm.set(false);
    this.editingArea = null;
  }

  async onAreaSubmit() {
    if (this.areaForm.invalid) return;

    this.isLoading.set(true);
    try {
      const data = this.areaForm.value;
      if (this.editingArea) {
        await this.fixedAssetsService.updateArea(this.editingArea.id, data).toPromise();
        this.showToast('Área actualizada correctamente', 'success');
      } else {
        await this.fixedAssetsService.createArea(data).toPromise();
        this.showToast('Área creada correctamente', 'success');
      }
      await this.loadAreas();
      this.closeAreaForm();
    } catch (error) {
      this.showToast('Error al guardar el área', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteArea(area: FixedAssetArea) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar área',
      message: `¿Eliminar el área "${area.name}"?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await this.fixedAssetsService.deleteArea(area.id).toPromise();
      this.showToast('Área eliminada correctamente', 'success');
      await this.loadAreas();
    } catch (error) {
      this.showToast('Error al eliminar el área', 'error');
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
