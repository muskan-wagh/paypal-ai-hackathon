"use client";

import { motion, useInView, useReducedMotion, useSpring, useTransform } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * ProofPay motion primitives. Every wrapper no-ops (renders static content)
 * when the user prefers reduced motion, and keeps animations short and
 * spring/opacity based so they never block interaction.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + rise into view on scroll. Server-component friendly (children pass through). */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-64px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered entrance for lists/cards. Wrap children in <StaggerItem>. */
export function Stagger({
  children,
  className,
  delay = 0,
  gap = 0.07,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  gap?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 14,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Gentle continuous float for hero decorations. */
export function Floating({
  children,
  className,
  amplitude = 10,
  duration = 6,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -amplitude, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Mount-time fade for page transitions (keyed by route). */
export function PageFade({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      key={pathname}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Animated number counter. Renders money when `currency` is set, else integers. */
export function AnimatedNumber({
  value,
  currency,
  className,
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  const format = (n: number) =>
    currency
      ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n)
      : Math.round(n).toLocaleString("en-US");
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const spring = useSpring(0, { stiffness: 70, damping: 22, mass: 0.9 });
  const display = useTransform(spring, (v) => format(v));

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      spring.set(value);
    } else {
      spring.set(0);
      const id = requestAnimationFrame(() => spring.set(value));
      return () => cancelAnimationFrame(id);
    }
  }, [inView, value, reduced, spring]);

  return (
    <span ref={ref} className={className}>
      <motion.span>{display}</motion.span>
    </span>
  );
}

/** Width bar that animates from 0 to `percent` when visible. */
export function AnimatedBar({
  percent,
  className,
  barClassName,
}: {
  percent: number;
  className?: string;
  barClassName?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <motion.div
        className={`h-full rounded-full ${barClassName ?? ""}`}
        initial={{ width: reduced ? `${percent}%` : "0%" }}
        whileInView={{ width: `${percent}%` }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: reduced ? 0 : 0.9, ease: EASE, delay: reduced ? 0 : 0.15 }}
      />
    </div>
  );
}

/** Hover lift wrapper for interactive cards (CSS transform only, no layout shift). */
export function Hoverable({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
    >
      {children}
    </motion.div>
  );
}
