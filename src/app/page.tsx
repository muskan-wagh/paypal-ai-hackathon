import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <h1 className="text-3xl font-bold">ProofPay</h1>
      <p className="max-w-md text-center text-sm text-neutral-600">
        AI-gated milestone payouts — client funds via PayPal, AI checks the proof, human approves,
        PayPal pays. Built for the PayPal AI Hackathon 2026.
      </p>
      <Link
        href="/spike"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Open sandbox spike panel →
      </Link>
    </main>
  );
}
