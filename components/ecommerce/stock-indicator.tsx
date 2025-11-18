import { Badge } from "@/components/ui/badge";

interface StockIndicatorProps {
  stock: number;
}

export function StockIndicator({ stock }: StockIndicatorProps) {
  if (stock === 0) {
    return <Badge variant="destructive">Out of Stock</Badge>;
  } else if (stock < 10) {
    return <Badge variant="outline">Only {stock} Left</Badge>;
  } else if (stock < 50) {
    return <Badge>Limited Stock</Badge>;
  } else {
    return <Badge variant="secondary">In Stock</Badge>;
  }
}
