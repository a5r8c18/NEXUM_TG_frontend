import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { HrService, Employee, Department } from '../../../core/services/hr.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { OfflineFirstService } from '../../../core/offline/offline-first.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './employees.component.html'
})
export class EmployeesComponent implements OnInit {
  private hrService = inject(HrService);
  private confirmDialog = inject(ConfirmDialogService);
  private offlineFirst = inject(OfflineFirstService);

  employees = signal<Employee[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  currentPage = signal(1);
  pageSize = 10;
  searchTerm = signal('');
  statusFilter = signal('');
  contractFilter = signal('');
  isCreateOpen = signal(false);
  isSaving = signal(false);
  editingId = signal<string | null>(null);
  departments = signal<Department[]>([]);

  form: Partial<Employee> = this.emptyForm();

  private emptyForm(): Partial<Employee> {
    return {
      employeeCode: '',
      firstName: '',
      lastName: '',
      email: null,
      phone: null,
      position: null,
      departmentId: null,
      hireDate: null,
      salary: 0,
      contractType: 'full_time',
      status: 'active',
      documentId: null,
      address: null,
    };
  }

  filteredEmployees = computed(() => {
    let filtered = this.employees();
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(e =>
        e.firstName.toLowerCase().includes(term) ||
        e.lastName.toLowerCase().includes(term) ||
        e.employeeCode.toLowerCase().includes(term) ||
        (e.position || '').toLowerCase().includes(term)
      );
    }
    if (this.statusFilter()) {
      filtered = filtered.filter(e => e.status === this.statusFilter());
    }
    if (this.contractFilter()) {
      filtered = filtered.filter(e => e.contractType === this.contractFilter());
    }
    return filtered;
  });

  pagedEmployees = computed(() => {
    const filtered = this.filteredEmployees();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredEmployees().length,
    itemsPerPage: this.pageSize,
    totalPages: Math.ceil(this.filteredEmployees().length / this.pageSize)
  }));

  ngOnInit() {
    this.loadEmployees();
    this.loadDepartments();
  }

  loadDepartments() {
    this.hrService.getDepartments().subscribe({
      next: (data) => this.departments.set(data),
      error: () => { /* departamentos opcionales */ }
    });
  }

  loadEmployees() {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.offlineFirst.getEmployees().subscribe({
      next: (data) => { this.employees.set(data); this.isLoading.set(false); },
      error: () => { this.hasError.set(true); this.isLoading.set(false); }
    });
  }

  applyFilters() { this.currentPage.set(1); }
  resetFilters() { this.searchTerm.set(''); this.statusFilter.set(''); this.contractFilter.set(''); this.currentPage.set(1); }
  onPageChange(page: number) { this.currentPage.set(page); }
  openCreate() {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.isCreateOpen.set(true);
  }

  openEdit(emp: Employee) {
    this.editingId.set(emp.id);
    this.form = {
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      position: emp.position,
      departmentId: emp.departmentId,
      hireDate: emp.hireDate,
      salary: emp.salary,
      contractType: emp.contractType,
      status: emp.status,
      documentId: emp.documentId,
      address: emp.address,
    };
    this.isCreateOpen.set(true);
  }

  closeCreate() { this.isCreateOpen.set(false); }

  saveEmployee() {
    if (!this.form.firstName?.trim() || !this.form.lastName?.trim()) {
      this.showToast('Nombre y apellidos son obligatorios', 'error');
      return;
    }
    if (this.form.departmentId) {
      const dept = this.departments().find(d => d.id === this.form.departmentId);
      this.form.departmentName = dept ? dept.name : null;
    } else {
      this.form.departmentName = null;
    }
    this.isSaving.set(true);
    const id = this.editingId();
    const request$ = id
      ? this.hrService.updateEmployee(id, this.form)
      : this.hrService.createEmployee(this.form);
    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast(id ? 'Empleado actualizado' : 'Empleado registrado', 'success');
        this.closeCreate();
        this.loadEmployees();
      },
      error: () => {
        this.isSaving.set(false);
        this.showToast('Error al guardar el empleado', 'error');
      }
    });
  }

  async deleteEmployee(emp: Employee) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar empleado',
      message: `¿Eliminar empleado ${emp.firstName} ${emp.lastName}?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;
    this.hrService.deleteEmployee(emp.id).subscribe({
      next: () => { this.showToast('Empleado eliminado', 'success'); this.loadEmployees(); },
      error: () => this.showToast('Error al eliminar', 'error')
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-slate-100 text-slate-800';
      case 'on_leave': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'on_leave': return 'De baja';
      default: return status;
    }
  }

  getContractLabel(type: string): string {
    switch (type) {
      case 'full_time': return 'Tiempo completo';
      case 'part_time': return 'Medio tiempo';
      case 'contractor': return 'Contratista';
      case 'intern': return 'Pasante';
      default: return type;
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
