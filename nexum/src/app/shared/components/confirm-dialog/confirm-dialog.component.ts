import { Component, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (dialogService.isOpen()) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          (click)="onCancel()"
        ></div>

        <!-- Dialog -->
        <div class="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <!-- Color bar top -->
          <div [class]="topBarClass" class="h-1"></div>

          <div class="p-6">
            <!-- Icon + Title -->
            <div class="flex items-start gap-4 mb-4">
              <div [class]="iconBgClass" class="p-2.5 rounded-xl flex-shrink-0">
                @switch (config.type) {
                  @case ('danger') {
                    <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  }
                  @case ('warning') {
                    <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                  }
                  @case ('info') {
                    <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  }
                  @case ('success') {
                    <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  }
                }
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-semibold text-slate-900">{{ config.title }}</h3>
                <p class="text-sm text-slate-600 mt-1 whitespace-pre-line">{{ config.message }}</p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              @if (config.cancelText) {
                <button
                  (click)="onCancel()"
                  class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {{ config.cancelText }}
                </button>
              }
              <button
                (click)="onConfirm()"
                [class]="confirmBtnClass"
                class="px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                {{ config.confirmText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmDialogComponent {
  dialogService = inject(ConfirmDialogService);

  get config() {
    return this.dialogService.config();
  }

  get topBarClass(): string {
    switch (this.config.type) {
      case 'danger': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      case 'info': return 'bg-blue-500';
      case 'success': return 'bg-emerald-500';
    }
  }

  get iconBgClass(): string {
    switch (this.config.type) {
      case 'danger': return 'bg-red-50';
      case 'warning': return 'bg-amber-50';
      case 'info': return 'bg-blue-50';
      case 'success': return 'bg-emerald-50';
    }
  }

  get confirmBtnClass(): string {
    switch (this.config.type) {
      case 'danger': return 'bg-red-600 hover:bg-red-700';
      case 'warning': return 'bg-amber-600 hover:bg-amber-700';
      case 'info': return 'bg-blue-600 hover:bg-blue-700';
      case 'success': return 'bg-emerald-600 hover:bg-emerald-700';
    }
  }

  onConfirm(): void {
    this.dialogService.accept();
  }

  onCancel(): void {
    this.dialogService.cancel();
  }
}
