import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface StockIndicatorProps {
  stock: number;
  reorderThreshold?: number;
  showDetailed?: boolean;
}

export function StockIndicator({ stock, reorderThreshold = 10, showDetailed = true }: StockIndicatorProps) {
  if (stock === 0) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Out of Stock
        </Badge>
        {showDetailed && (
          <span className="text-sm text-muted-foreground">We'll notify you when this item is back in stock</span>
        )}
      </div>
    );
  } else if (stock <= reorderThreshold) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Only {stock} left
        </Badge>
        {showDetailed && (
          <span className="text-sm text-muted-foreground">Order soon to avoid missing out</span>
        )}
      </div>
    );
  } else if (stock < 50) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          Limited Stock ({stock} units)
        </Badge>
      </div>
    );
  } else {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3" />
          In Stock
        </Badge>
        {showDetailed && stock >= 100 && (
          <span className="text-sm text-muted-foreground">({stock}+ units available)</span>
        )}
      </div>
    );
  }
}
