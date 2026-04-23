'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X, Clock, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  defaultHour?: number;
  defaultMinute?: number;
  disabled?: boolean;
}

const MINUTES = ['00', '15', '30', '45'];

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick a date and time',
  defaultHour = 0,
  defaultMinute = 0,
  disabled = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const newDate = new Date(date);
    if (!value) {
      newDate.setHours(defaultHour, defaultMinute, 0, 0);
    } else {
      newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
    }
    onChange(newDate);
  };

  const handleTimeChange = (type: 'hour' | 'minute', val: string) => {
    if (!value) return;
    
    const newDate = new Date(value);
    if (type === 'hour') {
      newDate.setHours(parseInt(val));
    } else {
      newDate.setMinutes(parseInt(val));
    }
    onChange(newDate);
  };

  const clearValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const formattedValue = value ? format(value, 'MMM dd, yyyy HH:mm') : '';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full pl-4 text-left font-normal h-12 relative group bg-background/40 backdrop-blur-sm border-border/60 hover:border-primary/40 transition-all rounded-xl shadow-sm hover:shadow-md",
            !value && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-1.5 rounded-lg transition-colors",
              value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground opacity-50"
            )}>
              <CalendarDays className="h-4 w-4" />
            </div>
            <span className={cn(
              "truncate font-medium tracking-tight",
              !value && "opacity-60"
            )}>
              {value ? formattedValue : placeholder}
            </span>
          </div>
          
          {value && !disabled && (
            <div
              onClick={clearValue}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </div>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[300px] p-0 shadow-2xl border-border/40 bg-popover/95 backdrop-blur-md rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" 
        align="start" 
        side="bottom"
        sideOffset={8}
        avoidCollisions={true}
        collisionPadding={16}
      >
        <div className="p-4 bg-muted/10">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleDateSelect}
            initialFocus
            className="p-0"
            classNames={{
              months: "w-full",
              month: "w-full space-y-4",
              caption: "flex items-center justify-between h-10 px-2 relative",
              caption_label: "text-sm font-bold tracking-tight ml-2",
              nav: "flex items-center gap-1",
              nav_button: "h-8 w-8 bg-transparent p-0 opacity-60 hover:opacity-100 hover:bg-muted rounded-full transition-all",
              table: "w-full border-collapse",
              head_row: "flex w-full mb-2",
              head_cell: "text-muted-foreground rounded-md flex-1 font-semibold text-[11px] uppercase tracking-widest",
              row: "flex w-full mt-1",
              cell: "relative h-9 w-9 flex-1 text-center p-0 focus-within:relative focus-within:z-20",
              day: cn(
                "h-9 w-9 p-0 font-normal rounded-full transition-all duration-200 flex items-center justify-center hover:bg-primary/10 hover:text-primary",
              ),
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-lg shadow-primary/25 scale-110 font-bold",
              day_today: "bg-accent/30 text-accent-foreground font-bold underline decoration-primary decoration-2 underline-offset-4",
              day_outside: "text-muted-foreground/30 opacity-50",
              day_disabled: "text-muted-foreground/30 opacity-50 cursor-not-allowed",
            }}
          />
        </div>
        
        <div className="p-4 bg-background/50 border-t border-border/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Set Time</span>
            </div>
            {value && (
              <span className="text-[10px] font-mono font-medium text-primary px-2 py-0.5 bg-primary/5 rounded-md border border-primary/10">
                {format(value, 'HH:mm')}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 bg-muted/20 p-3 rounded-xl border border-border/30">
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-black ml-1">Hour</span>
              <Input
                type="number"
                min={0}
                max={23}
                value={value ? value.getHours().toString().padStart(2, '0') : "00"}
                onChange={(e) => {
                  const val = Math.min(23, Math.max(0, parseInt(e.target.value) || 0));
                  handleTimeChange('hour', val.toString());
                }}
                disabled={!value}
                className="h-9 text-center text-sm font-bold bg-background/50 border-border/40 rounded-lg focus-visible:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            
            <div className="text-muted-foreground/30 font-light text-2xl mt-4">:</div>
            
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-black ml-1">Minute</span>
              <Select
                value={value ? value.getMinutes().toString().padStart(2, '0') : undefined}
                onValueChange={(m) => handleTimeChange('minute', m)}
                disabled={!value}
              >
                <SelectTrigger className="h-9 text-sm font-bold bg-background/50 border-border/40 rounded-lg focus:ring-primary/20">
                  <SelectValue placeholder="--" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border/40 rounded-xl shadow-2xl">
                  {MINUTES.map((m) => (
                    <SelectItem 
                      key={m} 
                      value={m} 
                      className="text-xs font-medium focus:bg-primary/10 focus:text-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:font-bold rounded-md my-0.5"
                    >
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {value && (
            <div className="mt-4 pt-3 border-t border-border/20">
              <p className="text-[10px] text-muted-foreground/60 text-center italic">
                Will active starting {format(value, 'MMM dd')} at {format(value, 'HH:mm')}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
