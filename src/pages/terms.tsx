// /pages/terms.tsx
"use client";

export default function TermsOfUse() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <h1 className="text-4xl font-bold mb-6 text-center">Terms of Use</h1>
      <div className="max-w-3xl mx-auto space-y-6 text-gray-300 text-sm">
        <p><strong>Effective Date:</strong> July 1, 2025</p>
        <p>
          By using this website or any part of Paragon Circle, you agree to the terms below. These apply to all
          members and visitors.
        </p>
        <p><strong>1. Membership</strong><br />Access is restricted to approved members who pay the one-time fee.</p>
        <p><strong>2. Investment Risk</strong><br />All investments are at your own risk. We are not an AFSL holder.</p>
        <p><strong>3. Acceptable Use</strong><br />You may not use the platform for illegal activity, or to exploit or interfere with the system.</p>
        <p><strong>4. Intellectual Property</strong><br />All content is owned by Paragon Circle and cannot be reused without permission.</p>
        <p><strong>5. Limitation of Liability</strong><br />We are not liable for losses, smart contract bugs, or market volatility.</p>
        <p><strong>6. Updates</strong><br />We may change these terms at any time. Continued use implies agreement.</p>
        <p><strong>7. Contact</strong><br />support@paragoncircle.com</p>
      </div>
    </main>
  );
}