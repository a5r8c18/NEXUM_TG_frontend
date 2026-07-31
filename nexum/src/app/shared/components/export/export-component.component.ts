import { Component, signal, input, output } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportDataProvider = ExportData | (() => Promise<ExportData>);

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
  exportData = input<ExportData>();
  exportDataFn = input<() => Promise<ExportData>>();
  isLoading = signal(false);

  // Outputs
  exportComplete = output<{ type: 'pdf' | 'excel'; fileName: string }>();

  constructor() {}

  async exportToPDF(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { headers, data, fileName } = await this.resolveExportData();
      const pdfFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
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
      const { headers, data, fileName } = await this.resolveExportData();
      const excelFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      await this.simulateExcelExport(headers, data, excelFileName);
      
      this.exportComplete.emit({ type: 'excel', fileName: excelFileName });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async resolveExportData(): Promise<ExportData> {
    const fn = this.exportDataFn();
    if (fn) {
      return fn();
    }
    return this.exportData()!;
  }

  private async simulatePDFExport(headers: string[], data: any[][], fileName: string): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 14,
      styles: { fontSize: 8, cellPadding: 1.2 },
      headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 10, right: 8, bottom: 14, left: 8 },
      didDrawPage: (dataArg) => {
        const page = (dataArg as any).pageNumber;
        doc.setFontSize(8);
        doc.text(`Página ${page}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
      },
    });

    doc.save(fileName);
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

  async totalItems(): Promise<number> {
    return (await this.resolveExportData()).data.length;
  }

  get hasData(): boolean {
    const syncData = this.exportData();
    if (syncData) return syncData.data.length > 0;
    return true;
  }
}
