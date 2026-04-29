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
          <p className="text-muted-foreground mb-4">
            Learn about our shipping options, delivery times, and policies.
          </p>
          <p className="text-xs text-muted-foreground mb-8 text-secondary">Last updated: March 2026</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Truck className="w-6 h-6" />
                Shipping Options
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">NSD Delivery</h3>
                  <p className="text-sm text-muted-foreground mb-2">1-3 business days within Cavite</p>
                  <p className="text-lg font-bold text-green-600">FREE</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                Delivery Areas
              </h2>
              <p className="text-muted-foreground">
                NSD currently delivers within select areas in Cavite only. Shipping fee configuration will be available 
                when delivery zones are defined. We are continuously working to expand our reach to serve more customers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Processing Time
              </h2>
              <p className="text-muted-foreground">
                Orders are typically processed within 1 business day. You will receive a confirmation email 
                once your order is ready for delivery.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Tracking Your Order
              </h2>
              <p className="text-muted-foreground">
                Once your order is dispatched, you will receive updates via email. You can also view your 
                order status and history in your account dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Free Shipping Policy</h2>
              <p className="text-muted-foreground">
                Currently, all orders qualify for FREE shipping as we roll out our delivery services across Cavite. 
                This policy is subject to change once delivery zones and corresponding fees are finalized.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

