import jsPDF from 'jspdf';
import { formatDate } from '@/lib/utils/formatting';

const PAGE_MARGIN = 14;
const RIGHT_COLUMN_WIDTH = 56;
const HEADER_GAP = 10;
const FOOTER_TEXT_COLOR: [number, number, number] = [100, 116, 139];
const FOOTER_DIVIDER_COLOR: [number, number, number] = [18, 58, 104];
const DISCLAIMER_LINES = [
  'This report is generated automatically by the Never Stop Dreaming system.',
  'The information contained in this document is confidential and intended solely for authorized personnel.',
  'Unauthorized distribution, copying, or use of this report is strictly prohibited.',
  'Data accuracy is based on records available at the time of generation.',
];

export type ProcessedLogo = {
  dataUrl: string;
  width: number;
  height: number;
};

export async function getLogoBase64(imageUrl: string = '/nsd_light_long_logo.png'): Promise<ProcessedLogo | null> {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load logo image'));
      img.src = objectUrl;
    });

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;
    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) {
      URL.revokeObjectURL(objectUrl);
      return null;
    }

    sourceCtx.drawImage(image, 0, 0);
    const { data, width, height } = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    URL.revokeObjectURL(objectUrl);

    if (maxX < minX || maxY < minY) {
      return null;
    }

    const padding = 8;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropWidth = Math.min(width - cropX, maxX - minX + 1 + padding * 2);
    const cropHeight = Math.min(height - cropY, maxY - minY + 1 + padding * 2);

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = cropWidth;
    trimmedCanvas.height = cropHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx) {
      return null;
    }

    trimmedCtx.drawImage(
      sourceCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return {
      dataUrl: trimmedCanvas.toDataURL('image/png'),
      width: cropWidth,
      height: cropHeight,
    };
  } catch {
    return null;
  }
}

export function addProfessionalPdfHeader(
  doc: jsPDF,
  {
    reportTitle,
    generatedAt = new Date(),
    dateRange,
    logo,
  }: {
    reportTitle: string;
    generatedAt?: string | Date;
    dateRange?: string | null;
    logo?: ProcessedLogo | null;
  }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - PAGE_MARGIN;
  const topY = 12;
  const rightColumnLeftX = rightX - RIGHT_COLUMN_WIDTH;
  let logoHeight = 0;
  let logoWidth = 0;

  if (logo) {
    const maxLogoWidth = rightColumnLeftX - PAGE_MARGIN - HEADER_GAP;
    logoWidth = Math.min(58, maxLogoWidth);
    logoHeight = logoWidth * (logo.height / logo.width);
    doc.addImage(logo.dataUrl, 'PNG', PAGE_MARGIN, topY, logoWidth, logoHeight);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  const rightTitleY = topY + 6;
  doc.text(reportTitle, rightX, rightTitleY, { align: 'right', maxWidth: RIGHT_COLUMN_WIDTH });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  const generatedY = rightTitleY + 10;
  doc.text(`Generated: ${formatDate(generatedAt)}`, rightX, generatedY, { align: 'right', maxWidth: RIGHT_COLUMN_WIDTH });

  let rightBottomY = generatedY;
  if (dateRange) {
    rightBottomY = generatedY + 6;
    doc.text(dateRange, rightX, rightBottomY, { align: 'right', maxWidth: RIGHT_COLUMN_WIDTH });
  }

  const dividerY = Math.max(topY + logoHeight, rightBottomY) + 9;
  doc.setDrawColor(18, 58, 104);
  doc.setLineWidth(0.8);
  doc.line(PAGE_MARGIN, dividerY, rightX, dividerY);

  return dividerY + 8;
}

export function addProfessionalPdfFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rightX = pageWidth - PAGE_MARGIN;
  const leftColumnWidth = 62;
  const centerColumnWidth = 52;
  const centerX = PAGE_MARGIN + leftColumnWidth + centerColumnWidth / 2;
  let y = pageHeight - 38;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...FOOTER_TEXT_COLOR);

  DISCLAIMER_LINES.forEach((line) => {
    doc.text(line, PAGE_MARGIN, y);
    y += 3.8;
  });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN, y + 1, rightX, y + 1);

  doc.setDrawColor(...FOOTER_DIVIDER_COLOR);
  doc.setLineWidth(0.6);
  doc.line(PAGE_MARGIN, y + 3.5, rightX, y + 3.5);

  const footerY = y + 7.5;
  doc.setFontSize(8);
  doc.setTextColor(...FOOTER_TEXT_COLOR);
  doc.text(
    `© ${new Date().getFullYear()} Never Stop Dreaming Online Grocery.\nAll rights reserved.`,
    PAGE_MARGIN,
    footerY,
    { maxWidth: leftColumnWidth }
  );
  doc.text('Confidential - For Internal Use Only', centerX, footerY, {
    align: 'center',
    maxWidth: centerColumnWidth,
  });
  doc.text(`Page ${pageNumber} of ${totalPages}`, rightX, footerY, { align: 'right' });
}

export function getDateRangeFromValues(values: Array<string | Date | null | undefined>) {
  const dates = values
    .map((value) => (value ? new Date(value) : null))
    .filter((date): date is Date => Boolean(date) && !Number.isNaN(date!.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (!dates.length) {
    return null;
  }

  return `${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}`;
}
