import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContextService } from '../../../core/services/context.service';
import { AuthService } from '../../../core/services/auth.service';
import { Company } from '../../../core/models/company.model';

@Component({
  selector: 'app-company-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <button
        (click)="toggleDropdown()"
        class="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span class="text-sm font-medium text-gray-700">
          {{ currentCompany()?.name || 'Seleccionar Empresa' }}
        </span>
        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      @if (showDropdown()) {
        <div class="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div class="p-3 border-b border-gray-200">
            <h3 class="text-sm font-medium text-gray-900">Cambiar Empresa</h3>
            <p class="text-xs text-gray-500 mt-1">Selecciona una empresa para trabajar</p>
          </div>
          
          <div class="max-h-60 overflow-y-auto">
            @for (company of availableCompanies(); track company.id) {
              <button
                (click)="selectCompany(company)"
                [class]="company.id === currentCompany()?.id ? 'bg-indigo-50 text-indigo-900' : 'text-gray-700 hover:bg-gray-50'"
                class="w-full px-4 py-3 text-left text-sm flex items-center justify-between"
              >
                <div>
                  <div class="font-medium">{{ company.name }}</div>
                  <div class="text-xs text-gray-500">{{ company.taxId }}</div>
                </div>
                @if (company.id === currentCompany()?.id) {
                  <svg class="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                }
              </button>
            }
          </div>

          @if (availableCompanies().length === 0) {
            <div class="p-4 text-center text-sm text-gray-500">
              No hay empresas disponibles
            </div>
          }

          <div class="p-3 border-t border-gray-200">
            <button
              (click)="goToCompanyManagement()"
              class="w-full px-3 py-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Administrar Empresas
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class CompanySwitcherComponent implements OnInit {
  private contextService = inject(ContextService);
  private authService = inject(AuthService);

  showDropdown = signal(false);
  availableCompanies = signal<Company[]>([]);
  currentCompany = this.contextService.currentCompany;

  ngOnInit() {
    this.loadAvailableCompanies();
    
    // Close dropdown when clicking outside
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }

  private handleClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.showDropdown.set(false);
    }
  }

  toggleDropdown() {
    this.showDropdown.set(!this.showDropdown());
  }

  async loadAvailableCompanies() {
    try {
      // Get companies from user data or API
      const user = this.authService.currentUser();
      if (user?.companies && user.companies.length > 0) {
        this.availableCompanies.set(user.companies);
      } else {
        // Fallback: fetch from API if not available in user object
        const companies = await this.authService.getUserCompanies();
        this.availableCompanies.set(companies);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      this.availableCompanies.set([]);
    }
  }

  selectCompany(company: Company) {
    this.contextService.switchCompany(company);
    this.showDropdown.set(false);
    
    // Optional: reload page or navigate to dashboard to refresh data
    window.location.href = '/dashboard';
  }

  goToCompanyManagement() {
    this.showDropdown.set(false);
    // Navigate to company management or settings
    window.location.href = '/settings';
  }

  // Computed property to check if user has multiple companies
  hasMultipleCompanies = computed(() => {
    return this.availableCompanies().length > 1;
  });
}
