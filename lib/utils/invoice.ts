import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Order } from '@/lib/types';
import { formatPrice, formatDate } from '@/lib/utils/formatting';

export const generateInvoicePDF = (order: Order) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;

  // 1. Header & Logo Placeholder
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text('Never Stop Dreaming Trading', 15, 20);
  
  doc.setFontSize(10);
  doc.text('INVOICE', 155, 20, { align: 'right' });
  doc.text(order.orderNumber, 155, 26, { align: 'right' });
  doc.text(`Date: ${formatDate(order.date)}`, 155, 32, { align: 'right' });

  // 2. Billing & Shipping Info
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text('Bill To:', 15, 45);
  doc.setTextColor(40);
  doc.text(order.shippingAddress.fullName, 15, 51);
  doc.setFontSize(9);
  doc.text(order.shippingAddress.street, 15, 56);
  doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.province} ${order.shippingAddress.zip}`, 15, 61);
  doc.text(`Phone: ${order.shippingAddress.phone}`, 15, 66);

  // 3. Order Details Table
  const tableColumn = ["Product", "Price", "Qty", "Total"];
  const tableRows = order.items.map(item => [
    item.name,
    formatPrice(item.price),
    item.quantity.toString(),
    formatPrice(item.price * item.quantity)
  ]);

  (doc as any).autoTable({
    startY: 75,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [43, 63, 107] }, // Primary color tint
    margin: { left: 15, right: 15 }
  });

  // 4. Totals logic
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.text('Subtotal:', 140, finalY);
  doc.text(formatPrice(order.subtotal), 185, finalY, { align: 'right' });
  
  doc.text('Shipping:', 140, finalY + 6);
  doc.text(order.shipping === 0 ? 'Free' : formatPrice(order.shipping), 185, finalY + 6, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text('Total:', 140, finalY + 14);
  doc.text(formatPrice(order.total), 185, finalY + 14, { align: 'right' });

  // 5. Payment Info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text('Payment Method:', 15, finalY);
  doc.text(order.paymentMethod.toUpperCase(), 15, finalY + 6);

  // Footer text
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Thank you for shopping with Never Stop Dreaming Trading!', 105, pageHeight - 15, { align: 'center' });
  doc.text('For any questions or concerns, please contact support.', 105, pageHeight - 10, { align: 'center' });

  // Save the PDF
  doc.save(`Invoice_${order.orderNumber}.pdf`);
};
