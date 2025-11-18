import { formatPrice } from "@/lib/utils/formatting";

interface CartSummaryProps {
  subtotal: number;
  shipping?: number;
  tax?: number;
  discount?: number;
}

export function CartSummary({ subtotal, shipping = 10, tax = 0, discount = 0 }: CartSummaryProps) {
  const total = subtotal + shipping + tax - discount;

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h3 className="font-semibold text-lg">Order Summary</h3>

      <div className="space-y-3 border-b border-border pb-4">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Shipping</span>
          <span>{formatPrice(shipping)}</span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>{formatPrice(tax)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span className="text-primary">{formatPrice(total)}</span>
      </div>
    </div>
  );
}
