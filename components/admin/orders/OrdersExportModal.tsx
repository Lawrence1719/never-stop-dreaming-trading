'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { formatPrice, formatDate, formatDateTime } from '@/lib/utils/formatting';
import { FileText, Download, Calendar, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportMode = 'date-range' | 'pdf-preview';

interface OrdersExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ExportMode;
  data?: any[]; // For PDF preview
  onExportCSV?: (startDate: string, endDate: string) => void;
}

export function OrdersExportModal({ isOpen, onClose, mode, data = [], onExportCSV }: OrdersExportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Set default dates (past 30 days)
  useEffect(() => {
    if (isOpen && mode === 'date-range') {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      
      setEndDate(end.toISOString().split('T')[0]);
      setStartDate(start.toISOString().split('T')[0]);
    }
  }, [isOpen, mode]);

  const formatCurrencyForPDF = (amount: number | string) => {
    const val = typeof amount === 'number' ? amount : parseFloat(amount.toString().replace(/[^0-9.-]+/g, ""));
    return `PHP ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const today = new Date().toISOString().split('T')[0];
      const filename = `orders-report-${today}.pdf`;

      let y = 15;

      // Load Logo
      const logoUrl = '/nsd_light_long_logo.png';
      try {
        const logoBase64 = await getBase64ImageFromUrl(logoUrl);
        const img = new Image();
        img.src = logoBase64;
        await new Promise((resolve) => (img.onload = resolve));
        
        const maxW = 60;
        const ratio = img.height / img.width;
        const logoW = maxW;
        const logoH = maxW * ratio;
        doc.addImage(logoBase64, 'PNG', (pageWidth - logoW) / 2, y, logoW, logoH);
        y += logoH + 10;
      } catch (err) {
        console.warn('Failed to load logo for PDF', err);
        y += 5;
      }

      // Title
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text("NSD Orders Report", pageWidth / 2, y, { align: 'center' });
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text(`Generated Date: ${formatDateTime(new Date())}`, pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Summary Stats
      const totalOrders = data.length;
      const totalRevenue = data.reduce((sum, order) => {
        const amount = typeof order.amount === 'string' 
          ? parseFloat(order.amount.replace(/[^0-9.-]/g, '')) 
          : order.amount;
        return sum + (amount || 0);
      }, 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text("Summary Report", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Orders', totalOrders.toString()],
          ['Total Revenue', formatCurrencyForPDF(totalRevenue)],
          ['Avg Order Value', formatCurrencyForPDF(avgOrderValue)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 12;

      // Main Table
      doc.setFontSize(11);
      doc.text("Order Details", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Order ID', 'Customer', 'Amount', 'Status', 'Payment', 'Date']],
        body: data.map(order => [
          order.id || order.orderId?.slice(0, 8).toUpperCase(),
          order.customer,
          formatCurrencyForPDF(order.amount),
          order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1),
          order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1),
          order.date
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 8.5 },
        margin: { left: 14, right: 14 },
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `© 2026 Never Stop Dreaming Trading — Admin Panel`,
          14,
          doc.internal.pageSize.getHeight() - 10
        );
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - 14,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
      }

      doc.save(filename);
      onClose();
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result as string), false);
      reader.addEventListener('error', () => reject(new Error('Failed to convert image to base64')), false);
      reader.readAsDataURL(blob);
    });
  }

  const handleExportCSV = () => {
    if (onExportCSV) {
      onExportCSV(startDate, endDate);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={mode === 'pdf-preview' ? "max-w-4xl" : "sm:max-w-[425px]"}>
        <DialogHeader>
          <DialogTitle>
            {mode === 'date-range' ? 'Export Orders by Date' : 'Export as PDF'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'date-range' 
              ? 'Select the date range for your CSV export.' 
              : 'Preview your order report before downloading.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'date-range' ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start-date" className="text-right">From</Label>
              <Input
                id="start-date"
                type="date"
                className="col-span-3"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end-date" className="text-right">To</Label>
              <Input
                id="end-date"
                type="date"
                className="col-span-3"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 py-4">
            {/* Report Preview */}
            <div className="border rounded-lg p-6 bg-white dark:bg-zinc-950 shadow-sm space-y-6 text-foreground">
              <div className="flex justify-between items-start border-b pb-4">
                <div className="flex flex-col items-center">
                   <img src="/nsd_light_long_logo.png" alt="Logo" className="h-12 w-auto mb-2" />
                   <h2 className="text-xl font-bold text-blue-600">NSD Orders Report</h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Generated: {formatDate(new Date())}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Total Orders</p>
                  <p className="text-xl font-bold">{data.length}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Total Revenue</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatPrice(data.reduce((sum: number, o: any) => sum + (typeof o.amount === 'string' ? parseFloat(o.amount.replace(/[^0-9.-]/g, '')) : o.amount), 0))}
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Avg Order Value</p>
                  <p className="text-xl font-bold">
                    {formatPrice(data.length > 0 ? data.reduce((sum: number, o: any) => sum + (typeof o.amount === 'string' ? parseFloat(o.amount.replace(/[^0-9.-]/g, '')) : o.amount), 0) / data.length : 0)}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slice(0, 10).map((order: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>{typeof order.amount === 'string' ? order.amount : formatPrice(order.amount)}</TableCell>
                        <TableCell className="capitalize">{order.orderStatus}</TableCell>
                        <TableCell className="text-xs">{formatDate(order.date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {data.length > 10 && (
                  <div className="p-3 text-center text-xs text-muted-foreground border-t bg-muted/20">
                    And {data.length - 10} more orders...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          {mode === 'date-range' ? (
            <Button onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          ) : (
            <Button onClick={generatePDF} disabled={isGenerating} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
