// /pages/privacy.tsx
"use client";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <h1 className="text-4xl font-bold mb-6 text-center">Privacy Policy</h1>
      <div className="max-w-3xl mx-auto space-y-6 text-gray-300 text-sm">
        <p><strong>Effective Date:</strong> July 1, 2025</p>
        <p>
          Paragon Circle ("we", "us", "our") respects your privacy and is committed to protecting your
          personal data in accordance with the <strong>Privacy Act 1988 (Cth)</strong> and the
          <strong> Australian Privacy Principles (APPs)</strong>.
        </p>
        <p><strong>1. What We Collect</strong><br />We may collect wallet addresses, email (if provided), IP address, device info, and transaction data.</p>
        <p><strong>2. How We Use It</strong><br />To verify membership, manage investment pools, and improve platform functionality.</p>
        <p><strong>3. Storage & Security</strong><br />We use encryption and access controls. Blockchain wallet addresses are public.</p>
        <p><strong>4. Disclosure</strong><br />We do not share personal data except by law or with your consent.</p>
        <p><strong>5. Your Rights</strong><br />Email <strong>privacy@paragoncircle.com</strong> to request access or changes to your data.</p>
        <p><strong>6. International Users</strong><br />This platform is designed for Australian residents only.</p>
        <p><strong>7. Contact</strong><br />privacy@paragoncircle.com</p>
      </div>
    </main>
  );
}