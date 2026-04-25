import { Component, Input, Output, EventEmitter, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Account } from '../../../../core/services/accounting.service';

@Component({
  selector: 'app-tree-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tree-node.component.html',
})
export class TreeNodeComponent {
  @Input() node!: Account;
  @Input() level: number = 1;
  @Input() expandedNodes: Set<string> = new Set();
  @Input() typeLabels: Record<string, string> = {};
  @Input() natureLabels: Record<string, string> = {};

  @Output() toggleExpansion = new EventEmitter<string>();
  @Output() editNode = new EventEmitter<Account>();
  @Output() deleteNode = new EventEmitter<Account>();
  @Output() toggleActive = new EventEmitter<Account>();
  @Output() toggleSubaccountActions = new EventEmitter<{ code: string; event: Event }>();
  @Output() createSubaccount = new EventEmitter<Account>();
  @Output() viewSubaccount = new EventEmitter<Account>();
  @Output() editSubaccount = new EventEmitter<Account>();
  @Output() deleteSubaccount = new EventEmitter<Account>();

  showSubaccountActions = signal<string | null>(null);

  isExpanded = computed(() => this.expandedNodes.has(this.node.code));
  hasChildren = computed(() => this.node.children && this.node.children.length > 0);
  canHaveSubaccounts = computed(() => this.node.level >= 3 && this.node.allowsMovements);
  hasSubaccounts = computed(() => this.node.children && this.node.children.length > 0);
  getSubaccounts = computed(() => this.node.children || []);
  getChildTypeLabel = computed(() => {
    if (this.node.level === 3) return 'Subcuenta';
    if (this.node.level === 4) return 'Sub-subcuenta';
    return 'Hijo';
  });

  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      asset: 'bg-blue-100 text-blue-700',
      liability: 'bg-orange-100 text-orange-700',
      equity: 'bg-purple-100 text-purple-700',
      income: 'bg-green-100 text-green-700',
      expense: 'bg-red-100 text-red-700',
    };
    return classes[type] || 'bg-slate-100 text-slate-600';
  }

  getNatureClass(nature: string): string {
    return nature === 'deudora' ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700';
  }

  onToggleExpansion(event: Event) {
    event.stopPropagation();
    this.toggleExpansion.emit(this.node.code);
  }

  onEditNode(event: Event) {
    event.stopPropagation();
    this.editNode.emit(this.node);
  }

  onDeleteNode(event: Event) {
    event.stopPropagation();
    this.deleteNode.emit(this.node);
  }

  onToggleActive(event: Event) {
    event.stopPropagation();
    this.toggleActive.emit(this.node);
  }

  onToggleSubaccountActions(event: Event) {
    event.stopPropagation();
    const newCode = this.showSubaccountActions() === this.node.code ? null : this.node.code;
    this.showSubaccountActions.set(newCode);
    this.toggleSubaccountActions.emit({ code: this.node.code, event });
  }

  onCreateSubaccount(event: Event) {
    event.stopPropagation();
    this.createSubaccount.emit(this.node);
    this.showSubaccountActions.set(null);
  }

  onViewSubaccount(subaccount: Account, event: Event) {
    event.stopPropagation();
    this.viewSubaccount.emit(subaccount);
    this.showSubaccountActions.set(null);
  }

  onEditSubaccount(subaccount: Account, event: Event) {
    event.stopPropagation();
    this.editSubaccount.emit(subaccount);
    this.showSubaccountActions.set(null);
  }

  onDeleteSubaccount(subaccount: Account, event: Event) {
    event.stopPropagation();
    this.deleteSubaccount.emit(subaccount);
    this.showSubaccountActions.set(null);
  }

  // Cerrar dropdown local si se hace clic fuera de este componente
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isInside = target.closest('.tree-node') !== null;
    if (!isInside) {
      this.showSubaccountActions.set(null);
    }
  }
}