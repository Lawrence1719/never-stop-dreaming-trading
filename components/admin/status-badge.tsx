'use client';

import { Clock, CheckCircle, Package, Truck, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<string, { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className: string;
}> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  },
  paid: {
    icon: CheckCircle,
    label: 'Paid',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  processing: {
    icon: Package,
    label: 'Processing',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  shipped: {
    icon: Truck,
    label: 'Shipped',
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  },
  delivered: {
    icon: CheckCircle,
    label: 'Delivered',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  duplicate: {
    icon: AlertTriangle,
    label: 'Duplicate',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  },
};

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status.toLowerCase()] || {
    icon: Clock,
    label: status,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span className="capitalize">{config.label}</span>
    </Badge>
  );
}





