import { Component, signal, input, output } from '@angular/core';

export interface ExportData {
  headers: string[];
  data: any[][];
  fileName: string;
}

@Component({
  selector: 'app-export-component',
  standalone: true,
  templateUrl: './export-component.component.html'
})
export class ExportComponentComponent {
  // Inputs
  exportData = input.required<ExportData>();
  isLoading = signal(false);

  // Outputs
  exportComplete = output<{ type: 'pdf' | 'excel'; fileName: string }>();

  constructor() {}

  async exportToPDF(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { headers, data, fileName } = this.exportData();
      const pdfFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Simulación de exportación a PDF
      await this.simulatePDFExport(headers, data, pdfFileName);
      
      this.exportComplete.emit({ type: 'pdf', fileName: pdfFileName });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async exportToExcel(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { headers, data, fileName } = this.exportData();
      const excelFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Simulación de exportación a Excel
      await this.simulateExcelExport(headers, data, excelFileName);
      
      this.exportComplete.emit({ type: 'excel', fileName: excelFileName });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async simulatePDFExport(headers: string[], data: any[][], fileName: string): Promise<void> {
    // Simulación de delay para exportación PDF
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // En una implementación real, aquí usarías una librería como jsPDF
    console.log('Exportando a PDF:', { headers, data, fileName });
    
    // Simulación de descarga
    this.downloadFile(fileName, 'application/pdf', this.generatePDFContent(headers, data));
  }

  private async simulateExcelExport(headers: string[], data: any[][], fileName: string): Promise<void> {
    // Simulación de delay para exportación Excel
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // En una implementación real, aquí usarías una librería como SheetJS
    console.log('Exportando a Excel:', { headers, data, fileName });
    
    // Simulación de descarga
    this.downloadFile(fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', this.generateCSVContent(headers, data));
  }

  private generatePDFContent(headers: string[], data: any[][]): string {
    let content = `${headers.join(' | ')}\n`;
    content += '='.repeat(headers.join(' | ').length) + '\n';
    
    data.forEach(row => {
      content += row.join(' | ') + '\n';
    });
    
    return content;
  }

  private generateCSVContent(headers: string[], data: any[][]): string {
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    return csv;
  }

  private downloadFile(fileName: string, mimeType: string, content: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  }

  get totalItems(): number {
    return this.exportData().data.length;
  }

  get hasData(): boolean {
    return this.totalItems > 0;
  }
}
