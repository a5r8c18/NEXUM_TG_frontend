import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersService, User, CreateUserRequest, UpdateUserRequest, UserCompany, AssignCompaniesRequest } from '../../core/services/users.service';
import { CompanyService } from '../../core/services/company.service';
import { ContextService } from '../../core/services/context.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaginationComponent,
  ],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  users = signal<User[]>([]);
  loading = signal(false);
  showCreateModal = signal(false);
  showEditModal = signal(false);
  showPasswordModal = signal(false);
  showAssignCompaniesModal = signal(false);
  selectedUser = signal<User | null>(null);
  searchTerm = signal('');
  newPassword = signal('');
  toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Companies assignment
  availableCompanies = signal<any[]>([]);
  userCompanies = signal<UserCompany[]>([]);
  selectedCompanyIds = signal<number[]>([]);
  selectedRole = signal('user');
  loadingCompanies = signal(false);
  assigning = signal(false);
  
  userForm: FormGroup;
  currentPage = signal(1);
  itemsPerPage = signal(10);
  
  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.users();
    
    return this.users().filter((user: User) => 
      user.firstName.toLowerCase().includes(term) ||
      user.lastName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term)
    );
  });
  
  totalPages = computed(() => {
    return Math.ceil(this.filteredUsers().length / this.itemsPerPage());
  });

  private usersService = inject(UsersService);
  private companyService = inject(CompanyService);
  private contextService = inject(ContextService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private confirmDialog = inject(ConfirmDialogService);

  constructor() {
    this.userForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', Validators.required],
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    const currentCompany = this.contextService.currentCompany();
    if (!currentCompany) {
      this.notificationService.showError('No hay una compañía seleccionada');
      return;
    }

    this.loading.set(true);
    this.usersService.getUsersByCompany(Number(currentCompany.id)).subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error) => {
        this.notificationService.showError('Error cargando usuarios: ' + error.message);
        this.loading.set(false);
      },
    });
  }

  openCreateModal() {
    this.userForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      role: 'user',
    });
    this.showCreateModal.set(true);
  }

  openEditModal(user: User) {
    this.selectedUser.set(user);
    this.userForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
    this.showEditModal.set(true);
  }

  closeModals() {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.showAssignCompaniesModal.set(false);
    this.selectedUser.set(null);
    this.userForm.reset();
  }

  createUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const currentCompany = this.contextService.currentCompany();
    if (!currentCompany) {
      this.notificationService.showError('No hay una compañía seleccionada');
      return;
    }

    const userData: CreateUserRequest = {
      ...this.userForm.value,
      companyId: Number(currentCompany.id),
    };

    this.loading.set(true);
    this.usersService.createUser(userData).subscribe({
      next: (response) => {
        this.notificationService.showSuccess('Usuario creado exitosamente');
        
        // Mostrar token de configuración si viene en la respuesta
        if (response && response.setupToken) {
          console.log('=== TOKEN DE CONFIGURACIÓN PARA USUARIO CREADO ===');
          console.log('Usuario:', response.user.email);
          console.log('Empresa:', response.user.company?.name || 'Empresa asignada');
          console.log('Token:', response.setupToken);
          console.log('URL:', response.setupUrl);
          console.log('================================================');
          
          // También mostrar en una notificación más duradera
          this.notificationService.showInfo(
            `Token generado para ${response.user.email}. Revisa la consola para obtener la URL de configuración.`
          );
        }
        
        this.closeModals();
        this.loadUsers();
        this.loading.set(false);
      },
      error: (error) => {
        this.notificationService.showError('Error creando usuario: ' + error.message);
        this.loading.set(false);
      },
    });
  }

  updateUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const user = this.selectedUser();
    if (!user) return;

    const updateData: UpdateUserRequest = {
      firstName: this.userForm.value.firstName,
      lastName: this.userForm.value.lastName,
      email: this.userForm.value.email,
      role: this.userForm.value.role,
    };

    this.loading.set(true);
    this.usersService.updateUser(user.id, updateData).subscribe({
      next: () => {
        this.notificationService.showSuccess('Usuario actualizado exitosamente');
        this.closeModals();
        this.loadUsers();
        this.loading.set(false);
      },
      error: (error) => {
        this.notificationService.showError('Error actualizando usuario: ' + error.message);
        this.loading.set(false);
      },
    });
  }

  async deleteUser(user: User) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar usuario',
      message: `¿Está seguro de eliminar al usuario ${user.firstName} ${user.lastName}?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;
    this.loading.set(true);
    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Usuario eliminado exitosamente');
        this.loadUsers();
        this.loading.set(false);
      },
      error: (error) => {
        this.notificationService.showError('Error eliminando usuario: ' + error.message);
        this.loading.set(false);
      },
    });
  }

  reactivateUser(user: User) {
    this.loading.set(true);
    this.usersService.reactivateUser(user.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Usuario reactivado exitosamente');
        this.loadUsers();
        this.loading.set(false);
      },
      error: (error) => {
        this.notificationService.showError('Error reactivando usuario: ' + error.message);
        this.loading.set(false);
      },
    });
  }

  changePassword(user: User) {
    this.selectedUser.set(user);
    this.newPassword.set('');
    this.showPasswordModal.set(true);
  }

  updatePassword() {
    const user = this.selectedUser();
    const password = this.newPassword();
    
    if (!user || !password) return;
    
    this.loading.set(true);
    this.usersService.changePassword(user.id, password).subscribe({
      next: () => {
        this.notificationService.showSuccess('Contraseña cambiada exitosamente');
        this.closePasswordModal();
        this.loading.set(false);
      },
      error: (error) => {
        this.notificationService.showError('Error cambiando contraseña: ' + error.message);
        this.loading.set(false);
      },
    });
  }

  closePasswordModal() {
    this.showPasswordModal.set(false);
    this.selectedUser.set(null);
    this.newPassword.set('');
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  getRoleLabel(role: string): string {
    const roleMap: { [key: string]: string } = {
      admin: 'Administrador',
      user: 'Usuario',
    };
    return roleMap[role] || role;
  }

  getTenantTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      MULTI_COMPANY: 'Multiempresa',
      SINGLE_COMPANY: 'Empresa Individual',
    };
    return typeMap[type] || type;
  }

  // Companies assignment methods
  openAssignCompaniesModal(user: User) {
    this.selectedUser.set(user);
    this.selectedCompanyIds.set([]);
    this.selectedRole.set('user');
    this.showAssignCompaniesModal.set(true);
    this.loadCompaniesData();
  }

  loadCompaniesData() {
    this.loadingCompanies.set(true);
    
    // Load all available companies
    this.companyService.getCompanies().subscribe({
      next: (companies) => {
        this.availableCompanies.set(companies);
        
        // Load user's current company assignments
        const user = this.selectedUser();
        if (user) {
          this.usersService.getUserCompanies(user.id).subscribe({
            next: (userCompanies) => {
              this.userCompanies.set(userCompanies);
              const assignedIds = userCompanies.map(uc => uc.companyId);
              this.selectedCompanyIds.set(assignedIds);
              this.loadingCompanies.set(false);
            },
            error: (error) => {
              console.error('Error loading user companies:', error);
              this.loadingCompanies.set(false);
            }
          });
        } else {
          this.loadingCompanies.set(false);
        }
      },
      error: (error) => {
        this.notificationService.showError('Error cargando empresas: ' + error.message);
        this.loadingCompanies.set(false);
      }
    });
  }

  isCompanySelected(companyId: number): boolean {
    return this.selectedCompanyIds().includes(companyId);
  }

  toggleCompanySelection(companyId: number) {
    const currentIds = this.selectedCompanyIds();
    if (currentIds.includes(companyId)) {
      this.selectedCompanyIds.set(currentIds.filter(id => id !== companyId));
    } else {
      this.selectedCompanyIds.set([...currentIds, companyId]);
    }
  }

  getCompanyName(companyId: number): string {
    const company = this.availableCompanies().find(c => c.id === companyId);
    return company ? company.name : `Empresa ${companyId}`;
  }

  assignCompanies() {
    const user = this.selectedUser();
    if (!user || this.selectedCompanyIds().length === 0) return;

    const request: AssignCompaniesRequest = {
      companyIds: this.selectedCompanyIds(),
      role: this.selectedRole()
    };

    this.assigning.set(true);
    this.usersService.assignCompaniesToUser(user.id, request).subscribe({
      next: (result) => {
        this.notificationService.showSuccess(`Empresas asignadas exitosamente a ${user.firstName} ${user.lastName}`);
        this.closeModals();
        this.assigning.set(false);
      },
      error: (error) => {
        this.notificationService.showError('Error asignando empresas: ' + error.message);
        this.assigning.set(false);
      }
    });
  }
}