interface PrintReportFooterProps {
  className?: string;
  previewPageLabel?: string;
}

export function PrintReportFooter({ className, previewPageLabel = 'Page 1 of 1' }: PrintReportFooterProps) {
  return (
    <div className={className}>
      <div className="text-[10px] italic leading-4 text-slate-500">
        <p>This report is generated automatically by the Never Stop Dreaming system.</p>
        <p>
          The information contained in this document is confidential and intended
          solely for authorized personnel. Unauthorized distribution, copying, or
          use of this report is strictly prohibited. Data accuracy is based on
          records available at the time of generation.
        </p>
      </div>

      <div className="mt-3 h-px w-full bg-slate-300" />
      <div className="mt-3 h-px w-full bg-[#123a68]" />

      <div className="mt-3 grid grid-cols-3 items-center gap-4 text-[10px] text-slate-600">
        <p className="text-left">© 2026 Never Stop Dreaming Online Grocery. All rights reserved.</p>
        <p className="text-center">Confidential — For Internal Use Only</p>
        <p className="text-right">
          <span className="screen-footer-page">{previewPageLabel}</span>
          <span className="print-footer-page" />
        </p>
      </div>
    </div>
  );
}
