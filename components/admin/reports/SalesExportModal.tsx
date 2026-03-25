'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPrice } from '@/lib/utils/formatting';
import { FileText, FileSpreadsheet, Download, Loader2, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface SalesExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: 'pdf' | 'csv' | 'xlsx';
  data: {
    summary: {
      totalRevenue: number;
      totalOrders: number;
      averageOrderValue: number;
      conversionRate: number;
    };
    salesByCategory: Array<{ category: string; sales: number; revenue: number }>;
    topProducts: Array<{ name: string; sold: number; revenue: number }>;
  };
}

export function SalesExportModal({ isOpen, onClose, format: initialFormat, data }: SalesExportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'csv' | 'xlsx'>(initialFormat);

  // Sync format with prop when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormat(initialFormat);
    }
  }, [isOpen, initialFormat]);

  const today = new Date().toISOString().split('T')[0];
  const filename = `sales-report-${today}.${format}`;

  const formatCurrencyForExport = (amount: number) => {
    return `PHP ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Small delay to show spinner and ensure UI is responsive
      await new Promise(resolve => setTimeout(resolve, 800));

      if (format === 'pdf') {
        generatePDF();
      } else if (format === 'csv') {
        generateCSV();
      } else {
        generateExcel();
      }
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const todayStr = new Date().toLocaleDateString();

    const buildPDF = (logoBase64: string | null) => {
      let y = 15;

      // Header with Logo
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', (pageWidth - 60) / 2, y, 60, 15);
        y += 20;
      }

      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text('NSD Sales Report', pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${todayStr}`, pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Summary Table
      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Revenue', formatCurrencyForExport(data.summary.totalRevenue)],
          ['Total Orders', data.summary.totalOrders.toString()],
          ['Avg. Order Value', formatCurrencyForExport(data.summary.averageOrderValue)],
          ['Conversion Rate', `${data.summary.conversionRate.toFixed(2)}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      // Top Products Table
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Top Performing Products', 14, y);
      y += 5;

      autoTable(doc, {
        startY: y,
        head: [['Product', 'Units Sold', 'Revenue']],
        body: data.topProducts.map(p => [
          p.name,
          p.sold.toString(),
          formatCurrencyForExport(p.revenue)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      });

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `© ${new Date().getFullYear()} Never Stop Dreaming Trading | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(filename);
    };

    // Load logo
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/nsd_light_long_logo.png';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      buildPDF(canvas.toDataURL('image/png'));
    };
    img.onerror = () => buildPDF(null);
  };

  const generateCSV = () => {
    const rows = [
      ['Sales Report Summary'],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Metric', 'Value'],
      ['Total Revenue', formatCurrencyForExport(data.summary.totalRevenue)],
      ['Total Orders', data.summary.totalOrders],
      ['Avg. Order Value', formatCurrencyForExport(data.summary.averageOrderValue)],
      ['Conversion Rate', `${data.summary.conversionRate.toFixed(2)}%`],
      [],
      ['Top Performing Products'],
      ['Product', 'Units Sold', 'Revenue'],
      ...data.topProducts.map(p => [p.name, p.sold, formatCurrencyForExport(p.revenue)])
    ];

    const content = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generateExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Revenue', formatCurrencyForExport(data.summary.totalRevenue)],
      ['Total Orders', data.summary.totalOrders],
      ['Avg. Order Value', formatCurrencyForExport(data.summary.averageOrderValue)],
      ['Conversion Rate', `${data.summary.conversionRate.toFixed(2)}%`]
    ];
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

    // Sheet 2: Top Products
    const productsData = [
      ['Product', 'Units Sold', 'Revenue'],
      ...data.topProducts.map(p => [p.name, p.sold, formatCurrencyForExport(p.revenue)])
    ];
    const productsWS = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(wb, productsWS, 'Top Products');

    // Sheet 3: By Category
    const categoryData = [
      ['Category', 'Units Sold', 'Revenue'],
      ...data.salesByCategory.map(c => [c.category, c.sales, formatCurrencyForExport(c.revenue)])
    ];
    const categoryWS = XLSX.utils.aoa_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(wb, categoryWS, 'By Category');

    XLSX.writeFile(wb, filename);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle>Export Sales Report</DialogTitle>
            <DialogDescription>Review report summary before downloading</DialogDescription>
          </div>
          <Badge variant="outline" className="uppercase font-mono">
            {format}
          </Badge>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[70vh] bg-muted/30">
          <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
            {/* Report Header Preview */}
            <div className="p-8 border-b text-center bg-muted/5">
              <img src="/nsd_light_long_logo.png" alt="Logo" className="h-12 mx-auto mb-4 opacity-80" />
              <h3 className="text-xl font-bold text-primary">NSD Sales Report</h3>
              <p className="text-[10px] text-muted-foreground uppercase pt-1">
                Internal Document • {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Stats Preview */}
            <div className="p-6 border-b">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Executive Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase">Revenue</p>
                  <p className="text-sm font-bold text-green-600">{formatPrice(data.summary.totalRevenue)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase">Orders</p>
                  <p className="text-sm font-bold">{data.summary.totalOrders}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase">AOV</p>
                  <p className="text-sm font-bold">{formatPrice(data.summary.averageOrderValue)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase">Conversion</p>
                  <p className="text-sm font-bold text-blue-600">{data.summary.conversionRate.toFixed(2)}%</p>
                </div>
              </div>
            </div>

            {/* Products Preview */}
            <div className="p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Top 5 Products Preview</h4>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="h-8 text-[10px]">Product</TableHead>
                    <TableHead className="h-8 text-[10px] text-right">Sold</TableHead>
                    <TableHead className="h-8 text-[10px] text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topProducts.slice(0, 5).map((p, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell className="py-2 text-[11px] font-medium">{p.name}</TableCell>
                      <TableCell className="py-2 text-[11px] text-right">{p.sold}</TableCell>
                      <TableCell className="py-2 text-[11px] text-right font-bold">{formatPrice(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex items-center justify-between sm:justify-between bg-background">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            Filename: <span className="font-mono text-primary">{filename}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleDownload} disabled={isGenerating} className="gap-2 px-4">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download {format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
