import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { MessagesService, Message } from '../../core/services/messages.service';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './messages.component.html'
})
export class MessagesComponent implements OnInit {
  private messagesService = inject(MessagesService);

  messages = signal<Message[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  activeTab = signal<'inbox' | 'sent'>('inbox');
  searchTerm = signal('');
  selectedMessage = signal<Message | null>(null);
  isComposeOpen = signal(false);

  filteredMessages = computed(() => {
    let filtered = this.messages();
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(m =>
        m.subject.toLowerCase().includes(term) ||
        m.fromUserName.toLowerCase().includes(term) ||
        m.toUserName.toLowerCase().includes(term)
      );
    }
    return filtered;
  });

  ngOnInit() { this.loadMessages(); }

  loadMessages() {
    this.isLoading.set(true);
    this.hasError.set(false);
    const source$ = this.activeTab() === 'inbox'
      ? this.messagesService.getInbox()
      : this.messagesService.getSent();
    source$.subscribe({
      next: (data) => { this.messages.set(data); this.isLoading.set(false); },
      error: () => { this.hasError.set(true); this.isLoading.set(false); }
    });
  }

  switchTab(tab: 'inbox' | 'sent') {
    this.activeTab.set(tab);
    this.selectedMessage.set(null);
    this.loadMessages();
  }

  selectMessage(msg: Message) {
    this.selectedMessage.set(msg);
    if (!msg.isRead && this.activeTab() === 'inbox') {
      this.messagesService.markAsRead(msg.id).subscribe();
    }
  }

  backToList() { this.selectedMessage.set(null); }

  deleteMessage(msg: Message) {
    if (!confirm('¿Eliminar este mensaje?')) return;
    this.messagesService.remove(msg.id).subscribe({
      next: () => {
        this.showToast('Mensaje eliminado', 'success');
        this.selectedMessage.set(null);
        this.loadMessages();
      },
      error: () => this.showToast('Error al eliminar', 'error')
    });
  }

  archiveMessage(msg: Message) {
    this.messagesService.archive(msg.id).subscribe({
      next: () => {
        this.showToast('Mensaje archivado', 'success');
        this.selectedMessage.set(null);
        this.loadMessages();
      },
      error: () => this.showToast('Error al archivar', 'error')
    });
  }

  openCompose() { this.isComposeOpen.set(true); }
  closeCompose() { this.isComposeOpen.set(false); }

  sendMessage() {
    this.showToast('Funcionalidad de envío en desarrollo', 'info');
    this.closeCompose();
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'normal': return 'bg-slate-100 text-slate-600';
      case 'low': return 'bg-slate-50 text-slate-500';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'normal': return 'Normal';
      case 'low': return 'Baja';
      default: return priority;
    }
  }

  formatDate(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 1) return 'Hace unos minutos';
    if (diffHrs < 24) return `Hace ${Math.floor(diffHrs)}h`;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
