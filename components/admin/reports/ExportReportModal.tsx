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

  const executeDownloadManual = (content: any, mimeType: string, extension: string) => {
    try {
      const filename = getFilename(extension);
      const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.setAttribute('download', filename);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Keep URL alive for 1 minute just to be safe for slow OS interactions
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 60000);
    } catch (error) {
      console.error('[Export] Download failed:', error);
    }
  };

  const handlePrint = () => {
    const reportName = getReportName();
    const today = new Date().toLocaleString();
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate HTML for the printable report
    let reportHtml = `
      <html>
        <head>
          <title>${reportName} Report - NSD</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
            .title { font-size: 28px; font-weight: bold; color: #3b82f6; margin: 0; }
            .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
            .section { margin-top: 30px; }
            .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; background: #f3f4f6; padding: 10px; font-size: 12px; }
            td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }
            .text-right { text-align: right; }
            .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">NSD ${reportName} Report</h1>
            <p class="subtitle">Generated on: ${today}</p>
          </div>
          
          <div class="section">
            <div class="section-title">Summary Statistics</div>
            <table>
              <thead><tr><th>Metric</th><th class="text-right">Value</th></tr></thead>
              <tbody>
    `;

    if (reportType === 'sales') {
      reportHtml += `
        <tr><td>Total Revenue</td><td class="text-right">${formatPrice(data.summary.totalRevenue)}</td></tr>
        <tr><td>Total Orders</td><td class="text-right">${data.summary.totalOrders}</td></tr>
        <tr><td>Avg. Order Value</td><td class="text-right">${formatPrice(data.summary.averageOrderValue)}</td></tr>
        <tr><td>Conversion Rate</td><td class="text-right">${data.summary.conversionRate.toFixed(2)}%</td></tr>
      `;
    } else if (reportType === 'inventory') {
      reportHtml += `
        <tr><td>Total Products</td><td class="text-right">${data.summary.totalProducts}</td></tr>
        <tr><td>In Stock</td><td class="text-right">${data.summary.inStock}</td></tr>
        <tr><td>Low Stock</td><td class="text-right">${data.summary.lowStock}</td></tr>
        <tr><td>Availability</td><td class="text-right">${data.summary.inStockPercentage}%</td></tr>
      `;
    } else if (reportType === 'customers') {
      reportHtml += `
        <tr><td>Total Customers</td><td class="text-right">${data.summary.totalCustomers}</td></tr>
        <tr><td>Active Customers</td><td class="text-right">${data.summary.activeCustomers}</td></tr>
        <tr><td>Avg. Order Value</td><td class="text-right">${formatPrice(data.summary.avgOrderValue)}</td></tr>
        <tr><td>Lifetime Value</td><td class="text-right">${formatPrice(data.summary.customerLifetimeValue)}</td></tr>
      `;
    }

    reportHtml += `</tbody></table></div>`;

    // Add list items
    reportHtml += `
      <div class="section">
        <div class="section-title">${reportType === 'sales' ? 'Top Performing Products' : reportType === 'inventory' ? 'Low Stock Items' : 'Top Customers'}</div>
        <table>
          <thead>
            <tr>
              <th>${reportType === 'sales' ? 'Product' : reportType === 'inventory' ? 'Product' : 'Name'}</th>
              <th>${reportType === 'sales' ? 'Units Sold' : reportType === 'inventory' ? 'SKU' : 'Email'}</th>
              <th class="text-right">${reportType === 'sales' ? 'Revenue' : reportType === 'inventory' ? 'Stock' : 'Total Spent'}</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (reportType === 'sales') {
      data.topProducts.forEach((p: any) => {
        reportHtml += `<tr><td>${p.name}</td><td>${p.sold}</td><td class="text-right">${formatPrice(p.revenue)}</td></tr>`;
      });
    } else if (reportType === 'inventory') {
      data.lowStockItems.forEach((p: any) => {
        reportHtml += `<tr><td>${p.name}</td><td>${p.sku}</td><td class="text-right">${p.stock}</td></tr>`;
      });
    } else if (reportType === 'customers') {
      data.topCustomers.forEach((p: any) => {
        reportHtml += `<tr><td>${p.name}</td><td>${p.email}</td><td class="text-right">${p.totalSpent}</td></tr>`;
      });
    }

    reportHtml += `
            </tbody>
          </table>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Never Stop Dreaming Trading - Admin Panel
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
    </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const reportName = getReportName();
    const filename = getFilename('pdf');

    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246);
    doc.text(`NSD ${reportName} Report`, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

    if (reportType === 'sales') {
      const summaryData = [
        ['Total Revenue', formatPrice(data.summary.totalRevenue)],
        ['Total Orders', data.summary.totalOrders.toString()],
        ['Avg. Order Value', formatPrice(data.summary.averageOrderValue)],
        ['Conversion Rate', `${data.summary.conversionRate.toFixed(2)}%`]
      ];
      autoTable(doc, {
        startY: 45,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
      const finalY = (doc as any).lastAutoTable.finalY || 80;
      doc.text('Top Performing Products', 14, finalY + 15);
      const productsData = data.topProducts.map((p: any) => [p.name, p.sold.toString(), formatPrice(p.revenue)]);
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Product', 'Units Sold', 'Revenue']],
        body: productsData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
      });
    } else if (reportType === 'inventory') {
      const summaryData = [
        ['Total Products', data.summary.totalProducts.toString()],
        ['In Stock', data.summary.inStock.toString()],
        ['Low Stock', data.summary.lowStock.toString()],
        ['Out of Stock', data.summary.outOfStock.toString()],
        ['Availability', `${data.summary.inStockPercentage}%`]
      ];
      autoTable(doc, {
        startY: 45,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
      const finalY = (doc as any).lastAutoTable.finalY || 80;
      doc.text('Low Stock Items', 14, finalY + 15);
      const lowStockData = data.lowStockItems.map((p: any) => [p.name, p.sku, p.stock.toString(), p.status]);
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Product', 'SKU', 'Stock', 'Status']],
        body: lowStockData,
        theme: 'striped',
        headStyles: { fillColor: [234, 179, 8] }
      });
    } else if (reportType === 'customers') {
      const summaryData = [
        ['Total Customers', data.summary.totalCustomers.toString()],
        ['Active Customers', data.summary.activeCustomers.toString()],
        ['Avg. Order Value', formatPrice(data.summary.avgOrderValue)],
        ['Lifetime Value', formatPrice(data.summary.customerLifetimeValue)]
      ];
      autoTable(doc, {
        startY: 45,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
      const finalY = (doc as any).lastAutoTable.finalY || 80;
      doc.text('Top Customers', 14, finalY + 15);
      const customerData = data.topCustomers.map((p: any) => [p.name, p.email, p.orders.toString(), p.totalSpent]);
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Name', 'Email', 'Orders', 'Total Spent']],
        body: customerData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
      });
    }

    // Use data URI — avoids blob UUID naming issue in some browsers
    const dataUri = doc.output('datauristring');
    triggerDownload(dataUri, filename);
  };

  const exportToCSV = () => {
    let csvContent = '';
    if (reportType === 'sales') {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Revenue,${data.summary.totalRevenue}\n`;
      csvContent += `Total Orders,${data.summary.totalOrders}\n`;
      csvContent += `Avg. Order Value,${data.summary.averageOrderValue}\n`;
      csvContent += `Conversion Rate,${data.summary.conversionRate.toFixed(2)}%\n\n`;
      csvContent += 'Product Name,Units Sold,Revenue\n';
      data.topProducts.forEach((p: any) => { csvContent += `"${p.name}",${p.sold},${p.revenue}\n`; });
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
      csvContent += `Avg. Order Value,${data.summary.avgOrderValue}\n`;
      csvContent += `Lifetime Value,${data.summary.customerLifetimeValue}\n\n`;
      csvContent += 'Name,Email,Orders,Total Spent,Status\n';
      data.topCustomers.forEach((p: any) => { csvContent += `"${p.name}",${p.email},${p.orders},${p.totalSpent},${p.status}\n`; });
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
        ['Total Revenue', data.summary.totalRevenue],
        ['Total Orders', data.summary.totalOrders],
        ['Avg. Order Value', data.summary.averageOrderValue],
        ['Conversion Rate', `${data.summary.conversionRate.toFixed(2)}%`]
      ]);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
      const productsWS = XLSX.utils.aoa_to_sheet([
        ['Product Name', 'Units Sold', 'Revenue'],
        ...data.topProducts.map((p: any) => [p.name, p.sold, p.revenue])
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
        ['Avg. Order Value', data.summary.avgOrderValue],
        ['Lifetime Value', data.summary.customerLifetimeValue]
      ]);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
      const customersWS = XLSX.utils.aoa_to_sheet([
        ['Name', 'Email', 'Orders', 'Total Spent', 'Status'],
        ...data.topCustomers.map((p: any) => [p.name, p.email, p.orders, p.totalSpent, p.status])
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
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 shrink-0">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        {/* Scrollable document preview */}
        <div className="flex-1 overflow-y-auto bg-muted/40 px-6 py-5">
          <div className="bg-white dark:bg-zinc-900 shadow-md rounded-lg border px-8 py-8 space-y-6 text-sm text-foreground">
            {/* Doc header */}
            <div className="text-center border-b pb-5">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Never Stop Dreaming Trading</p>
              <h2 className="text-2xl font-bold text-blue-600">NSD {getReportName()} Report</h2>
              <p className="text-xs text-muted-foreground mt-1">Generated on: {new Date().toLocaleString()}</p>
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
                      <TableRow><TableCell>Total Revenue</TableCell><TableCell className="text-right font-semibold text-green-600">{formatPrice(data.summary.totalRevenue)}</TableCell></TableRow>
                      <TableRow><TableCell>Total Orders</TableCell><TableCell className="text-right">{data.summary.totalOrders}</TableCell></TableRow>
                      <TableRow><TableCell>Avg. Order Value</TableCell><TableCell className="text-right">{formatPrice(data.summary.averageOrderValue)}</TableCell></TableRow>
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
                      <TableRow><TableCell>Avg. Order Value</TableCell><TableCell className="text-right">{formatPrice(data.summary.avgOrderValue)}</TableCell></TableRow>
                      <TableRow><TableCell>Customer Lifetime Value</TableCell><TableCell className="text-right text-green-600">{formatPrice(data.summary.customerLifetimeValue)}</TableCell></TableRow>
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
                      <TableRow key={i}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right">{p.sold}</TableCell><TableCell className="text-right text-green-600 font-medium">{formatPrice(p.revenue)}</TableCell></TableRow>
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
                      <TableRow key={i}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-muted-foreground">{p.email}</TableCell><TableCell className="text-right">{p.orders}</TableCell><TableCell className="text-right text-green-600 font-medium">{p.totalSpent}</TableCell></TableRow>
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
