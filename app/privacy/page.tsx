"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CMSPageContent } from "@/components/cms/CMSPageContent";

export default function PrivacyPage() {
  const staticContent = (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold mb-3">Introduction</h2>
        <p className="text-muted-foreground">
          Never Stop Dreaming Trading ("we" or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-3">Information We Collect</h2>
        <p className="text-muted-foreground">We may collect information about you in a variety of ways including:</p>
        <ul className="text-muted-foreground space-y-2 mt-3 ml-4 list-disc">
          <li>Information you provide directly (name, email, phone, address)</li>
          <li>Information collected automatically (IP address, browser type, pages visited)</li>
          <li>Information from third parties (payment processors, analytics)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-3">Use of Your Information</h2>
        <p className="text-muted-foreground">
          We use the information we collect to process transactions, send promotional communications, improve our services, and comply with legal obligations.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-3">Protection of Your Information</h2>
        <p className="text-muted-foreground">
          We use administrative, technical, and physical security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-3">Contact Us</h2>
        <p className="text-muted-foreground">
          If you have questions about this Privacy Policy, please contact us at privacy@neverstoptrading.com.
        </p>
      </section>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <CMSPageContent slug="privacy" fallback={staticContent} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
