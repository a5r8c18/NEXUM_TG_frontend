import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { 
  FixedAssetsService, 
  FixedAsset, 
  CreateFixedAssetDto, 
  UpdateFixedAssetDto, 
  DepreciationGroup,
  DisposeAssetDto
} from '../../core/services/fixed-assets.service';
import { HrService, Employee } from '../../core/services/hr.service';
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
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private confirmDialog = inject(ConfirmDialogService);
  private offlineFirst = inject(OfflineFirstService);
  private networkStatus = inject(NetworkStatusService);

  // Signals
  assets = signal<FixedAsset[]>([]);
  employees = signal<Employee[]>([]);
  catalog = signal<DepreciationGroup[]>([]);
  isLoading = signal(false);
  showForm = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form
  form!: FormGroup;
  editingAsset: FixedAsset | null = null;
  showDisposeModal = signal(false);
  disposeAsset: FixedAsset | null = null;
  disposeForm!: FormGroup;
  showDepreciationModal = signal(false);
  depreciationForm!: FormGroup;

  // Computed
  selectedGroup = computed(() => {
    const groupNumber = this.form?.get('groupNumber')?.value;
    return this.catalog().find(g => g.group_number === groupNumber) ?? null;
  });

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
    this.buildForm();
    this.loadAll();
    this.loadEmployees();
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
      employeeId: [''],
      responsiblePerson: [''],
    });

    this.buildDisposeForm();
    this.buildDepreciationForm();

    this.form.get('groupNumber')?.valueChanges.subscribe(() => {
      this.form.patchValue({ subgroup: '' });
      this.updateFormControlsState();
    });
  }

  buildDisposeForm() {
    this.disposeForm = this.fb.group({
      reason: ['', Validators.required],
      disposalType: ['deterioro', Validators.required],
      disposalDate: [''],
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

  openCreate() {
    this.editingAsset = null;
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
      employeeId: asset.employeeId ?? '',
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
          location: this.form.value.location || undefined,
          employeeId: this.form.value.employeeId || undefined,
          responsiblePerson: this.form.value.responsiblePerson || undefined,
        };
        await this.fixedAssetsService.createFixedAsset(dto).toPromise();
        this.showToast('Activo creado correctamente', 'success');
      }
      await this.loadAll();
      this.showForm.set(false);
    } catch (error) {
      this.showToast('Error al guardar activo', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteAsset(asset: FixedAsset) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar activo fijo',
      message: `¿Eliminar el activo "${asset.name}"?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await this.fixedAssetsService.deleteFixedAsset(asset.id).toPromise();
      this.showToast('Activo eliminado correctamente', 'success');
      await this.loadAll();
    } catch (error) {
      this.showToast('Error al eliminar activo', 'error');
    }
  }

  openDispose(asset: FixedAsset) {
    this.disposeAsset = asset;
    this.disposeForm.reset({
      reason: '',
      disposalType: 'deterioro',
      disposalDate: new Date().toISOString().split('T')[0],
    });
    this.showDisposeModal.set(true);
  }

  async disposeSubmit() {
    if (!this.disposeAsset || this.disposeForm.invalid) return;

    this.isLoading.set(true);
    try {
      const dto: DisposeAssetDto = {
        reason: this.disposeForm.value.reason,
        disposalType: this.disposeForm.value.disposalType,
        disposalDate: this.disposeForm.value.disposalDate,
      };
      await this.fixedAssetsService.disposeAsset(this.disposeAsset.id, dto).toPromise();
      this.showToast('Activo dado de baja correctamente', 'success');
      await this.loadAll();
      this.showDisposeModal.set(false);
      this.disposeAsset = null;
    } catch (error) {
      this.showToast('Error al dar de baja activo', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  openDepreciationModal() {
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

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
