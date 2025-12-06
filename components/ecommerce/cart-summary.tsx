import { formatPrice } from "@/lib/utils/formatting";
import { useShipping } from "@/lib/context/shipping-context";

interface CartSummaryProps {
  subtotal: number;
  tax?: number;
  discount?: number;
  showShipping?: boolean;
}

export function CartSummary({ subtotal, tax = 0, discount = 0, showShipping = true }: CartSummaryProps) {
  const { calculateShipping, isFreeShipping } = useShipping();
  const shipping = showShipping ? calculateShipping(subtotal) : 0;
  const total = subtotal + shipping + tax - discount;
  const qualifiesForFreeShipping = isFreeShipping(subtotal);

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h3 className="font-semibold text-lg">Order Summary</h3>

      <div className="space-y-3 border-b border-border pb-4">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {showShipping && (
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            {qualifiesForFreeShipping ? (
              <span className="text-green-600 font-semibold">FREE</span>
            ) : (
              <span>{formatPrice(shipping)}</span>
            )}
          </div>
        )}
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
