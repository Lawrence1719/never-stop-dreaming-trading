import { formatPrice } from "@/lib/utils/formatting";
import { useShipping } from "@/lib/context/shipping-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Truck, Zap, Package } from "lucide-react";

interface ShippingOptionsProps {
  subtotal: number;
  className?: string;
}

export function ShippingOptions({ subtotal, className = "" }: ShippingOptionsProps) {
  const { shippingMethod, setShippingMethod, shippingRates, isFreeShipping } = useShipping();
  const freeShipping = isFreeShipping(subtotal);

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Shipping Method</h3>
      </div>

      {freeShipping && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            🎉 You qualify for FREE shipping!
          </p>
        </div>
      )}

      <RadioGroup value={shippingMethod} onValueChange={(value) => setShippingMethod(value as "standard" | "express")}>
        <div className="space-y-3">
          {/* Standard Shipping */}
          <div
            className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              shippingMethod === "standard"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => setShippingMethod("standard")}
          >
            <RadioGroupItem value="standard" id="standard" className="mt-1" />
            <Label htmlFor="standard" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Standard Shipping</span>
              </div>
              <p className="text-sm text-muted-foreground">Delivery in 5-7 business days</p>
              <p className="text-sm font-semibold mt-1">
                {freeShipping ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  formatPrice(shippingRates.standard)
                )}
              </p>
            </Label>
          </div>

          {/* Express Shipping */}
          <div
            className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              shippingMethod === "express"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => setShippingMethod("express")}
          >
            <RadioGroupItem value="express" id="express" className="mt-1" />
            <Label htmlFor="express" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="font-medium">Express Shipping</span>
              </div>
              <p className="text-sm text-muted-foreground">Delivery in 2-3 business days</p>
              <p className="text-sm font-semibold mt-1">
                {freeShipping ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  formatPrice(shippingRates.express)
                )}
              </p>
            </Label>
          </div>
        </div>
      </RadioGroup>

      {!freeShipping && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Add {formatPrice(shippingRates.freeThreshold - subtotal)} more to get <strong>FREE shipping</strong>!
          </p>
        </div>
      )}
    </div>
  );
}
