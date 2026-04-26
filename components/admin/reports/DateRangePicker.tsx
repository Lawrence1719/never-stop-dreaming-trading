'use client';

import * as React from 'react';
import { 
  format, 
  startOfToday, 
  endOfToday, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear, 
  endOfYear, 
  subYears,
  isSameDay,
} from 'date-fns';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';

interface Preset {
  label: string;
  getRange: () => DateRange;
}

// Custom styled dropdown — plain React to avoid Radix nesting conflicts
function CalendarDropdown({ value, onChange, options }: {
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  options?: { value: string | number; label: string; disabled?: boolean }[];
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selectedLabel = options?.find(o => String(o.value) === String(value))?.label ?? String(value ?? '');

  React.useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={cn(
          "flex items-center gap-1.5 h-8 px-2.5 text-sm font-semibold rounded-lg transition-all duration-200",
          "bg-muted/50 hover:bg-primary/10 border border-border/60 hover:border-primary/40",
          open && "bg-primary/10 border-primary/40 ring-2 ring-primary/20",
        )}
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-primary/70 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className={cn(
          "absolute top-full left-0 mt-1 min-w-[110px] max-h-[220px] overflow-y-auto",
          "bg-popover/95 backdrop-blur-xl border border-border/40",
          "rounded-xl shadow-2xl p-1",
          "z-[9999]",
        )}>
          {options?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={(e) => {
                e.stopPropagation();
                onChange?.({ target: { value: String(opt.value) } } as React.ChangeEvent<HTMLSelectElement>);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors",
                "hover:bg-primary/10 hover:text-primary",
                String(opt.value) === String(value)
                  ? "text-primary font-bold bg-primary/5"
                  : "text-foreground/80 font-medium",
                opt.disabled && "opacity-40 cursor-not-allowed",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const PRESETS: Preset[] = [
  {
    label: 'Today',
    getRange: () => ({ from: startOfToday(), to: endOfToday() }),
  },
  {
    label: 'Yesterday',
    getRange: () => ({ from: subDays(startOfToday(), 1), to: subDays(endOfToday(), 1) }),
  },
  {
    label: 'This week',
    getRange: () => ({ from: startOfWeek(startOfToday()), to: endOfWeek(startOfToday()) }),
  },
  {
    label: 'Last week',
    getRange: () => {
      const start = startOfWeek(subDays(startOfToday(), 7));
      return { from: start, to: endOfWeek(start) };
    },
  },
  {
    label: 'This month',
    getRange: () => ({ from: startOfMonth(startOfToday()), to: endOfMonth(startOfToday()) }),
  },
  {
    label: 'Last month',
    getRange: () => {
      const start = startOfMonth(subMonths(startOfToday(), 1));
      return { from: start, to: endOfMonth(start) };
    },
  },
  {
    label: 'This year',
    getRange: () => ({ from: startOfYear(startOfToday()), to: endOfYear(startOfToday()) }),
  },
  {
    label: 'Last year',
    getRange: () => {
      const start = startOfYear(subYears(startOfToday(), 1));
      return { from: start, to: endOfYear(start) };
    },
  },
  {
    label: 'All time',
    getRange: () => ({ from: new Date(2020, 0, 1), to: endOfToday() }),
  },
];

interface DateRangePickerProps {
  value: { startDate: string; endDate: string };
  onChange: (range: { startDate: string; endDate: string }) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pick a date range',
  disabled = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Internal state for the calendar while the popover is open
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    if (value.startDate && value.endDate) {
      return { from: new Date(value.startDate), to: new Date(value.endDate) };
    }
    return undefined;
  });

  // Track the active preset based on current range
  const [activePreset, setActivePreset] = React.useState<string>('Custom');

  // Sync internal state when external value changes
  React.useEffect(() => {
    if (value.startDate && value.endDate) {
      setRange({ from: new Date(value.startDate), to: new Date(value.endDate) });
    } else {
      setRange(undefined);
    }
  }, [value.startDate, value.endDate, isOpen]);

  // Determine active preset when range changes
  React.useEffect(() => {
    if (!range?.from || !range?.to) {
      setActivePreset('Custom');
      return;
    }

    const matchedPreset = PRESETS.find(p => {
      const presetRange = p.getRange();
      return presetRange.from && presetRange.to && range.from && range.to && 
             isSameDay(presetRange.from, range.from) && 
             isSameDay(presetRange.to, range.to);
    });

    setActivePreset(matchedPreset ? matchedPreset.label : 'Custom');
  }, [range]);

  const handlePresetClick = (preset: Preset) => {
    setRange(preset.getRange());
  };

  const handleCancel = () => {
    setIsOpen(false);
    // Reset internal state back to prop value
    if (value.startDate && value.endDate) {
      setRange({ from: new Date(value.startDate), to: new Date(value.endDate) });
    } else {
      setRange(undefined);
    }
  };

  const handleApply = () => {
    if (range?.from && range?.to) {
      onChange({
        startDate: range.from.toISOString(),
        endDate: range.to.toISOString(),
      });
    } else if (!range?.from && !range?.to) {
      onChange({ startDate: '', endDate: '' });
    }
    setIsOpen(false);
  };

  const formattedValue = (value.startDate && value.endDate)
    ? `${format(new Date(value.startDate), 'MMM dd, yyyy')} — ${format(new Date(value.endDate), 'MMM dd, yyyy')}`
    : '';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full sm:w-[320px] pl-3 text-left font-normal h-10 relative group bg-background/40 backdrop-blur-sm border-border/60 hover:border-primary/40 transition-all rounded-xl shadow-sm hover:shadow-md",
            (!value.startDate || !value.endDate) && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg transition-colors",
              (value.startDate && value.endDate) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground opacity-50"
            )}>
              <CalendarDays className="h-3.5 w-3.5" />
            </div>
            <span className={cn(
              "truncate font-medium tracking-tight text-sm",
              (!value.startDate || !value.endDate) && "opacity-60"
            )}>
              {(value.startDate && value.endDate) ? formattedValue : placeholder}
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-auto p-0 shadow-2xl border-border/40 bg-popover/95 backdrop-blur-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" 
        align="end" 
        side="bottom"
        sideOffset={8}
      >
        <div className="flex flex-col">
          {/* Main Content Area (Sidebar + Calendar) */}
          <div className="flex flex-col sm:flex-row">
            {/* Sidebar */}
            <div className="w-full sm:w-[160px] border-r border-border/40 bg-muted/20 p-2 flex flex-col justify-start gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium relative",
                    activePreset === preset.label 
                      ? "bg-primary/10 text-primary font-bold" 
                      : "hover:bg-muted text-foreground/80 hover:text-foreground"
                  )}
                >
                  {activePreset === preset.label && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-md" />
                  )}
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendar Area */}
            <div className="p-4 bg-background/50">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={2}
                initialFocus
                captionLayout="dropdown"
                fromYear={2020}
                toYear={new Date().getFullYear() + 2}
                className="p-0"
                classNames={{
                  months: "flex flex-col sm:flex-row gap-6 relative",
                  month: "space-y-4",
                  dropdowns: "flex items-center gap-2 justify-center w-full h-9",
                  caption_label: "hidden",
                  table: "w-full border-collapse",
                  head_row: "flex w-full mb-2",
                  head_cell: "text-muted-foreground rounded-md flex-1 font-semibold text-[11px] uppercase tracking-widest text-center",
                  row: "flex w-full mt-1",
                  cell: "relative h-9 w-9 flex-1 text-center p-0 focus-within:relative focus-within:z-20",
                  day: cn(
                    "h-9 w-9 p-0 font-normal rounded-full transition-all duration-200 flex items-center justify-center hover:bg-primary/10 hover:text-primary",
                  ),
                  range_start: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-l-full rounded-r-none font-bold shadow-md",
                  range_end: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-r-full rounded-l-none font-bold shadow-md",
                  range_middle: "bg-primary/10 text-primary rounded-none hover:bg-primary/20",
                  day_selected: "font-bold",
                  day_today: "bg-accent/30 text-accent-foreground font-bold underline decoration-primary decoration-2 underline-offset-4",
                  day_outside: "text-muted-foreground/30 opacity-50",
                  day_disabled: "text-muted-foreground/30 opacity-50 cursor-not-allowed",
                }}
                components={{
                  Dropdown: CalendarDropdown as any,
                }}
              />
            </div>
          </div>

          {/* Footer Area (Spans full width) */}
          <div className="p-3 border-t border-border/40 bg-muted/10 flex flex-col sm:flex-row items-center gap-4">
            {/* Custom button aligned with sidebar width */}
            <div className="w-full sm:w-[144px] shrink-0 ml-2">
              <button
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium relative",
                  activePreset === 'Custom'
                    ? "bg-primary/10 text-primary font-bold" 
                    : "text-foreground/80 hover:bg-muted"
                )}
                onClick={() => setActivePreset('Custom')}
              >
                {activePreset === 'Custom' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-md" />
                )}
                Custom
              </button>
            </div>

            <div className="flex flex-1 items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="bg-background border border-border/60 rounded-md px-3 py-1.5 shadow-sm min-w-[120px] text-center">
                  {range?.from ? format(range.from, 'MMM dd, yyyy') : 'Start date'}
                </div>
                <span className="text-muted-foreground">—</span>
                <div className="bg-background border border-border/60 rounded-md px-3 py-1.5 shadow-sm min-w-[120px] text-center">
                  {range?.to ? format(range.to, 'MMM dd, yyyy') : 'End date'}
                </div>
              </div>
              <div className="flex items-center gap-2 pl-4">
                <Button variant="ghost" onClick={handleCancel} className="rounded-lg">
                  Cancel
                </Button>
                <Button onClick={handleApply} className="rounded-lg shadow-md font-bold px-6">
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
