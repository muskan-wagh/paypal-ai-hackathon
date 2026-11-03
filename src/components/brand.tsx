import Link from "next/link";

/** ProofPay logo lockup — shield-check mark + wordmark. */
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-gradient-to-b from-brand to-brand-navy shadow-sm ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-3/5 w-3/5 text-white">
        <path
          d="M12 2.5 4.5 5.5v6.1c0 4.6 3.2 8 7.5 9.9 4.3-1.9 7.5-5.3 7.5-9.9V5.5L12 2.5Z"
          fill="currentColor"
          opacity="0.35"
        />
        <path
          d="M12 4 6 6.4v5.2c0 3.7 2.5 6.5 6 8.2 3.5-1.7 6-4.5 6-8.2V6.4L12 4Z"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="m9.4 12.1 1.8 1.9 3.5-3.9"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <BrandMark />
      {!compact && (
        <span className="text-lg font-bold tracking-tight text-brand-navy">
          Proof<Pay />
        </span>
      )}
    </Link>
  );
}

function Pay() {
  return <span className="text-brand">Pay</span>;
}
