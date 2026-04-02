import { formatDate } from '@/lib/utils/formatting';

type RelativeRange = 'day' | 'week' | 'month' | 'all';

interface PrintReportHeaderProps {
  reportTitle: string;
  dateRange?: string | null;
  generatedAt?: string | Date;
  className?: string;
}

export function getRelativeDateRangeLabel(range: RelativeRange): string {
  if (range === 'all') {
    return 'All Time';
  }

  const end = new Date();
  const start = new Date(end);

  if (range === 'week') {
    start.setDate(end.getDate() - 6);
  } else if (range === 'month') {
    start.setDate(end.getDate() - 29);
  }

  return `${formatDate(start)} — ${formatDate(end)}`;
}

export function PrintReportHeader({
  reportTitle,
  dateRange,
  generatedAt = new Date(),
  className,
}: PrintReportHeaderProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-[1.2fr_1fr] gap-8 items-start">
        <div>
          <img
            src="/nsd_light_long_logo.png"
            alt="Never Stop Dreaming Online Grocery"
            width={180}
            height={45}
            className="mb-1"
            style={{ width: 180, height: 45, objectFit: 'contain' }}
          />
        </div>

        <div className="text-right">
          <h2 className="text-[26px] font-bold leading-tight text-slate-900">
            {reportTitle}
          </h2>
          <p className="mt-2 text-[12px] text-slate-500">
            Generated: {formatDate(generatedAt)}
          </p>
          {dateRange ? <p className="mt-1 text-[12px] text-slate-500">{dateRange}</p> : null}
        </div>
      </div>

      <div className="mt-5 h-[3px] w-full rounded-full bg-[#123a68]" />
    </div>
  );
}
