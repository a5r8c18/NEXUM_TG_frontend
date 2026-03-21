import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        (click)="onClose()"
      ></div>

      <!-- Panel -->
      <div
        [ngClass]="maxWidthClass"
        class="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 mb-5">
          @if (iconBgClass) {
            <div [ngClass]="iconBgClass" class="p-2.5 rounded-xl flex-shrink-0">
              <span [ngClass]="iconClass" class="text-xl">{{ iconEmoji }}</span>
            </div>
          }
          <h3 class="text-lg font-semibold text-slate-800">{{ title }}</h3>
          <button
            (click)="onClose()"
            class="ml-auto text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="mb-6">
          <ng-content></ng-content>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            (click)="onClose()"
            class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            (click)="onConfirm()"
            [ngClass]="confirmButtonClass"
            class="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() confirmText = 'Confirmar';
  @Input() iconEmoji = '';
  @Input() iconClass = '';
  @Input() iconBgClass = '';
  @Input() confirmButtonClass = 'bg-blue-600 hover:bg-blue-700';
  @Input() maxWidthClass = 'max-w-md';

  @Output() closeEvent = new EventEmitter<void>();
  @Output() confirmEvent = new EventEmitter<void>();

  onClose(): void {
    this.closeEvent.emit();
  }

  onConfirm(): void {
    this.confirmEvent.emit();
  }
}
