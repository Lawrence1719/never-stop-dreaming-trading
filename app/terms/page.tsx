import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { formatDate } from "@/lib/utils/formatting";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold mb-4">Terms & Conditions</h1>
          <p className="text-muted-foreground mb-8">Last updated: {formatDate(new Date())}</p>

          <div className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-3">1. Agreement to Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Never Stop Dreaming Trading platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">2. Use License</h2>
              <p className="text-muted-foreground">
                Permission is granted to temporarily download one copy of the materials (information or software) on Never Stop Dreaming Trading for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="text-muted-foreground space-y-2 mt-3 ml-4">
                <li>Modifying or copying the materials</li>
                <li>Using the materials for any commercial purpose or for any public display</li>
                <li>Attempting to decompile or reverse engineer any software on the website</li>
                <li>Transferring the materials to another person or "mirror" the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">3. Disclaimer</h2>
              <p className="text-muted-foreground">
                The materials on Never Stop Dreaming Trading are provided "as is". We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">4. Limitations</h2>
              <p className="text-muted-foreground">
                In no event shall Never Stop Dreaming Trading or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Never Stop Dreaming Trading.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">5. Accuracy of Materials</h2>
              <p className="text-muted-foreground">
                The materials appearing on Never Stop Dreaming Trading could include technical, typographical, or photographic errors. We do not warrant that any of the materials on our website are accurate, complete, or current. We may make changes to the materials contained on our website at any time without notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">6. Links</h2>
              <p className="text-muted-foreground">
                We have not reviewed all of the sites linked to our website and are not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by us of the site. Use of any such linked website is at the user's own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">7. Modifications</h2>
              <p className="text-muted-foreground">
                We may revise these terms of service for our website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">8. Governing Law</h2>
              <p className="text-muted-foreground">
                These terms and conditions are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
