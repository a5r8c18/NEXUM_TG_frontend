import { Component, signal } from '@angular/core';
import { DateFilterComponent, FilterValues } from '../../filters/date-filter.component';
import { PaginationComponent } from '../../pagination';
import { ExportComponentComponent, ExportData } from '../../downloads';

interface InventoryItem {
  codigo: string;
  nombre: string;
  entradas: number;
  salidas: number;
  existencias: number;
  fechaIngreso?: string;
  fechaVencimiento?: string;
}

@Component({
  selector: 'app-inventory-table',
  standalone: true,
  imports: [DateFilterComponent, PaginationComponent, ExportComponentComponent],
  templateUrl: './inventory-table.component.html'
})
export class InventoryTableComponent {
  inventoryItems = signal<InventoryItem[]>([
    { codigo: 'INV-001', nombre: 'Laptop Dell XPS 15', entradas: 50, salidas: 30, existencias: 20, fechaIngreso: '2024-01-15', fechaVencimiento: '2025-01-15' },
    { codigo: 'INV-002', nombre: 'Monitor LG 27"', entradas: 100, salidas: 45, existencias: 55, fechaIngreso: '2024-02-20', fechaVencimiento: '2025-02-20' },
    { codigo: 'INV-003', nombre: 'Teclado Logitech MX Keys', entradas: 200, salidas: 150, existencias: 50, fechaIngreso: '2024-03-10', fechaVencimiento: '2025-03-10' },
    { codigo: 'INV-004', nombre: 'Mouse Logitech MX Master 3', entradas: 150, salidas: 120, existencias: 30, fechaIngreso: '2024-01-25', fechaVencimiento: '2025-01-25' },
    { codigo: 'INV-005', nombre: 'Impresora HP LaserJet', entradas: 25, salidas: 10, existencias: 15, fechaIngreso: '2023-12-05', fechaVencimiento: '2024-12-05' },
    { codigo: 'INV-006', nombre: 'Router Cisco 2921', entradas: 10, salidas: 5, existencias: 5, fechaIngreso: '2024-02-15', fechaVencimiento: '2026-02-15' },
    { codigo: 'INV-007', nombre: 'Switch Cisco 2960', entradas: 30, salidas: 20, existencias: 10, fechaIngreso: '2024-01-30', fechaVencimiento: '2026-01-30' },
    { codigo: 'INV-008', nombre: 'Servidor Dell PowerEdge', entradas: 5, salidas: 2, existencias: 3, fechaIngreso: '2023-11-20', fechaVencimiento: '2025-11-20' },
    { codigo: 'INV-009', nombre: 'Disco Duro SSD 1TB', entradas: 75, salidas: 60, existencias: 15, fechaIngreso: '2024-03-01', fechaVencimiento: '2024-12-31' },
    { codigo: 'INV-010', nombre: 'Memoria RAM 16GB DDR4', entradas: 120, salidas: 80, existencias: 40, fechaIngreso: '2024-02-28', fechaVencimiento: '2025-02-28' },
    { codigo: 'INV-011', nombre: 'Webcam HD 1080p', entradas: 80, salidas: 65, existencias: 15, fechaIngreso: '2024-01-10', fechaVencimiento: '2025-01-10' },
    { codigo: 'INV-012', nombre: 'Microphone USB', entradas: 45, salidas: 30, existencias: 15, fechaIngreso: '2024-02-05', fechaVencimiento: '2025-02-05' },
    { codigo: 'INV-013', nombre: 'USB Hub 7-Port', entradas: 60, salidas: 40, existencias: 20, fechaIngreso: '2024-03-15', fechaVencimiento: '2025-03-15' },
    { codigo: 'INV-014', nombre: 'External HDD 2TB', entradas: 35, salidas: 25, existencias: 10, fechaIngreso: '2024-01-20', fechaVencimiento: '2024-12-20' },
    { codigo: 'INV-015', nombre: 'Graphics Card RTX 4070', entradas: 15, salidas: 8, existencias: 7, fechaIngreso: '2024-02-10', fechaVencimiento: '2025-02-10' },
    { codigo: 'INV-016', nombre: 'Power Supply 750W', entradas: 40, salidas: 30, existencias: 10, fechaIngreso: '2024-01-30', fechaVencimiento: '2025-01-30' },
    { codigo: 'INV-017', nombre: 'CPU Cooler Liquid', entradas: 25, salidas: 15, existencias: 10, fechaIngreso: '2024-02-25', fechaVencimiento: '2025-02-25' },
    { codigo: 'INV-018', nombre: 'Motherboard B550', entradas: 30, salidas: 20, existencias: 10, fechaIngreso: '2024-01-12', fechaVencimiento: '2025-01-12' },
    { codigo: 'INV-019', nombre: 'Case ATX Mid Tower', entradas: 20, salidas: 12, existencias: 8, fechaIngreso: '2024-02-18', fechaVencimiento: '2025-02-18' },
    { codigo: 'INV-020', nombre: 'Network Cable Cat6', entradas: 200, salidas: 150, existencias: 50, fechaIngreso: '2024-03-05', fechaVencimiento: '2026-03-05' }
  ]);

