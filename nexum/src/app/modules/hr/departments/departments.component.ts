import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { HrService, Department } from '../../../core/services/hr.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <div class="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">

      <!-- Toast -->
      @if (toast()) {
        <div class="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border"
             [class.bg-green-50]="toast()!.type === 'success'"
             [class.text-green-800]="toast()!.type === 'success'"
             [class.border-green-200]="toast()!.type === 'success'"
             [class.bg-red-50]="toast()!.type === 'error'"
             [class.text-red-800]="toast()!.type === 'error'"
             [class.border-red-200]="toast()!.type === 'error'">
          {{ toast()!.message }}
        </div>
      }

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-violet-100 rounded-xl">
            <svg class="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-slate-800">Departamentos</h2>
            <p class="text-xs text-slate-500">Estructura organizativa de la empresa</p>
          </div>
        </div>
        <button (click)="openCreate()"
           class="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo Departamento
        </button>
      </div>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="flex items-center justify-center py-20 text-slate-500">
          <svg class="w-8 h-8 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
      }

      <!-- Grid -->
      @if (!isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (dept of departments(); track dept.id) {
            <div class="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/50 p-5 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-base font-semibold text-slate-800">{{ dept.name }}</h3>
                  @if (dept.description) {
                    <p class="text-xs text-slate-500 mt-1">{{ dept.description }}</p>
                  }
                </div>
                <div class="flex gap-1">
                  <button (click)="openEdit(dept)"
                          class="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Editar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button (click)="deleteDepartment(dept)"
                          class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="mt-4 flex items-center gap-4 text-xs text-slate-500">
                <span class="inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                  {{ dept.employeeCount || 0 }} empleados
                </span>
                @if (dept.managerName) {
                  <span>Responsable: {{ dept.managerName }}</span>
                }
              </div>
            </div>
          }
          @empty {
            <div class="col-span-full bg-white/80 rounded-xl border border-slate-200/50 py-16 text-center text-slate-400">
              <p class="text-sm font-medium">No hay departamentos registrados</p>
              <p class="text-xs">Crea el primer departamento para organizar tu personal</p>
            </div>
          }
        </div>
      }

      <!-- Modal Crear / Editar -->
      @if (isModalOpen()) {
        <app-modal [isOpen]="isModalOpen()" (closeEvent)="closeModal()" (confirmEvent)="save()"
                   [title]="editingId() ? 'Editar Departamento' : 'Nuevo Departamento'"
                   [confirmText]="isSaving() ? 'Guardando...' : (editingId() ? 'Guardar cambios' : 'Crear')"
                   confirmButtonClass="bg-violet-600 hover:bg-violet-700"
                   maxWidthClass="max-w-lg">
          <div class="space-y-4">
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Nombre <span class="text-red-500">*</span></label>
              <input type="text" [(ngModel)]="form.name"
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"/>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Descripción</label>
              <textarea rows="3" [(ngModel)]="form.description"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"></textarea>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Responsable</label>
              <input type="text" [(ngModel)]="form.managerName"
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"/>
            </div>
          </div>
        </app-modal>
      }

    </div>
  `,
})
export class DepartmentsComponent implements OnInit {
  private hrService = inject(HrService);
  private confirmDialog = inject(ConfirmDialogService);

  departments = signal<Department[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  isModalOpen = signal(false);
  editingId = signal<string | null>(null);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  form: Partial<Department> = this.emptyForm();

  private emptyForm(): Partial<Department> {
    return { name: '', description: null, managerName: null };
  }

  ngOnInit() { this.load(); }

  load() {
    this.isLoading.set(true);
    this.hrService.getDepartments().subscribe({
      next: (data) => { this.departments.set(data); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.showToast('Error al cargar departamentos', 'error'); }
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.isModalOpen.set(true);
  }

  openEdit(dept: Department) {
    this.editingId.set(dept.id);
    this.form = { name: dept.name, description: dept.description, managerName: dept.managerName };
    this.isModalOpen.set(true);
  }

  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.name?.trim()) {
      this.showToast('El nombre es obligatorio', 'error');
      return;
    }
    this.isSaving.set(true);
    const id = this.editingId();
    const request$ = id
      ? this.hrService.updateDepartment(id, this.form)
      : this.hrService.createDepartment(this.form);
    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast(id ? 'Departamento actualizado' : 'Departamento creado', 'success');
        this.closeModal();
        this.load();
      },
      error: () => {
        this.isSaving.set(false);
        this.showToast('Error al guardar el departamento', 'error');
      }
    });
  }

  async deleteDepartment(dept: Department) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar departamento',
      message: `¿Eliminar el departamento ${dept.name}?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;
    this.hrService.deleteDepartment(dept.id).subscribe({
      next: () => { this.showToast('Departamento eliminado', 'success'); this.load(); },
      error: () => this.showToast('Error al eliminar', 'error')
    });
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
