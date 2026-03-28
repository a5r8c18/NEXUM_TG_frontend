import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersService, User, CreateUserRequest, UpdateUserRequest } from '../../core/services/users.service';
import { ContextService } from '../../core/services/context.service';
import { NotificationService } from '../../core/services/notification.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    PaginationComponent,
  ],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  users = signal<User[]>([]);
  loading = signal(false);
  showCreateModal = signal(false);
  showEditModal = signal(false);
  selectedUser = signal<User | null>(null);
  searchTerm = signal('');
  toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  
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

  constructor(
    private usersService: UsersService,
    private contextService: ContextService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
  ) {
    this.userForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
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
      password: '',
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
      password: '',
      role: user.role,
    });
    this.showEditModal.set(true);
  }

  closeModals() {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
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
      next: () => {
        this.notificationService.showSuccess('Usuario creado exitosamente');
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

    // Solo incluir contraseña si se proporcionó una nueva
    if (this.userForm.value.password) {
      updateData.password = this.userForm.value.password;
    }

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

  deleteUser(user: User) {
    if (confirm(`¿Está seguro de eliminar al usuario ${user.firstName} ${user.lastName}?`)) {
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
    const newPassword = prompt('Ingrese la nueva contraseña:');
    if (newPassword) {
      this.loading.set(true);
      this.usersService.changePassword(user.id, newPassword).subscribe({
        next: () => {
          this.notificationService.showSuccess('Contraseña cambiada exitosamente');
          this.loading.set(false);
        },
        error: (error) => {
          this.notificationService.showError('Error cambiando contraseña: ' + error.message);
          this.loading.set(false);
        },
      });
    }
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
}