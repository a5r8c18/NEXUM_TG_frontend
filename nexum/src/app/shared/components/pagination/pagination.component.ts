import { Component, signal, input, output } from '@angular/core';

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.component.html'
})
export class PaginationComponent {
  // Inputs
  config = input.required<PaginationConfig>();

  // Outputs
  pageChange = output<number>();

  // Computed properties
  get currentPage() {
    return this.config().currentPage;
  }

  get totalPages() {
    return this.config().totalPages;
  }

  get totalItems() {
    return this.config().totalItems;
  }

  get itemsPerPage() {
    return this.config().itemsPerPage;
  }

  get startItem() {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem() {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.totalItems ? this.totalItems : end;
  }

  get pages() {
    const pages: number[] = [];
    const current = this.currentPage;
    const total = this.totalPages;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // ellipsis
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push(-1); // ellipsis
        for (let i = total - 4; i <= total; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1); // ellipsis
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // ellipsis
        pages.push(total);
      }
    }

    return pages;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  onPrevious(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  onNext(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }
}
