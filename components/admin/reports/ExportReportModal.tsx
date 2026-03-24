'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { formatPrice } from '@/lib/utils/formatting';
import { FileText, FileSpreadsheet, Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export type ReportType = 'sales' | 'inventory' | 'customers';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: ReportType;
  data: any;
}

export function ExportReportModal({ isOpen, onClose, reportType, data }: ExportReportModalProps) {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');

  const getReportName = () => {
    switch (reportType) {
      case 'sales': return 'Sales';
      case 'inventory': return 'Inventory';
      case 'customers': return 'Customers';
      default: return 'Report';
    }
  };

  const getFilename = (ext: string) => {
    const today = new Date().toISOString().split('T')[0];
    return `${reportType}-report-${today}.${ext}`;
  };

  const formatCurrencyForPDF = (amount: number | string) => {
    if (typeof amount === 'string' && amount.includes('₱')) {
      return amount.replace('₱', 'PHP ');
    }
    const val = typeof amount === 'number' ? amount : parseFloat(amount.toString().replace(/[^0-9.-]+/g, ""));
    return `PHP ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };





  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.setAttribute('download', filename);
    link.style.position = 'fixed';
    link.style.opacity = '0';
    document.body.appendChild(link);
    link.click();
    // Close modal first, then clean up
    setTimeout(() => {
      onClose();
      document.body.removeChild(link);
      if (url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
      }
    }, 100);
  };

  const handleDownload = () => {
    if (format === 'pdf') {
      exportToPDF();
    } else if (format === 'csv') {
      exportToCSV();
    } else {
      exportToExcel();
    }
    // Don't call onClose() here — triggerDownload handles it
  };

  const exportToPDF = () => {
    const reportName = getReportName();
    const filename = getFilename('pdf');
    const today = new Date().toLocaleString();
    const pageWidth = 210; // A4 mm

    const buildPDF = (logoBase64: string | null, logoWidth: number, logoHeight: number) => {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      let y = 14;

      // Logo with aspect ratio
      if (logoBase64) {
        const maxW = 75;
        const ratio = logoHeight / logoWidth;
        const logoW = maxW;
        const logoH = maxW * ratio;
        doc.addImage(logoBase64, 'PNG', (pageWidth - logoW) / 2, y, logoW, logoH);
        y += logoH + 4;
      }

      // Title block
      doc.setFontSize(26);
      doc.setTextColor(59, 130, 246);
      doc.text(`${reportName} Report`, pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Generated: ${today}`, pageWidth - 14, y, { align: 'right' });
      y += 2;

      // Divider
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      // Summary table
      let summaryBody: string[][] = [];
      if (reportType === 'sales') {
        summaryBody = [
          ['Total Revenue', formatCurrencyForPDF(data.summary.totalRevenue)],
          ['Total Orders', data.summary.totalOrders.toString()],
          ['Avg. Order Value', formatCurrencyForPDF(data.summary.averageOrderValue)],
          ['Conversion Rate', `${data.summary.conversionRate.toFixed(2)}%`],
        ];
      } else if (reportType === 'inventory') {
        summaryBody = [
          ['Total Products', data.summary.totalProducts.toString()],
          ['In Stock', data.summary.inStock.toString()],
          ['Low Stock', data.summary.lowStock.toString()],
          ['Out of Stock', data.summary.outOfStock.toString()],
          ['Availability', `${data.summary.inStockPercentage}%`],
        ];
      } else {
        summaryBody = [
          ['Total Customers', data.summary.totalCustomers.toString()],
          ['Active Customers', data.summary.activeCustomers.toString()],
          ['Avg. Order Value', formatCurrencyForPDF(data.summary.avgOrderValue)],
          ['Lifetime Value', formatCurrencyForPDF(data.summary.customerLifetimeValue)],
        ];
      }

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        styles: { fontSize: 10 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // Detail table
      let detailHead: string[] = [];
      let detailBody: string[][] = [];
      let detailTitle = '';

      if (reportType === 'sales') {
        detailTitle = 'Top Performing Products';
        detailHead = ['Product Name', 'Units Sold', 'Revenue'];
        detailBody = data.topProducts.map((p: any) => [p.name, p.sold.toString(), formatCurrencyForPDF(p.revenue)]);
      } else if (reportType === 'inventory') {
        detailTitle = 'Low Stock Alerts';
        detailHead = ['Product', 'SKU', 'Stock', 'Status'];
        detailBody = data.lowStockItems.map((p: any) => [p.name, p.sku, p.stock.toString(), p.status]);
      } else {
        detailTitle = 'Top Customers';
        detailHead = ['Name', 'Email', 'Orders', 'Total Spent'];
        detailBody = data.topCustomers.map((p: any) => [p.name, p.email, p.orders.toString(), formatCurrencyForPDF(p.totalSpent)]);
      }

      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      doc.text(detailTitle, 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [detailHead],
        body: detailBody,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 9.5 },
        didParseCell: (hookData) => {
          // Highlight low/critical stock rows in inventory
          if (reportType === 'inventory' && hookData.row.section === 'body') {
            const status = (hookData.row.raw as string[])[3];
            if (status === 'critical') hookData.cell.styles.textColor = [220, 38, 38];
          }
        },
      });

      // Footer on each page
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const footerY = doc.internal.pageSize.getHeight() - 8;
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`© ${new Date().getFullYear()} Never Stop Dreaming Trading — Admin Panel`, 14, footerY);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, footerY, { align: 'right' });
      }

      // Trigger save via data URI (more reliable for filenames)
      const dataUri = doc.output('datauristring');
      triggerDownload(dataUri, filename);
    };

    // Load logo as base64 via canvas
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/nsd_light_long_logo.png';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      buildPDF(canvas.toDataURL('image/png'), img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => buildPDF(null, 0, 0); // fallback — no logo if image fails
  };


  const exportToCSV = () => {
    let csvContent = '';
    if (reportType === 'sales') {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Revenue,${formatCurrencyForPDF(data.summary.totalRevenue)}\n`;
      csvContent += `Total Orders,${data.summary.totalOrders}\n`;
      csvContent += `Avg. Order Value,${formatCurrencyForPDF(data.summary.averageOrderValue)}\n`;
      csvContent += `Conversion Rate,${data.summary.conversionRate.toFixed(2)}%\n\n`;
      csvContent += 'Product Name,Units Sold,Revenue\n';
      data.topProducts.forEach((p: any) => { csvContent += `"${p.name}",${p.sold},${formatCurrencyForPDF(p.revenue)}\n`; });
    } else if (reportType === 'inventory') {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Products,${data.summary.totalProducts}\n`;
      csvContent += `In Stock,${data.summary.inStock}\n`;
      csvContent += `Low Stock,${data.summary.lowStock}\n`;
      csvContent += `Out of Stock,${data.summary.outOfStock}\n\n`;
      csvContent += 'Product Name,SKU,Stock,Threshold,Status\n';
      data.lowStockItems.forEach((p: any) => { csvContent += `"${p.name}",${p.sku},${p.stock},${p.threshold},${p.status}\n`; });
    } else if (reportType === 'customers') {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Customers,${data.summary.totalCustomers}\n`;
      csvContent += `Active Customers,${data.summary.activeCustomers}\n`;
      csvContent += `Avg. Order Value,${formatCurrencyForPDF(data.summary.avgOrderValue)}\n`;
      csvContent += `Lifetime Value,${formatCurrencyForPDF(data.summary.customerLifetimeValue)}\n\n`;
      csvContent += 'Name,Email,Orders,Total Spent,Status\n';
      data.topCustomers.forEach((p: any) => { csvContent += `"${p.name}",${p.email},${p.orders},${formatCurrencyForPDF(p.totalSpent)},${p.status}\n`; });
    }

    const blob = new Blob(['﻿', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    triggerDownload(url, getFilename('csv'));
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const filename = getFilename('xlsx');

    if (reportType === 'sales') {
      const summaryWS = XLSX.utils.aoa_to_sheet([
        ['Metric', 'Value'],
        ['Total Revenue', formatCurrencyForPDF(data.summary.totalRevenue)],
        ['Total Orders', data.summary.totalOrders],
        ['Avg. Order Value', formatCurrencyForPDF(data.summary.averageOrderValue)],
        ['Conversion Rate', `${data.summary.conversionRate.toFixed(2)}%`]
      ]);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
      const productsWS = XLSX.utils.aoa_to_sheet([
        ['Product Name', 'Units Sold', 'Revenue'],
        ...data.topProducts.map((p: any) => [p.name, p.sold, formatCurrencyForPDF(p.revenue)])
      ]);
      XLSX.utils.book_append_sheet(wb, productsWS, 'Top Products');
    } else if (reportType === 'inventory') {
      const summaryWS = XLSX.utils.aoa_to_sheet([
        ['Metric', 'Value'],
        ['Total Products', data.summary.totalProducts],
        ['In Stock', data.summary.inStock],
        ['Low Stock', data.summary.lowStock],
        ['Out of Stock', data.summary.outOfStock]
      ]);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
      const itemsWS = XLSX.utils.aoa_to_sheet([
        ['Product Name', 'SKU', 'Stock', 'Threshold', 'Status'],
        ...data.lowStockItems.map((p: any) => [p.name, p.sku, p.stock, p.threshold, p.status])
      ]);
      XLSX.utils.book_append_sheet(wb, itemsWS, 'Low Stock Items');
    } else if (reportType === 'customers') {
      const summaryWS = XLSX.utils.aoa_to_sheet([
        ['Metric', 'Value'],
        ['Total Customers', data.summary.totalCustomers],
        ['Active Customers', data.summary.activeCustomers],
        ['Avg. Order Value', formatCurrencyForPDF(data.summary.avgOrderValue)],
        ['Lifetime Value', formatCurrencyForPDF(data.summary.customerLifetimeValue)]
      ]);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
      const customersWS = XLSX.utils.aoa_to_sheet([
        ['Name', 'Email', 'Orders', 'Total Spent', 'Status'],
        ...data.topCustomers.map((p: any) => [p.name, p.email, p.orders, formatCurrencyForPDF(p.totalSpent), p.status])
      ]);
      XLSX.utils.book_append_sheet(wb, customersWS, 'Top Customers');
    }

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    triggerDownload(url, filename);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
          <div>
            <DialogTitle className="text-lg font-bold">Export {getReportName()} Report</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              Review your report before downloading — what you see is what you get.
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable document preview */}
        <div className="flex-1 overflow-y-auto bg-muted/40 px-6 py-5">
          <div className="bg-white dark:bg-zinc-900 shadow-md rounded-lg border px-8 py-8 space-y-6 text-sm text-foreground">
            {/* Doc header */}
            <div className="border-b pb-8 text-center ring-offset-background">
              <img src="/nsd_light_long_logo.png" alt="Logo" className="h-20 w-auto mx-auto mb-2" />
              <h2 className="text-3xl font-bold text-blue-600 tracking-tight">{getReportName()} Report</h2>
              <div className="flex justify-end mt-4">
                <p className="text-[10px] text-muted-foreground font-mono opacity-70">
                  Generated: {new Date().toLocaleString()}
                </p>
              </div>
            </div>

            {/* Summary stats */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Summary Statistics</h3>
              <div className="border rounded overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50 dark:bg-blue-950/40">
                      <TableHead className="font-semibold">Metric</TableHead>
                      <TableHead className="text-right font-semibold">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportType === 'sales' && (<>
                      <TableRow><TableCell>Total Revenue</TableCell><TableCell className="text-right font-semibold text-green-600">{formatCurrencyForPDF(data.summary.totalRevenue)}</TableCell></TableRow>
                      <TableRow><TableCell>Total Orders</TableCell><TableCell className="text-right">{data.summary.totalOrders}</TableCell></TableRow>
                      <TableRow><TableCell>Avg. Order Value</TableCell><TableCell className="text-right">{formatCurrencyForPDF(data.summary.averageOrderValue)}</TableCell></TableRow>
                      <TableRow><TableCell>Conversion Rate</TableCell><TableCell className="text-right text-blue-600">{data?.summary?.conversionRate?.toFixed(2)}%</TableCell></TableRow>
                    </>)}
                    {reportType === 'inventory' && (<>
                      <TableRow><TableCell>Total Products</TableCell><TableCell className="text-right font-semibold">{data.summary.totalProducts}</TableCell></TableRow>
                      <TableRow><TableCell>In Stock</TableCell><TableCell className="text-right text-green-600">{data.summary.inStock}</TableCell></TableRow>
                      <TableRow><TableCell>Low Stock</TableCell><TableCell className="text-right text-yellow-600">{data.summary.lowStock}</TableCell></TableRow>
                      <TableRow><TableCell>Out of Stock</TableCell><TableCell className="text-right text-red-600">{data.summary.outOfStock}</TableCell></TableRow>
                      <TableRow><TableCell>Availability</TableCell><TableCell className="text-right">{data.summary.inStockPercentage}%</TableCell></TableRow>
                    </>)}
                    {reportType === 'customers' && (<>
                      <TableRow><TableCell>Total Customers</TableCell><TableCell className="text-right font-semibold">{data.summary.totalCustomers}</TableCell></TableRow>
                      <TableRow><TableCell>Active Customers</TableCell><TableCell className="text-right text-blue-600">{data.summary.activeCustomers}</TableCell></TableRow>
                      <TableRow><TableCell>Avg. Order Value</TableCell><TableCell className="text-right">{formatCurrencyForPDF(data.summary.avgOrderValue)}</TableCell></TableRow>
                      <TableRow><TableCell>Customer Lifetime Value</TableCell><TableCell className="text-right text-green-600">{formatCurrencyForPDF(data.summary.customerLifetimeValue)}</TableCell></TableRow>
                    </>)}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Detail list */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {reportType === 'sales' ? 'Top Performing Products' : reportType === 'inventory' ? 'Low Stock Alerts' : 'Top Customers'}
              </h3>
              <div className="border rounded overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-green-50 dark:bg-green-950/30">
                      {reportType === 'sales' && (<><TableHead className="font-semibold">Product Name</TableHead><TableHead className="text-right font-semibold">Units Sold</TableHead><TableHead className="text-right font-semibold">Revenue</TableHead></>)}
                      {reportType === 'inventory' && (<><TableHead className="font-semibold">Product</TableHead><TableHead className="font-semibold">SKU</TableHead><TableHead className="text-right font-semibold">Stock</TableHead><TableHead className="font-semibold">Status</TableHead></>)}
                      {reportType === 'customers' && (<><TableHead className="font-semibold">Name</TableHead><TableHead className="font-semibold">Email</TableHead><TableHead className="text-right font-semibold">Orders</TableHead><TableHead className="text-right font-semibold">Total Spent</TableHead></>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportType === 'sales' && data.topProducts.map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right">{p.sold}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">{formatCurrencyForPDF(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                    {reportType === 'inventory' && data.lowStockItems.map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                        <TableCell className="text-right font-bold text-yellow-600">{p.stock}</TableCell>
                        <TableCell><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${p.status === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span></TableCell>
                      </TableRow>
                    ))}
                    {reportType === 'customers' && data.topCustomers.map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.email}</TableCell>
                        <TableCell className="text-right">{p.orders}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">{formatCurrencyForPDF(p.totalSpent)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Doc footer */}
            <div className="text-center text-xs text-muted-foreground border-t pt-4">
              &copy; {new Date().getFullYear()} Never Stop Dreaming Trading — Confidential
            </div>
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="shrink-0 border-t bg-background px-6 py-3 flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Filename: <span className="font-mono font-medium">{getFilename(format)}</span>
          </p>
          <div className="flex-1" />
          <Select value={format} onValueChange={(val: any) => setFormat(val)}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-red-500" /><span>PDF (.pdf)</span></div></SelectItem>
              <SelectItem value="xlsx"><div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-green-500" /><span>Excel (.xlsx)</span></div></SelectItem>
              <SelectItem value="csv"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" /><span>CSV (.csv)</span></div></SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleDownload} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4" />
            Download {format.toUpperCase()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
