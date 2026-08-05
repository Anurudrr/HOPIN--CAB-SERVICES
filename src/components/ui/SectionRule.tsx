import * as React from "react";
import { useInView } from "motion/react";

import { cn } from "../../lib/utils";

interface SectionRuleProps {
  className?: string;
}

/**
 * 2px black line that scales from 0 to full width when scrolled into view.
 * Pair with a SectionHeading to give each section a clear typographic moment.
 */
export function SectionRule({ className }: SectionRuleProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-drawn={isInView ? "true" : "false"}
      className={cn("section-rule", className)}
    />
  );
}