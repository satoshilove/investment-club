// /pages/disclaimer.tsx
"use client";

export default function InvestmentDisclaimer() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <h1 className="text-4xl font-bold mb-6 text-center">Investment Disclaimer</h1>
      <div className="max-w-3xl mx-auto space-y-6 text-gray-300 text-sm">
        <p><strong>Not Financial Advice</strong></p>
        <p>
          Paragon Circle is a private investment club, not a licensed financial service. We do not provide
          regulated financial advice.
        </p>
        <p>
          Participation in any investment pool carries risk of capital loss. Past performance is not an
          indicator of future results. You should consult a licensed financial advisor before making decisions.
        </p>
        <p>
          By joining Paragon Circle, you accept that participation is voluntary and at your own risk.
        </p>
      </div>
    </main>
  );
}
