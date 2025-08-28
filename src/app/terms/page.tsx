export default function TermsPage() {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-sm text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using DriftLog (&quot;the Service&quot;), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, you may not use the Service.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p>
              DriftLog is a personal expense tracking application that allows users to log, categorize, 
              and analyze their financial transactions. The Service is currently in beta testing phase 
              with limited user capacity.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Beta Testing Terms</h2>
            <p>
              You acknowledge that DriftLog is in beta testing phase. The Service may contain bugs, 
              errors, or other issues. Features may be added, modified, or removed without notice. 
              We make no guarantees about data persistence during the beta period.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibent mb-4">4. User Account and Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must provide accurate information when creating your account</li>
              <li>You are solely responsible for all activity under your account</li>
              <li>Maximum of 100 expense entries per user account</li>
              <li>Maximum of 10 connected users per account</li>
              <li>Maximum of 5 recurring transaction templates per user</li>
            </ul>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Prohibited Uses</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to the Service or other user accounts</li>
              <li>Upload or transmit malicious code, spam, or inappropriate content</li>
              <li>Reverse engineer, decompile, or attempt to extract source code</li>
              <li>Exceed the stated usage limits for beta users</li>
            </ul>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Privacy and Data</h2>
            <p>
              Your privacy is important to us. Our collection and use of your information is governed 
              by our Privacy Policy, which is incorporated into these terms by reference.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. YAN GUREVICH SHALL NOT BE 
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR 
              USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED $0.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the Service at our discretion, 
              without notice, for any violation of these terms. You may delete your account at any time 
              through the Service settings.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be effective 
              immediately upon posting. Continued use of the Service constitutes acceptance of 
              modified terms.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact me at:{" "}
              <a href="mailto:yan.gurevich20@gmail.com" className="text-blue-600 hover:underline">
                yan.gurevich20@gmail.com
              </a>
            </p>
          </section>
  
          <div className="border-t pt-6 mt-8 text-sm text-muted-foreground">
            <p>© 2025 Yan Gurevich. All rights reserved</p>
          </div>
        </div>
      </div>
    );
  }