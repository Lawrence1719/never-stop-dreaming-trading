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
import { formatPeso, formatPrice, formatPriceForPdf } from '@/lib/utils/formatting';
import { FileText, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PrintReportHeader } from '@/components/admin/reports/PrintReportHeader';
import { addProfessionalPdfFooter, addProfessionalPdfHeader, getLogoBase64 } from '@/components/admin/reports/pdf-report-header';
import { PrintReportFooter } from '@/components/admin/reports/PrintReportFooter';

interface SalesExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: 'pdf' | 'csv' | 'xlsx';
  dateRange?: string;
  data: {
    summary: {
      totalRevenue: number;
      totalOrders: number;
      averageOrderValue: number;
      conversionRate: number;
    };
    salesByCategory: Array<{ category: string; sales: number; revenue: number }>;
    topProducts: Array<{ name: string; sold: number; revenue: number; isDeletedProduct?: boolean }>;
  };
}

export function SalesExportModal({ isOpen, onClose, format: initialFormat, dateRange, data }: SalesExportModalProps) {
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
    return formatPriceForPdf(amount);
  };

  const toRevenueNumber = (value: number | string | null | undefined) => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.replace(/[^0-9.-]+/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Small delay to show spinner and ensure UI is responsive
      await new Promise(resolve => setTimeout(resolve, 800));

      if (format === 'pdf') {
        await generatePDF();
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

  const generatePDF = async () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    (doc as any).setCharSpace?.(0);
    let y = addProfessionalPdfHeader(doc, {
      reportTitle: 'Sales Report',
      generatedAt: new Date(),
      dateRange,
      logo: await getLogoBase64(),
    });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('EXECUTIVE SUMMARY', 14, y);
    y += 4;

    const statCards = [
      { label: 'Revenue', value: formatCurrencyForExport(data.summary.totalRevenue), color: [22, 163, 74] as [number, number, number] },
      { label: 'Orders', value: data.summary.totalOrders.toString(), color: [15, 23, 42] as [number, number, number] },
      { label: 'AOV', value: formatCurrencyForExport(data.summary.averageOrderValue), color: [15, 23, 42] as [number, number, number] },
      { label: 'Conversion', value: `${data.summary.conversionRate.toFixed(2)}%`, color: [37, 99, 235] as [number, number, number] },
    ];

    const startX = 14;
    const gap = 4;
    const cardWidth = 44;
    const cardHeight = 16;

    statCards.forEach((card, index) => {
      const x = startX + (cardWidth + gap) * index;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(card.label, x + 2.5, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...card.color);
      doc.text(card.value, x + 2.5, y + 11);
    });

    y += cardHeight + 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('FULL METRICS TABLE', 14, y);
    y += 4;

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
      styles: { fontSize: 10, font: 'helvetica' },
      columnStyles: { 1: { halign: 'right', font: 'helvetica' } },
      margin: { left: 14, right: 14, bottom: 38 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('TOP PERFORMING PRODUCTS', 14, y);
    y += 4;

    if (data.topProducts.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text('No information available for this report.', 14, y + 6);
    } else {
      autoTable(doc, {
        startY: y,
        head: [['Product', 'Units Sold', 'Revenue']],
        body: data.topProducts.map(p => [
          p.name,
          p.sold.toString(),
          formatCurrencyForExport(toRevenueNumber(p.revenue))
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 9, font: 'helvetica' },
        columnStyles: { 1: { halign: 'right', font: 'helvetica' }, 2: { halign: 'right', font: 'helvetica' } },
        margin: { left: 14, right: 14, bottom: 38 },
      });

      if (data.topProducts.some((product) => product.isDeletedProduct)) {
        const footnoteY = ((doc as any).lastAutoTable?.finalY ?? y) + 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text('* Some products may have been removed from the store', 14, footnoteY);
      }
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addProfessionalPdfFooter(doc, i, totalPages);
    }

    doc.save(filename);
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
      ...data.topProducts.map(p => [p.name, p.sold, formatCurrencyForExport(toRevenueNumber(p.revenue))])
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
      ...data.topProducts.map(p => [p.name, p.sold, formatCurrencyForExport(toRevenueNumber(p.revenue))])
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
          <div className="printable-area bg-background border rounded-xl shadow-sm overflow-hidden">
            <PrintReportHeader
              reportTitle="Sales Report"
              generatedAt={new Date()}
              dateRange={dateRange}
              className="screen-only-report-header p-8 pb-0"
            />
            <PrintReportHeader
              reportTitle="Sales Report"
              generatedAt={new Date()}
              dateRange={dateRange}
              className="print-only-report-header p-8 pb-0"
            />

            {/* Executive Summary */}
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

            {/* Full Metrics Table */}
            <div className="p-6 border-b">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Full Metrics Table</h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="h-8 text-[10px]">Metric</TableHead>
                      <TableHead className="h-8 text-[10px] text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="py-2 text-[11px]">Total Revenue</TableCell>
                      <TableCell className="py-2 text-[11px] text-right font-bold text-green-600">{formatPeso(data.summary.totalRevenue)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-2 text-[11px]">Total Orders</TableCell>
                      <TableCell className="py-2 text-[11px] text-right">{data.summary.totalOrders}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-2 text-[11px]">Avg. Order Value</TableCell>
                      <TableCell className="py-2 text-[11px] text-right">{formatPeso(data.summary.averageOrderValue)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-2 text-[11px]">Conversion Rate</TableCell>
                      <TableCell className="py-2 text-[11px] text-right">{data.summary.conversionRate.toFixed(2)}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Full Top Performing Products Table */}
            <div className="p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Top Performing Products</h4>
              <div className="border rounded-lg overflow-hidden">
                {data.topProducts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm italic text-muted-foreground">
                    No information available for this report.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="h-8 text-[10px]">Product</TableHead>
                        <TableHead className="h-8 text-[10px] text-right">Sold</TableHead>
                        <TableHead className="h-8 text-[10px] text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topProducts.map((p, i) => (
                        <TableRow key={i} className="hover:bg-transparent">
                          <TableCell
                            className={`py-2 text-[11px] ${p.isDeletedProduct ? 'italic text-muted-foreground' : 'font-medium'}`}
                          >
                            {p.name}
                          </TableCell>
                          <TableCell className="py-2 text-[11px] text-right">{p.sold}</TableCell>
                          <TableCell className="py-2 text-[11px] text-right font-bold">
                            {formatPeso(toRevenueNumber(p.revenue))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              {data.topProducts.some((product) => product.isDeletedProduct) && (
                <p className="mt-3 text-[10px] text-muted-foreground">
                  * Some products may have been removed from the store
                </p>
              )}
            </div>

            <PrintReportFooter
              className="mt-2 px-6 pb-6 print-only-report-footer"
              previewPageLabel="Page 1 of 1"
            />
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
