"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CMSPageContent } from "@/components/cms/CMSPageContent";
import { useAuth } from "@/lib/context/auth-context";

export default function AboutPage() {
  const { user } = useAuth();

  const aboutUsFallback = (
    <>
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
        <p className="text-lg text-muted-foreground">
          To make quality groceries easy to find, fairly priced, and simple to order—whether you are feeding your family, restocking the pantry, or grabbing household must-haves. We focus on reliable fulfillment and a smooth shopping experience from browse to delivery.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Our Story</h2>
        <p className="text-muted-foreground mb-4">
          Never Stop Dreaming Trading started with a simple idea: neighborhood grocery values—fresh thinking, honest selection, and dependable service—should carry over to shopping online. What began as a small operation has grown into a store families trust for everyday essentials and weekly stock-ups.
        </p>
        <p className="text-muted-foreground">
          We curate categories from food and pantry to beverages, personal care, household items, and refrigerated and frozen goods, so you can shop the aisles you know in one place. Our team works closely with suppliers and couriers to keep shelves—and your cart—moving.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Why Shop With Us?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "Curated selection",
              desc: "Pantry, drinks, home care, personal care, and chilled & frozen—organized so you can find what you need quickly.",
            },
            {
              title: "Straightforward pricing",
              desc: "Clear product information and pricing so you can plan your budget before you check out.",
            },
            {
              title: "Order support",
              desc: "Questions about an item or your order? Our team is here to help you get answers and resolve issues.",
            },
            {
              title: "Built for busy households",
              desc: "Shop when it suits you, track orders, and come back for promos and new arrivals—without fighting traffic or long lines.",
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
          Behind every category and delivery is a team of merchants, operations specialists, and customer advocates who care about getting your groceries right.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "John Smith", role: "Founder & CEO", expertise: "Retail & supply chain leadership" },
            { name: "Sarah Johnson", role: "Head of Operations", expertise: "Logistics, inventory & fulfillment" },
            { name: "Mike Chen", role: "Customer Experience", expertise: "Support, quality & vendor partnerships" },
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
    </div>

    {user ? (
      <section className="mt-12 bg-primary text-primary-foreground rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready for Your Next Order?</h2>
        <p className="mb-6">Browse our latest arrivals and grab the freshest deals today.</p>
        <Link
          href="/products"
          className="inline-block px-8 py-3 bg-primary-foreground text-primary rounded-lg hover:opacity-90 transition-opacity font-semibold"
        >
          Shop Fresh Deals Now
        </Link>
      </section>
    ) : (
      <section className="mt-12 bg-primary text-primary-foreground rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Fill Your Pantry?</h2>
        <p className="mb-6">Create a free account to browse products, save favorites, and check out faster.</p>
        <Link
          href="/register"
          className="inline-block px-8 py-3 bg-primary-foreground text-primary rounded-lg hover:opacity-90 transition-opacity font-semibold"
        >
          Create Free Account
        </Link>
      </section>
    )}
    </>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold mb-2">About Us</h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-3xl">
            Never Stop Dreaming Trading is your online grocery for pantry staples, beverages, household and personal care, and chilled & frozen items—here is who we are and what we stand for.
          </p>

          <CMSPageContent slug="about" fallback={aboutUsFallback} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
