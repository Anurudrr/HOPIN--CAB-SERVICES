import * as React from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "motion/react";

/**
 * 1px black progress bar pinned to the very top of the viewport.
 * Fills as the user scrolls the page. Auto-disables for reduced-motion users.
 */
export function ScrollProgress() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    mass: 0.4,
  });

  if (shouldReduceMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] bg-black"
    />
  );
}
