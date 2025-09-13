export default function PrivacyPage() {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-sm text-muted-foreground mb-6">
            Last updated: 9/5/2025
          </p>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
            <h3 className="text-lg font-medium mb-2">Account Information</h3>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>Email address (for authentication)</li>
              <li>Display name (optional)</li>
              <li>Profile photo (optional)</li>
            </ul>
            
            <h3 className="text-lg font-medium mb-2">Financial Data</h3>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>Expense entries (amount, category, description, date)</li>
              <li>Recurring transaction templates</li>
              <li>Budget preferences and currency settings</li>
              <li>Categories and customizations</li>
            </ul>
  
            <h3 className="text-lg font-medium mb-2">Usage Data</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>App usage patterns and feature interactions</li>
              <li>Device information and browser type</li>
              <li>Error logs and performance metrics</li>
            </ul>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain the DriftLog service</li>
              <li>Sync your financial data across your devices</li>
              <li>Enable sharing features with connected users</li>
              <li>Improve the app through usage analytics</li>
              <li>Communicate important service updates</li>
              <li>Provide customer support</li>
            </ul>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Information Sharing</h2>
            <p className="mb-4">
              <strong>We do not sell your personal information.</strong> We may share information only in these limited circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Connected Users:</strong> Financial data you choose to share with connected family/friends</li>
              <li><strong>Service Providers:</strong> Firebase/Google Cloud for hosting and authentication</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
            </ul>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Data Storage and Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data is stored securely using Google Firebase/Firestore</li>
              <li>All data transmission is encrypted using HTTPS</li>
              <li>Access to your data requires authentication</li>
              <li>We implement industry-standard security practices</li>
              <li>Regular security reviews and updates</li>
            </ul>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Data Retention</h2>
            <p>
              We retain your information as long as your account is active. When you delete your account, 
              we will delete your personal information within 30 days, except where retention is required 
              by law or for legitimate business purposes.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Your Rights and Choices</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Correction:</strong> Update or correct your information through the app</li>
              <li><strong>Deletion:</strong> Delete your account and associated data</li>
              <li><strong>Export:</strong> Download your financial data</li>
              <li><strong>Opt-out:</strong> Disable optional data collection features</li>
            </ul>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Third-Party Services</h2>
            <p className="mb-4">DriftLog uses these third-party services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Firebase:</strong> Authentication, database, and hosting</li>
              <li><strong>Exchange Rate API:</strong> Currency conversion rates</li>
            </ul>
            <p>
              These services have their own privacy policies that govern their handling of your information.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place to protect your information in accordance 
              with this Privacy Policy.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
            <p>
              DriftLog is not intended for children under 13 years of age. We do not knowingly collect 
              personal information from children under 13.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact me at:{" "}
              <a href="mailto:yan.vikng@gmail.com" className="text-blue-600 hover:underline">
                yan.vikng@gmail.com
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