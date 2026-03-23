import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompanyService } from '../../../core/services/company.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { Company, CreateCompanyDto, UpdateCompanyDto } from '../../../models/company.models';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-form.component.html'
})
export class CompanyFormComponent implements OnInit, OnDestroy {
  private companyService = inject(CompanyService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = signal(false);
  isEdit = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form data
  formData = signal<CreateCompanyDto>({
    name: '',
    tax_id: '',
    address: '',
    phone: '',
    email: '',
    logo_path: '',
  });

  companyId = signal<string | null>(null);
  errorMessage = signal('');

  private routeSub!: Subscription;
  private toastSub!: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe((params: Params) => {
      const id = params['id'];
      if (id) {
        this.companyId.set(id);
        this.isEdit.set(true);
        this.loadCompany(id);
      }
    });

    this.toastSub = this.notificationService.toasts$.subscribe(t => {
      this.toast.set(t);
      setTimeout(() => this.toast.set(null), 4000);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }

  get isMultiCompany(): boolean {
    return this.authService.isMultiCompany();
  }

  loadCompany(id: string): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    
    this.companyService.getCompany(Number(id)).subscribe({
      next: (company: Company) => {
        this.formData.set({
          name: company.name,
          tax_id: company.tax_id ?? '',
          address: company.address ?? '',
          phone: company.phone ?? '',
          email: company.email ?? '',
          logo_path: company.logo_path ?? '',
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.errorMessage.set('Error al cargar la empresa');
        this.showToast('Error al cargar la empresa', 'error');
      }
    });
  }

  onSubmit(): void {
    this.errorMessage.set('');
    
    // Validaciones
    if (!this.formData().name?.trim()) {
      this.errorMessage.set('El nombre de la empresa es obligatorio');
      return;
    }

    this.isLoading.set(true);

    if (this.isEdit()) {
      this.updateCompany();
    } else {
      this.createCompany();
    }
  }

  createCompany(): void {
    const data = this.formData();
    
    this.companyService.createCompany(data).subscribe({
      next: () => {
        this.showToast('Empresa creada exitosamente', 'success');
        this.router.navigate(['/settings/companies']);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al crear la empresa');
        this.showToast('Error al crear la empresa', 'error');
      }
    });
  }

  updateCompany(): void {
    const data = this.formData() as UpdateCompanyDto;
    const id = Number(this.companyId()!);
    
    this.companyService.updateCompany(id, data).subscribe({
      next: () => {
        this.showToast('Empresa actualizada exitosamente', 'success');
        this.router.navigate(['/settings/companies']);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al actualizar la empresa');
        this.showToast('Error al actualizar la empresa', 'error');
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/settings/companies']);
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
