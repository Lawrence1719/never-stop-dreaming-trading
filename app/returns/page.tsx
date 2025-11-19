import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { RotateCcw, Clock, Package, CheckCircle } from 'lucide-react';

export default function ReturnsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold mb-4">Returns & Refunds</h1>
          <p className="text-muted-foreground mb-8">
            Our return policy and refund process explained.
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <RotateCcw className="w-6 h-6" />
                Return Policy
              </h2>
              <p className="text-muted-foreground mb-4">
                We offer a 30-day money-back guarantee for most physical products. Items must be returned in their original condition, 
                unopened, and with all original packaging and accessories included.
              </p>
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Eligible for Returns:</h3>
                <ul className="text-muted-foreground space-y-1 ml-4">
                  <li>• Physical products (books, workbooks, physical software packages)</li>
                  <li>• Items returned within 30 days of purchase</li>
                  <li>• Products in original, unopened condition</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Return Process
              </h2>
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Step 1: Contact Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Contact our support team with your order number to initiate a return. You can reach us through the contact page or email.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Step 2: Receive Return Label</h3>
                  <p className="text-sm text-muted-foreground">
                    We'll provide you with a prepaid return shipping label and return authorization number.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Step 3: Ship Your Return</h3>
                  <p className="text-sm text-muted-foreground">
                    Package the item securely in its original packaging and ship it back using the provided label.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Step 4: Receive Refund</h3>
                  <p className="text-sm text-muted-foreground">
                    Once we receive and inspect your return, we'll process your refund within 5-7 business days.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Non-Returnable Items
              </h2>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-muted-foreground mb-3">The following items are not eligible for returns:</p>
                <ul className="text-muted-foreground space-y-1 ml-4">
                  <li>• Digital products and software subscriptions (can be cancelled anytime)</li>
                  <li>• Opened software packages</li>
                  <li>• Items damaged by misuse or normal wear</li>
                  <li>• Items returned after 30 days</li>
                  <li>• Custom or personalized products</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                Refund Processing
              </h2>
              <p className="text-muted-foreground mb-3">
                Refunds are processed to the original payment method used for the purchase. Processing times vary by payment method:
              </p>
              <ul className="text-muted-foreground space-y-2 ml-4">
                <li>• Credit/Debit Cards: 5-7 business days</li>
                <li>• PayPal: 3-5 business days</li>
                <li>• Bank Transfer: 7-10 business days</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Note: Original shipping costs are non-refundable unless the return is due to our error or a defective product.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Exchanges</h2>
              <p className="text-muted-foreground">
                We currently do not offer direct exchanges. If you need a different size, color, or product, please return the original item 
                for a refund and place a new order for the item you want.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Damaged or Defective Items</h2>
              <p className="text-muted-foreground">
                If you receive a damaged or defective item, please contact us immediately with photos of the damage. 
                We'll send a replacement at no cost or provide a full refund, including return shipping.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

