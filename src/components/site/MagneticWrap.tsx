import * as React from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

import { cn } from "../../lib/utils";

interface MagneticWrapProps {
  children: React.ReactElement;
  /** Pull strength 0..1 (default 0.25) */
  strength?: number;
  className?: string;
  /** Element type for the wrapper */
  as?: "div" | "span";
}

/**
 * Wraps an interactive element and pulls it gently toward the cursor on hover.
 * Pointer-based with springs — feels like the surface has weight.
 */
export function MagneticWrap({
  children,
  strength = 0.25,
  className,
  as = "div",
}: MagneticWrapProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  // Skip the entire effect on touch / coarse pointers
  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setEnabled(mq.matches && !shouldReduceMotion);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [shouldReduceMotion]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const { width, height, left, top } = ref.current.getBoundingClientRect();
    const cx = e.clientX - (left + width / 2);
    const cy = e.clientY - (top + height / 2);
    x.set(cx * strength);
    y.set(cy * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const Wrapper = as === "span" ? motion.span : motion.div;

  return (
    <Wrapper
      ref={ref as React.RefObject<HTMLDivElement>}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy, display: "inline-block" }}
      className={cn(className)}
    >
      {children}
    </Wrapper>
  );
}
