"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { STORE_CONTACT } from "@/lib/store-contact";

const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

export default function ContactPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Success",
        description: "Message sent successfully!",
        variant: "success",
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold mb-12 text-center">Contact Us</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {[
              { icon: Mail, label: "Email", value: STORE_CONTACT.email, href: `mailto:${STORE_CONTACT.email}` },
              { icon: Phone, label: "Phone", value: STORE_CONTACT.phone, href: STORE_CONTACT.phoneTelHref },
              { icon: MapPin, label: "Address", value: STORE_CONTACT.address },
            ].map((contact, i) => {
              const Icon = contact.icon;
              return (
                <div key={i} className="bg-card border border-border rounded-lg p-6 text-center">
                  <Icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <p className="text-sm text-muted-foreground mb-1">{contact.label}</p>
                  {"href" in contact && contact.href ? (
                    <a href={contact.href} className="font-medium text-primary hover:underline">
                      {contact.value}
                    </a>
                  ) : (
                    <p className="font-medium">{contact.value}</p>
                  )}
                </div>
              );
            })}
          </div>

          <section className="mb-12" aria-labelledby="store-location-heading">
            <h2 id="store-location-heading" className="text-2xl font-bold mb-6 text-center lg:text-left">
              Visit our store
            </h2>
            <div className="rounded-xl border border-[#00BFFF]/35 bg-card p-4 sm:p-6 shadow-[0_0_24px_rgba(0,191,255,0.12)]">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:items-stretch">
                <div
                  className="h-[400px] w-full overflow-hidden rounded-[12px] border border-[#00BFFF]/40 shadow-[0_0_20px_rgba(0,191,255,0.15)] bg-muted/20"
                  role="presentation"
                >
                  <MapComponent />
                </div>
                <div className="flex flex-col justify-center space-y-5 text-left">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{STORE_CONTACT.storeName}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {STORE_CONTACT.listingName} · {STORE_CONTACT.listingCategory}
                    </p>
                    <p className="text-muted-foreground flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-1 shrink-0 text-[#00BFFF]" aria-hidden />
                      <span>{STORE_CONTACT.address}</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 mt-1 shrink-0 text-[#00BFFF]" aria-hidden />
                    <a href={STORE_CONTACT.phoneTelHref} className="text-foreground hover:text-primary transition-colors">
                      {STORE_CONTACT.phone}
                    </a>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-1 shrink-0 text-[#00BFFF]" aria-hidden />
                    <a href={`mailto:${STORE_CONTACT.email}`} className="text-foreground hover:text-primary transition-colors">
                      {STORE_CONTACT.email}
                    </a>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-1 shrink-0 text-[#00BFFF]" aria-hidden />
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        {STORE_CONTACT.hoursWeekdayLabel}: {STORE_CONTACT.hoursWeekdayTime}
                      </p>
                      <p>
                        {STORE_CONTACT.hoursWeekendLabel}: {STORE_CONTACT.hoursWeekendTime}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>

            {/* Business Hours & Info */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Business Hours</h2>
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="font-medium">{STORE_CONTACT.hoursWeekdayLabel}</p>
                  <p className="text-muted-foreground">{STORE_CONTACT.hoursWeekdayTime}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="font-medium">{STORE_CONTACT.hoursWeekendLabel}</p>
                  <p className="text-muted-foreground">{STORE_CONTACT.hoursWeekendTime}</p>
                </div>
              </div>

              <h3 className="text-xl font-bold mt-8 mb-4">Frequently Asked Questions</h3>
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Have questions? Check out our <a href="/faq" className="text-primary hover:underline">FAQ page</a> for quick answers.
                </p>
              </div>

              <h3 className="text-xl font-bold mt-8 mb-4">Follow Us</h3>
              <div className="flex gap-4">
                {["Facebook", "Twitter", "LinkedIn", "Instagram"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {social}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