  searchTerm = signal('');
  filteredItems = signal<InventoryItem[]>([]);
  activeFilters = signal<FilterValues>({});
  
  // Paginación
  currentPage = signal(1);
  itemsPerPage = signal(5);
  
  constructor() {
    this.filteredItems.set(this.inventoryItems());
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value.toLowerCase());
    this.filterItems();
  }

  onFiltersChange(filters: FilterValues): void {
    this.activeFilters.set(filters);
    this.currentPage.set(1); // Resetear a primera página al filtrar
    this.filterItems();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  // Métodos de exportación
  get exportData(): ExportData {
    const headers = ['Código', 'Nombre', 'Entradas', 'Salidas', 'Existencias', 'Fecha Ingreso', 'Fecha Vencimiento'];
    const data = this.filteredItems().map(item => [
      item.codigo,
      item.nombre,
      item.entradas.toString(),
      item.salidas.toString(),
      item.existencias.toString(),
      item.fechaIngreso || 'N/A',
      item.fechaVencimiento || 'N/A'
    ]);
    
    return {
      headers,
      data,
      fileName: 'inventario'
    };
  }

  onExportComplete(event: { type: 'pdf' | 'excel'; fileName: string }): void {
    console.log(`Exportación completada: ${event.type.toUpperCase()} - ${event.fileName}`);
    // Aquí podrías mostrar una notificación de éxito
  }

  // Computed properties para paginación
  get paginatedItems() {
    const items = this.filteredItems();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return items.slice(start, end);
  }

  get paginationConfig() {
    const totalItems = this.filteredItems().length;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage());
    
    return {
      currentPage: this.currentPage(),
      totalPages,
      totalItems,
      itemsPerPage: this.itemsPerPage()
    };
  }

  private filterItems(): void {
    let items = this.inventoryItems();
    const search = this.searchTerm();
    const filters = this.activeFilters();

    // Filtrar por término de búsqueda
    if (search) {
      items = items.filter(item => 
        item.codigo.toLowerCase().includes(search) ||
        item.nombre.toLowerCase().includes(search)
      );
    }

    // Filtrar por nombre
    if (filters.name) {
      items = items.filter(item => 
        item.nombre.toLowerCase().includes(filters.name!.toLowerCase())
      );
    }

    // Filtrar por código
    if (filters.code) {
      items = items.filter(item => 
        item.codigo.toLowerCase().includes(filters.code!.toLowerCase())
      );
    }

    // Filtrar por rango de fechas (fecha de ingreso)
    if (filters.startDate) {
      items = items.filter(item => 
        item.fechaIngreso && item.fechaIngreso >= filters.startDate!
      );
    }

    if (filters.endDate) {
      items = items.filter(item => 
        item.fechaIngreso && item.fechaIngreso <= filters.endDate!
      );
    }

    // Filtrar por fecha de vencimiento
    if (filters.expirationDate) {
      items = items.filter(item => 
        item.fechaVencimiento && item.fechaVencimiento >= filters.expirationDate!
      );
    }

    this.filteredItems.set(items);
  }

  getStockClass(existencias: number): string {
    if (existencias === 0) return 'text-red-600 bg-red-50';
    if (existencias < 10) return 'text-orange-600 bg-orange-50';
    if (existencias < 20) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  }

  getStockLabel(existencias: number): string {
    if (existencias === 0) return 'Sin Stock';
    if (existencias < 10) return 'Bajo';
    if (existencias < 20) return 'Medio';
    return 'Bueno';
  }

  getTotalEntradas(): number {
    return this.inventoryItems().reduce((sum, item) => sum + item.entradas, 0);
  }

  getTotalSalidas(): number {
    return this.inventoryItems().reduce((sum, item) => sum + item.salidas, 0);
  }

  getTotalExistencias(): number {
    return this.inventoryItems().reduce((sum, item) => sum + item.existencias, 0);
  }

  getTotalValue(): number {
    // Simulación de valor total del inventario
    return this.inventoryItems().reduce((sum, item) => {
      const itemValue = this.getItemValue(item.codigo);
      return sum + (itemValue * item.existencias);
    }, 0);
  }

  private getItemValue(codigo: string): number {
    // Simulación de valor por producto según código
    const prices: { [key: string]: number } = {
      'INV-001': 1200,
      'INV-002': 300,
      'INV-003': 50,
      'INV-004': 25,
      'INV-005': 150,
      'INV-006': 800,
      'INV-007': 400,
      'INV-008': 2000,
      'INV-009': 100,
      'INV-010': 80
    };
    return prices[codigo] || 0;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(value);
  }

  onAddItem(): void {
    // Lógica para agregar nuevo item
    console.log('Agregar nuevo item');
  }

  onEditItem(item: InventoryItem): void {
    // Lógica para editar item
    console.log('Editar item:', item);
  }

  onDeleteItem(item: InventoryItem): void {
    // Lógica para eliminar item
    console.log('Eliminar item:', item);
  }
}
