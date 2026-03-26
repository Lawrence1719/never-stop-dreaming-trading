"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CMSPageContent } from "@/components/cms/CMSPageContent";

export default function AboutPage() {
  const staticContent = (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
        <p className="text-lg text-muted-foreground">
          To empower traders and investors worldwide with premium tools, education, and analytics that enable them to make informed decisions and achieve financial success in the markets.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Our Story</h2>
        <p className="text-muted-foreground mb-4">
          Founded in 2020, Never Stop Dreaming Trading emerged from a passion for democratizing access to professional-grade trading tools. What started as a small project has grown into a trusted platform serving thousands of traders globally.
        </p>
        <p className="text-muted-foreground">
          We believe that everyone deserves access to quality trading education and powerful analytics, regardless of their experience level. Our platform combines cutting-edge technology with user-friendly design to make professional trading accessible to all.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Why Choose Us?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "Expert Tools",
              desc: "Professional-grade analytics and trading software built by experienced traders.",
            },
            {
              title: "Comprehensive Education",
              desc: "Learn from industry experts through structured courses and learning materials.",
            },
            {
              title: "24/7 Support",
              desc: "Our dedicated support team is always ready to help you succeed.",
            },
            {
              title: "Community",
              desc: "Join thousands of traders sharing strategies and insights.",
            },
          ].map((item, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Our Team</h2>
        <p className="text-muted-foreground mb-6">
          Our team consists of experienced traders, software engineers, and educators committed to your success.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "John Smith", role: "Founder & CEO", expertise: "15+ years trading" },
            { name: "Sarah Johnson", role: "CTO", expertise: "Software architecture expert" },
            { name: "Mike Chen", role: "Head of Education", expertise: "Market analyst & trainer" },
          ].map((member, i) => (
            <div key={i} className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full mx-auto mb-4" />
              <h3 className="font-bold">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.role}</p>
              <p className="text-xs text-muted-foreground mt-1">{member.expertise}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary text-primary-foreground rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Start Trading?</h2>
        <p className="mb-6">Join thousands of traders already using our platform.</p>
        <a
          href="/register"
          className="inline-block px-8 py-3 bg-primary-foreground text-primary rounded-lg hover:opacity-90 transition-opacity font-semibold"
        >
          Create Free Account
        </a>
      </section>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold mb-8">About Never Stop Dreaming Trading</h1>

          <CMSPageContent slug="about" fallback={staticContent} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
