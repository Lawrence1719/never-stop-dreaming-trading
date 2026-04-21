'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { 
  Download, 
  Loader2, 
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils/formatting';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PrintReportHeader, getRelativeDateRangeLabel } from '@/components/admin/reports/PrintReportHeader';
import { addProfessionalPdfFooter, addProfessionalPdfHeader, getLogoBase64 } from '@/components/admin/reports/pdf-report-header';
import { PrintReportFooter } from '@/components/admin/reports/PrintReportFooter';

export type DashboardMetric = 'revenue' | 'orders' | 'customers' | 'aov' | 'sales_overview' | 'sales_by_category';

interface DashboardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: DashboardMetric | null;
  data: any;
  dateRange: string;
}

export function DashboardDetailModal({
  isOpen,
  onClose,
  metric,
  data,
  dateRange,
}: DashboardDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
  const [detailData, setDetailData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>(null);

  useEffect(() => {
    if (isOpen && metric) {
      loadMetricData();
      setFormat('pdf'); // Default to PDF as requested
    }
  }, [isOpen, metric, data]);

  const loadMetricData = async () => {
    setLoading(true);
    try {
      if (metric === 'orders') {
        const res = await fetch('/api/admin/orders?limit=100');
        const json = await res.json();
        setDetailData(json.data || []);
        setSummaryStats([
          { label: 'Total Orders', value: data?.stats?.totals?.orders || 0, change: data?.stats?.changes?.orders?.change },
          { label: 'Avg Value', value: formatPrice(data?.stats?.totals?.averageOrderValue || 0) }
        ]);
      } else if (metric === 'customers') {
        const res = await fetch('/api/admin/customers?limit=100');
        const json = await res.json();
        setDetailData(json.data || []);
        setSummaryStats([
          { label: 'Total Customers', value: data?.stats?.totals?.customers || 0, change: data?.stats?.changes?.customers?.change },
          { label: 'New This Week', value: Math.floor((data?.stats?.totals?.customers || 0) * 0.05) } // Mock breakdown
        ]);
      } else if (metric === 'revenue' || metric === 'sales_overview') {
        setDetailData(data?.salesOverview?.series || []);
        setSummaryStats([
          { label: 'Total Revenue', value: formatPrice(Number(data?.stats?.totals?.revenue) || 0), change: data?.stats?.changes?.revenue?.change, isCurrency: true },
          { label: 'Growth', value: `${(data?.stats?.changes?.revenue?.change || 0).toFixed(1)}%` }
        ]);
      } else if (metric === 'aov') {
        setDetailData(data?.salesOverview?.series || []);
        setSummaryStats([
          { label: 'Avg Order Value', value: formatPrice(Number(data?.stats?.totals?.averageOrderValue) || 0), change: data?.stats?.changes?.averageOrderValue?.change, isCurrency: true },
          { label: 'Total Orders', value: data?.stats?.totals?.orders || 0 }
        ]);
      } else if (metric === 'sales_by_category') {
        setDetailData(data?.salesByCategory?.breakdown || []);
        setSummaryStats([
          { label: 'Total Revenue', value: formatPrice(Number(data?.salesByCategory?.totalRevenue) || 0), isCurrency: true },
          { label: 'Top Category', value: data?.salesByCategory?.breakdown?.[0]?.category || 'N/A' }
        ]);
      }
    } catch (error) {
      console.error('Failed to load detail data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricTitle = () => {
    switch (metric) {
      case 'revenue': return 'Revenue Breakdown';
      case 'orders': return 'Customer Orders';
      case 'customers': return 'Customer Directory';
      case 'aov': return 'AOV Analysis';
      case 'sales_overview': return 'Sales Performance';
      case 'sales_by_category': return 'Category Breakdown';
      default: return 'Data Breakdown';
    }
  };

  const toggleFormat = () => {
    const formats: ('pdf' | 'xlsx' | 'csv')[] = ['pdf', 'xlsx', 'csv'];
    const currentIndex = formats.indexOf(format);
    setFormat(formats[(currentIndex + 1) % formats.length]);
  };

  const today = new Date().toISOString().split('T')[0];
  const filename = `NSD_${(metric || 'report').toUpperCase()}_Summary_${today}.${format}`;
  const printDateRange = getRelativeDateRangeLabel(dateRange as 'day' | 'week' | 'month');

  const handleDownload = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 800)); // UX delay
    
    try {
      if (format === 'pdf') await exportToPDF();
      else if (format === 'xlsx') exportToExcel();
      else exportToCSV();
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    (doc as any).setCharSpace?.(0);
    const title = getMetricTitle();
    const startY = addProfessionalPdfHeader(doc, {
      reportTitle: title,
      generatedAt: new Date(),
      dateRange: printDateRange,
      logo: await getLogoBase64(),
    });
    
    let head = [];
    let body = [];
    if (metric === 'orders') {
      head = [['ID', 'Customer', 'Amount', 'Status']];
      body = detailData.map(o => [o.id, o.customer || 'Guest', formatPrice(Number(o.total) || 0), o.orderStatus]);
    } else if (metric === 'customers') {
      head = [['Name', 'Email', 'Role']];
      body = detailData.map(c => [c.name, c.email, c.role]);
    } else if (metric === 'sales_by_category') {
      head = [['Category', 'Revenue', 'Orders']];
      body = detailData.map(d => [d.category || 'Uncategorized', formatPrice(Number(d.revenue) || 0), d.orders]);
    } else {
      head = [['Period', 'Revenue', 'Orders']];
      body = detailData.map(d => [d.period, formatPrice(Number(d.revenue) || 0), d.orders]);
    }

    autoTable(doc, {
      startY,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { font: 'helvetica', fontSize: 9.5 },
      margin: { left: 14, right: 14, bottom: 38 },
    });

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addProfessionalPdfFooter(doc, i, totalPages);
    }

    doc.save(filename);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(detailData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, filename);
  };

  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(detailData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  if (!metric) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
          <div className="text-left">
            <DialogTitle>{getMetricTitle()}</DialogTitle>
            <DialogDescription>Detailed data for {dateRange} overview</DialogDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="h-6 px-2 uppercase font-mono cursor-pointer hover:bg-muted transition-colors mr-6"
            onClick={toggleFormat}
          >
            {format}
          </Button>
        </DialogHeader>

        {/* Body (Print Preview) */}
        <div className="p-6 overflow-y-auto max-h-[70vh] bg-muted/30">
          <div id="printable-modal-content" className="bg-background border rounded-xl shadow-sm overflow-hidden printable-area">
            <PrintReportHeader
              reportTitle={getMetricTitle()}
              generatedAt={new Date()}
              dateRange={printDateRange}
              className="screen-only-report-header p-8 pb-0"
            />
            <PrintReportHeader
              reportTitle={getMetricTitle()}
              generatedAt={new Date()}
              dateRange={printDateRange}
              className="print-only-report-header p-8 pb-0"
            />

            {/* Executive Summary */}
            <div className="p-6 border-b">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Executive Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {summaryStats?.map((stat: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">{stat.label}</p>
                    <div className="flex items-center gap-1">
                      <p className={`text-sm font-bold ${stat.isCurrency ? 'text-green-600' : ''}`}>
                        {stat.value}
                      </p>
                      {stat.change !== undefined && (
                        <span className={`text-[10px] flex items-center ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stat.change >= 0 ? <TrendingUp className="h-2 w-2 mr-0.5" /> : <TrendingDown className="h-2 w-2 mr-0.5" />}
                          {Math.abs(stat.change).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Preview (Top 5) */}
            <div className="p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Data Preview (Top 5)</h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {metric === 'orders' ? (
                        <>
                          <TableHead className="h-8 text-[10px]">ID</TableHead>
                          <TableHead className="h-8 text-[10px]">Customer</TableHead>
                          <TableHead className="h-8 text-[10px] text-right">Amount</TableHead>
                        </>
                      ) : metric === 'customers' ? (
                        <>
                          <TableHead className="h-8 text-[10px]">Customer</TableHead>
                          <TableHead className="h-8 text-[10px]">Email</TableHead>
                        </>
                      ) : metric === 'sales_by_category' ? (
                        <>
                          <TableHead className="h-8 text-[10px]">Category</TableHead>
                          <TableHead className="h-8 text-[10px] text-right">Revenue</TableHead>
                          <TableHead className="h-8 text-[10px] text-right">Orders</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="h-8 text-[10px]">Period</TableHead>
                          <TableHead className="h-8 text-[10px] text-right">Revenue</TableHead>
                          <TableHead className="h-8 text-[10px] text-right">Orders</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : detailData.slice(0, 5).map((row, i) => (
                      <TableRow key={i} className="hover:bg-transparent">
                        {metric === 'orders' ? (
                          <>
                            <TableCell className="py-2 text-[11px] font-mono">{row.id?.slice(0, 8)}</TableCell>
                            <TableCell className="py-2 text-[11px]">{row.customer || 'Guest'}</TableCell>
                            <TableCell className="py-2 text-[11px] text-right font-bold">{formatPrice(Number(row.amount || row.total) || 0)}</TableCell>
                          </>
                        ) : metric === 'customers' ? (
                          <>
                            <TableCell className="py-2 text-[11px] font-medium">{row.name}</TableCell>
                            <TableCell className="py-2 text-[11px]">{row.email}</TableCell>
                          </>
                        ) : metric === 'sales_by_category' ? (
                          <>
                            <TableCell className="py-2 text-[11px] font-medium">{row.category || 'Uncategorized'}</TableCell>
                            <TableCell className="py-2 text-[11px] text-right font-bold">{formatPrice(Number(row.revenue) || 0)}</TableCell>
                            <TableCell className="py-2 text-[11px] text-right">{row.orders}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="py-2 text-[11px]">{row.period}</TableCell>
                            <TableCell className="py-2 text-[11px] text-right font-bold">{formatPrice(Number(row.revenue) || 0)}</TableCell>
                            <TableCell className="py-2 text-[11px] text-right">{row.orders}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <PrintReportFooter
              className="mt-2 px-6 pb-6 print-only-report-footer"
              previewPageLabel="Page 1 of 1"
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t flex flex-row items-center justify-between sm:justify-between bg-background">
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
