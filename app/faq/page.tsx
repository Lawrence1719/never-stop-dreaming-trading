"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  category: string;
  items: Array<{ q: string; a: string }>;
}

const faqs: FAQItem[] = [
  {
    category: "Orders & Shipping",
    items: [
      {
        q: "How long does shipping take?",
        a: "Shipping typically takes 5-7 business days for standard shipping, 2-3 days for express, and next business day for overnight. Times may vary based on location.",
      },
      {
        q: "Do you ship internationally?",
        a: "Currently, we ship to most countries in North America and Europe. Check our shipping page for detailed coverage.",
      },
      {
        q: "Can I change my shipping address?",
        a: "Yes, you can change your address before your order ships. Once shipped, contact our support team immediately.",
      },
    ],
  },
  {
    category: "Returns & Refunds",
    items: [
      {
        q: "What is your return policy?",
        a: "We offer a 30-day money-back guarantee for most products. Software subscriptions can be cancelled anytime.",
      },
      {
        q: "How do I initiate a return?",
        a: "Contact our support team with your order number. We'll provide a prepaid return label.",
      },
      {
        q: "When will I get my refund?",
        a: "Refunds are processed within 5-7 business days after we receive and inspect your return.",
      },
    ],
  },
  {
    category: "Payment",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards, debit cards, PayPal, and bank transfers.",
      },
      {
        q: "Is my payment information secure?",
        a: "Yes, we use industry-standard SSL encryption to protect all payment information.",
      },
      {
        q: "Can I use a coupon code?",
        a: "Yes, enter your coupon code at checkout. Some codes have restrictions or expiry dates.",
      },
    ],
  },
  {
    category: "Account",
    items: [
      {
        q: "How do I create an account?",
        a: "Click the Register button and fill in your details. You'll receive a confirmation email.",
      },
      {
        q: "Can I change my email?",
        a: "Yes, go to Profile > Edit Profile to update your email address.",
      },
      {
        q: "How do I reset my password?",
        a: "Click 'Forgot password?' on the login page and follow the instructions sent to your email.",
      },
    ],
  },
];

export default function FAQPage() {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold mb-4 text-center">Frequently Asked Questions</h1>
          <p className="text-center text-muted-foreground mb-12">
            Find answers to common questions about our products and services
          </p>

          <div className="space-y-8">
            {faqs.map((section) => (
              <div key={section.category}>
                <h2 className="text-2xl font-bold mb-4">{section.category}</h2>
                <div className="space-y-2">
                  {section.items.map((item, i) => {
                    const itemId = `${section.category}-${i}`;
                    const isExpanded = expandedItems.includes(itemId);

                    return (
                      <div key={itemId} className="bg-card border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleItem(itemId)}
                          className="w-full flex items-center justify-between p-4 hover:bg-secondary/10 transition-colors"
                        >
                          <p className="font-medium text-left">{item.q}</p>
                          <ChevronDown
                            className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="px-4 py-3 border-t border-border bg-secondary/5">
                            <p className="text-muted-foreground text-sm">{item.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-primary text-primary-foreground rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
            <p className="mb-4">Can't find what you're looking for?</p>
            <a
              href="/contact"
              className="inline-block px-6 py-2 bg-primary-foreground text-primary rounded-lg hover:opacity-90 transition-opacity font-semibold"
            >
              Contact Us
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
