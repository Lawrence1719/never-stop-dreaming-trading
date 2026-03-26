"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChevronDown, Loader2 } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface GroupedFAQ {
  category: string;
  items: FAQItem[];
}

export default function FAQPage() {
  const [groupedFaqs, setGroupedFaqs] = useState<GroupedFAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cms/faqs');
      if (!res.ok) throw new Error('Failed to fetch FAQs');
      const payload = await res.json();
      const data: FAQItem[] = payload.data || [];

      // Group by category
      const groups: Record<string, FAQItem[]> = {};
      data.forEach(item => {
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item);
      });

      const formattedGroups = Object.keys(groups).map(category => ({
        category,
        items: groups[category]
      }));

      setGroupedFaqs(formattedGroups);
    } catch (err) {
      console.error('Error loading FAQs:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Loading answers...</p>
            </div>
          ) : groupedFaqs.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              No FAQs available at the moment. Please check back later.
            </div>
          ) : (
            <div className="space-y-8">
              {groupedFaqs.map((section) => (
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
                            <p className="font-medium text-left">{item.question}</p>
                            <ChevronDown
                              className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="px-4 py-3 border-t border-border bg-secondary/5">
                              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{item.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

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
