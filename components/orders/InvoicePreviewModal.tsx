'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Order } from '@/lib/types';
import { formatPrice, formatDate } from '@/lib/utils/formatting';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
}

const DEFAULT_STORE = 'Never Stop Dreaming Trading';
const DEFAULT_TAGLINE = 'Quality products delivered to your door';

// ── Client-side PDF generation ────────────────────────────────────────────────
async function generateAndDownload(invoiceData: any, filename: string) {
  // Dynamic import so jsPDF only loads in browser
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 15;
  const RIGHT = PAGE_W - MARGIN;

  const store = invoiceData.store || {};
  const storeName = store.name || DEFAULT_STORE;
  const tagline = store.tagline || DEFAULT_TAGLINE;
  const bizAddress = store.address || '';
  const contactEmail = store.email || '';
  const contactPhone = store.phone || '';

  const addr = invoiceData.shippingAddress || {};
  const items: any[] = invoiceData.items || [];
  const discount = Number(invoiceData.discountAmount) || 0;
  const shipping = Number(invoiceData.shippingCost) || 0;
  const total = Number(invoiceData.total) || 0;
  const subtotal = items.reduce((s: number, i: any) =>
    s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0
  ) || total - shipping + discount;

  function peso(amount: number): string {
    const abs = Math.abs(amount);
    const [int, dec] = abs.toFixed(2).split('.');
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${amount < 0 ? '-' : ''}PHP ${formatted}.${dec}`;
  }

  function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  }

  const paymentLabel =
    invoiceData.paymentMethod === 'cod'  ? 'Cash on Delivery' :
    invoiceData.paymentMethod === 'card' ? 'Credit / Debit Card' :
    invoiceData.paymentMethod === 'bank' ? 'Bank Transfer' :
    (invoiceData.paymentMethod || 'N/A').toUpperCase();

  // ── 1. Header ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(storeName, MARGIN, 22);

  if (tagline) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(tagline, MARGIN, 28);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text('INVOICE', RIGHT, 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(invoiceData.orderNumber || '', RIGHT, 29, { align: 'right' });
  doc.text(fmtDate(invoiceData.createdAt), RIGHT, 35, { align: 'right' });

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 40, RIGHT, 40);

  // ── 2. FROM / BILL TO ──────────────────────────────────────────────────────
  const COL2 = MARGIN + (PAGE_W - MARGIN * 2) / 2 + 5;
  let y = 48;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('FROM:', MARGIN, y);
  doc.text('BILL TO:', COL2, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(storeName, MARGIN, y);
  doc.text(addr.fullName || '', COL2, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);

  const fromLines = [bizAddress, contactPhone, contactEmail].filter(Boolean);
  fromLines.forEach((line) => { doc.text(line, MARGIN, y); y += 4.5; });

  let yR = 58;
  const toLines = [
    addr.street,
    [addr.city, addr.province].filter(Boolean).join(', ') + (addr.zip ? ` ${addr.zip}` : ''),
    addr.phone,
  ].filter(Boolean) as string[];
  toLines.forEach((line) => { doc.text(line, COL2, yR); yR += 4.5; });

  const tableStartY = Math.max(y, yR) + 8;

  // ── 3. Items table ─────────────────────────────────────────────────────────
  const tableRows = items.map((item: any) => [
    item.name || 'Product',
    item.variant_label || item.variantLabel || '—',
    String(item.quantity || 1),
    peso(Number(item.price) || 0),
    peso((Number(item.price) || 0) * (Number(item.quantity) || 1)),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Item', 'Variant', 'Qty', 'Unit Price', 'Total']],
    body: tableRows,
    theme: 'plain',
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 35 },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // ── 4. Totals ──────────────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 6;
  let ty = finalY;
  const LX = RIGHT - 70;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Subtotal', LX, ty);
  doc.text(peso(subtotal), RIGHT, ty, { align: 'right' });

  if (discount > 0) {
    ty += 5;
    doc.setTextColor(16, 120, 80);
    doc.text('Discount', LX, ty);
    doc.text(`-${peso(discount)}`, RIGHT, ty, { align: 'right' });
    doc.setTextColor(80, 80, 80);
  }

  ty += 5;
  doc.text('Shipping', LX, ty);
  doc.text(shipping === 0 ? 'FREE' : peso(shipping), RIGHT, ty, { align: 'right' });

  ty += 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(LX, ty, RIGHT, ty);

  ty += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text('Total', LX, ty);
  doc.text(peso(total), RIGHT, ty, { align: 'right' });

  // ── 5. Payment method ──────────────────────────────────────────────────────
  ty += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Payment Method: ${paymentLabel}`, MARGIN, ty);

  // ── 6. Footer ──────────────────────────────────────────────────────────────
  const footerY = PAGE_H - 20;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, footerY - 5, RIGHT, footerY - 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Thank you for shopping with ${storeName}!`, PAGE_W / 2, footerY, { align: 'center' });

  const contactLine = [contactEmail, contactPhone].filter(Boolean).join('  |  ');
  if (contactLine) {
    doc.setFont('helvetica', 'normal');
    doc.text(contactLine, PAGE_W / 2, footerY + 5, { align: 'center' });
  }

  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('Page 1 of 1', RIGHT, PAGE_H - 8, { align: 'right' });

  doc.save(filename);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function InvoicePreviewModal({ isOpen, onClose, order }: InvoicePreviewModalProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const subtotal =
    order.subtotal > 0
      ? order.subtotal
      : order.total - order.shipping + (order.discount_amount || 0);

  const paymentLabel =
    order.paymentMethod === 'cod'  ? 'Cash on Delivery' :
    order.paymentMethod === 'card' ? 'Credit / Debit Card' :
    order.paymentMethod === 'bank' ? 'Bank Transfer' :
    order.paymentMethod?.toUpperCase() || 'N/A';

  const filename = `NSD-Invoice-${order.orderNumber.replace(/[#\s]/g, '')}.pdf`;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token ?? '';
      const response = await fetch(`/api/orders/${order.id}/invoice`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Server error');
      const invoiceData = await response.json();
      await generateAndDownload(invoiceData, filename);
      onClose();
    } catch {
      toast({ title: 'Failed to generate invoice. Please try again.', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isDownloading) onClose(); }}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-xl p-0 gap-0 overflow-hidden">

        {/* ── Modal header ── */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <DialogTitle className="text-base font-bold leading-tight">Invoice Preview</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Review before downloading
            </DialogDescription>
          </div>
          <span className="shrink-0 text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
            PDF
          </span>
        </div>

        {/* ── Paper preview ── */}
        <div className="overflow-y-auto max-h-[58vh] bg-muted/40 px-3 sm:px-4 py-4">
          <div className="overflow-x-auto rounded-lg">
            <div
              className="bg-white text-gray-800 rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 text-[11px] space-y-4"
              style={{ minWidth: 420 }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200">
                <div className="min-w-0">
                  <p className="font-black text-sm text-gray-900 leading-tight">{DEFAULT_STORE}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{DEFAULT_TAGLINE}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-lg text-gray-900 leading-none">INVOICE</p>
                  <p className="text-[10px] text-gray-500 mt-1">{order.orderNumber}</p>
                  <p className="text-[10px] text-gray-500">{formatDate(order.date)}</p>
                </div>
              </div>

              {/* FROM / BILL TO */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">From</p>
                  <p className="font-semibold text-gray-800 text-[11px]">{DEFAULT_STORE}</p>
                  <p className="text-gray-500 text-[10px]">Cavite, Philippines</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Bill To</p>
                  <p className="font-semibold text-gray-800 text-[11px]">{order.shippingAddress.fullName}</p>
                  <p className="text-gray-500 text-[10px]">{order.shippingAddress.street}</p>
                  <p className="text-gray-500 text-[10px]">
                    {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}
                  </p>
                  <p className="text-gray-500 text-[10px]">{order.shippingAddress.phone}</p>
                </div>
              </div>

              {/* Items table */}
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="text-left px-2 py-1.5 rounded-tl font-semibold">Item</th>
                    <th className="text-left px-2 py-1.5 font-semibold">Variant</th>
                    <th className="text-center px-2 py-1.5 font-semibold w-8">Qty</th>
                    <th className="text-right px-2 py-1.5 font-semibold whitespace-nowrap">Unit Price</th>
                    <th className="text-right px-2 py-1.5 rounded-tr font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-2 py-1.5 font-medium text-gray-800" style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</td>
                      <td className="px-2 py-1.5 text-gray-500" style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.variantLabel || '—'}</td>
                      <td className="px-2 py-1.5 text-center text-gray-700">{item.quantity}</td>
                      <td className="px-2 py-1.5 text-right text-gray-700 whitespace-nowrap">{formatPrice(item.price)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold text-gray-800 whitespace-nowrap">{formatPrice(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Subtotal</span><span className="whitespace-nowrap">{formatPrice(subtotal)}</span>
                </div>
                {(order.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-[11px] text-emerald-700">
                    <span>Discount</span><span className="whitespace-nowrap">-{formatPrice(order.discount_amount!)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Shipping</span>
                  <span className="whitespace-nowrap">{order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                  <span>Total</span><span className="whitespace-nowrap">{formatPrice(order.total)}</span>
                </div>
              </div>

              {/* Payment */}
              <p className="text-[10px] text-gray-500">
                <span className="font-semibold text-gray-700">Payment Method: </span>
                {paymentLabel}
              </p>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-200 text-center">
                <p className="text-[10px] italic text-gray-400">
                  Thank you for shopping with {DEFAULT_STORE}!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-border bg-card">
          <p className="text-[10px] text-muted-foreground font-mono truncate hidden sm:block">{filename}</p>
          <div className="flex gap-2 w-full sm:w-auto sm:shrink-0">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={onClose} disabled={isDownloading}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none gap-1.5" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating...</>
              ) : (
                <><Download className="w-3.5 h-3.5" />Download PDF</>
              )}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
