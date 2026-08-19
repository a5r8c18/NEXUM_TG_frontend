import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FixedAssetsService } from '../../../../core/services/fixed-assets.service';
import { FixedAssetArea } from '../../../../models/fixed-assets.models';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NetworkStatusService } from '../../../../core/services/network-status.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-areas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './areas.component.html'
})
export class AreasComponent implements OnInit {
  private fixedAssetsService = inject(FixedAssetsService);
  private confirmDialog = inject(ConfirmDialogService);
  private networkStatus = inject(NetworkStatusService);
  private fb = inject(FormBuilder);

  areas = signal<FixedAssetArea[]>([]);
  isLoading = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  showForm = signal(false);
  editingArea: FixedAssetArea | null = null;
  areaForm!: FormGroup;

  ngOnInit() {
    this.buildForm();
    this.loadAreas();
  }

  buildForm() {
    this.areaForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true],
    });
  }

  loadAreas() {
    this.isLoading.set(true);
    if (this.networkStatus.isOnline()) {
      this.fixedAssetsService.getAreas().toPromise().then(areas => {
        this.areas.set(areas || []);
      }).catch(() => {
        this.showToast('Error al cargar las áreas', 'error');
      }).finally(() => this.isLoading.set(false));
    } else {
      this.showToast('Sin conexión. No se pueden cargar las áreas.', 'info');
      this.isLoading.set(false);
    }
  }

  openForm(area?: FixedAssetArea) {
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
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingArea = null;
  }

  async onSubmit() {
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
      this.closeForm();
    } catch (error: any) {
      const message = error?.error?.message || 'Error al guardar el área';
      this.showToast(message, 'error');
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

    this.isLoading.set(true);
    try {
      await this.fixedAssetsService.deleteArea(area.id).toPromise();
      this.showToast('Área eliminada correctamente', 'success');
      await this.loadAreas();
    } catch (error: any) {
      const message = error?.error?.message || 'Error al eliminar el área';
      this.showToast(message, 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
