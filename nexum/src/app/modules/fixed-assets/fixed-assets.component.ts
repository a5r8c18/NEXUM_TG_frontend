import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { 
  FixedAssetsService, 
  FixedAsset, 
  CreateFixedAssetDto, 
  UpdateFixedAssetDto, 
  DepreciationGroup 
} from '../../core/services/fixed-assets.service';
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
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private confirmDialog = inject(ConfirmDialogService);
  private offlineFirst = inject(OfflineFirstService);
  private networkStatus = inject(NetworkStatusService);

  // Signals
  assets = signal<FixedAsset[]>([]);
  catalog = signal<DepreciationGroup[]>([]);
  isLoading = signal(false);
  showForm = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form
  form!: FormGroup;
  editingAsset: FixedAsset | null = null;

  // Computed
  selectedGroup = computed(() => {
    const groupNumber = this.form?.get('group_number')?.value;
    return this.catalog().find(g => g.group_number === groupNumber) ?? null;
  });

  totalAcquisitionValue = computed(() => 
    this.assets().reduce((sum, asset) => sum + asset.acquisition_value, 0)
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
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  buildForm() {
    this.form = this.fb.group({
      asset_code: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      group_number: [null, Validators.required],
      subgroup: ['', Validators.required],
      subgroup_detail: [''],
      acquisition_value: [null, [Validators.required, Validators.min(0.01)]],
      acquisition_date: ['', Validators.required],
      location: [''],
      responsible_person: [''],
    });

    this.form.get('group_number')?.valueChanges.subscribe(() => {
      this.form.patchValue({ subgroup: '' });
      this.updateFormControlsState();
    });
  }

  updateFormControlsState() {
    const isEditing = !!this.editingAsset;
    const isGroupSelected = !!this.selectedGroup();

    if (isEditing) {
      this.form.get('group_number')?.disable();
      this.form.get('subgroup')?.disable();
    } else {
      this.form.get('group_number')?.enable();
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

  openCreate() {
    this.editingAsset = null;
    this.form.reset();
    this.updateFormControlsState();
    this.showForm.set(true);
  }

  openEdit(asset: FixedAsset) {
    this.editingAsset = asset;
    this.form.patchValue({
      asset_code: asset.asset_code,
      name: asset.name,
      description: asset.description ?? '',
      group_number: asset.group_number,
      subgroup: asset.subgroup,
      subgroup_detail: asset.subgroup_detail ?? '',
      acquisition_value: asset.acquisition_value,
      acquisition_date: asset.acquisition_date.substring(0, 10),
      location: asset.location ?? '',
      responsible_person: asset.responsible_person ?? '',
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
          responsible_person: this.form.value.responsible_person || undefined,
        };
        await this.fixedAssetsService.updateFixedAsset(this.editingAsset.id, dto).toPromise();
        this.showToast('Activo actualizado correctamente', 'success');
      } else {
        const dto: CreateFixedAssetDto = {
          asset_code: this.form.value.asset_code,
          name: this.form.value.name,
          description: this.form.value.description || undefined,
          group_number: +this.form.value.group_number,
          subgroup: this.form.value.subgroup,
          subgroup_detail: this.form.value.subgroup_detail || undefined,
          acquisition_value: +this.form.value.acquisition_value,
          acquisition_date: this.form.value.acquisition_date,
          location: this.form.value.location || undefined,
          responsible_person: this.form.value.responsible_person || undefined,
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
    return `${asset.depreciation_rate}%`;
  }

  getMonthlyDepreciation(asset: FixedAsset): string {
    const monthlyDepreciation = (asset.acquisition_value * asset.depreciation_rate / 100) / 12;
    return monthlyDepreciation.toFixed(2);
  }

  getCurrentBookValue(asset: FixedAsset): string {
    return asset.current_value.toFixed(2);
  }

  calculateCurrentValue(asset: FixedAsset): number {
    const acquisitionDate = new Date(asset.acquisition_date);
    const currentDate = new Date();
    
    if (currentDate <= acquisitionDate) {
      return asset.acquisition_value;
    }
    
    const monthsElapsed = this.getMonthsBetween(acquisitionDate, currentDate);
    const monthlyDepreciation = (asset.acquisition_value * asset.depreciation_rate / 100) / 12;
    const totalDepreciation = monthlyDepreciation * monthsElapsed;
    
    return Math.max(0, asset.acquisition_value - totalDepreciation);
  }

  private getMonthsBetween(startDate: Date, endDate: Date): number {
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const totalMonths = years * 12 + months;
    return Math.max(0, totalMonths);
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { 
      active: 'Activo', 
      disposed: 'Dado de baja', 
      transferred: 'Transferido' 
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      disposed: 'bg-red-100 text-red-800',
      transferred: 'bg-yellow-100 text-yellow-800',
    };
    return map[status] ?? 'bg-gray-100 text-gray-800';
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
