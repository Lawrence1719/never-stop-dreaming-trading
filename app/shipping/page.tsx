import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Truck, MapPin, Clock, Package } from 'lucide-react';

export default function ShippingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold mb-4">Shipping Information</h1>
          <p className="text-muted-foreground mb-8">
            Learn about our shipping options, delivery times, and policies.
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Truck className="w-6 h-6" />
                Shipping Options
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Standard Shipping</h3>
                  <p className="text-sm text-muted-foreground mb-2">5-7 business days</p>
                  <p className="text-lg font-bold">$5.99</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Express Shipping</h3>
                  <p className="text-sm text-muted-foreground mb-2">2-3 business days</p>
                  <p className="text-lg font-bold">$12.99</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Overnight</h3>
                  <p className="text-sm text-muted-foreground mb-2">Next business day</p>
                  <p className="text-lg font-bold">$24.99</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                Shipping Locations
              </h2>
              <p className="text-muted-foreground">
                We currently ship to most countries in North America and Europe. For digital products and software subscriptions, 
                delivery is instant via email. Physical products are shipped from our warehouse locations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Processing Time
              </h2>
              <p className="text-muted-foreground">
                Orders are typically processed within 1-2 business days. During peak seasons or sales, processing may take up to 3-4 business days. 
                You will receive a confirmation email with tracking information once your order ships.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Tracking Your Order
              </h2>
              <p className="text-muted-foreground">
                Once your order ships, you'll receive a tracking number via email. You can use this number to track your package 
                on the carrier's website. You can also view your order status and tracking information in your account's order history.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">International Shipping</h2>
              <p className="text-muted-foreground mb-3">
                We ship internationally to select countries. International orders may be subject to:
              </p>
              <ul className="text-muted-foreground space-y-2 ml-4">
                <li>• Customs duties and taxes (paid by recipient)</li>
                <li>• Extended delivery times (7-14 business days)</li>
                <li>• Additional shipping fees</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Free Shipping</h2>
              <p className="text-muted-foreground">
                Free standard shipping is available on orders over $50. This applies to physical products only. 
                Digital products and subscriptions are always delivered instantly at no additional cost.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

