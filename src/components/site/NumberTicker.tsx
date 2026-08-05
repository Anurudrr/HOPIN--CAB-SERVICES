import * as React from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";

import { cn } from "../../lib/utils";

interface NumberTickerProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  /** Suffix appended after the formatted number (e.g. "K", "%") */
  suffix?: string;
  /** Prefix prepended before the number (e.g. "INR ", "+") */
  prefix?: string;
}

/**
 * Animates from 0 -> value once the element enters the viewport.
 * Uses motion values so the count-up is smooth even at large durations.
 */
export function NumberTicker({
  value,
  duration = 1.4,
  format,
  className,
  suffix,
  prefix,
}: NumberTickerProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  const motionValue = useMotionValue(shouldReduceMotion ? value : 0);
  const rounded = useTransform(motionValue, (latest) => {
    const num = Math.round(latest);
    return format ? format(num) : num.toLocaleString();
  });

  React.useEffect(() => {
    if (!isInView || shouldReduceMotion) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [isInView, value, duration, motionValue, shouldReduceMotion]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix ? <span aria-hidden="true">{prefix}</span> : null}
      <motion.span>{rounded}</motion.span>
      {suffix ? <span aria-hidden="true">{suffix}</span> : null}
      <span className="sr-only">
        {prefix ?? ""}
        {value.toLocaleString()}
        {suffix ?? ""}
      </span>
    </span>
  );
}