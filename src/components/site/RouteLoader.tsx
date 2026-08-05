import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const ROUTE_LOAD_PHRASES = [
  { eyebrow: "Loading Route", detail: "Plotting the next surface." },
  { eyebrow: "Loading Route", detail: "Reading live inventory." },
  { eyebrow: "Loading Route", detail: "Aligning corridor data." },
  { eyebrow: "Loading Route", detail: "Preparing the next move." },
] as const;

export function RouteLoader() {
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const phrase = ROUTE_LOAD_PHRASES[index];

  React.useEffect(() => {
    if (shouldReduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % ROUTE_LOAD_PHRASES.length);
    }, 1100);
    return () => window.clearInterval(id);
  }, [shouldReduceMotion]);

  return (
    <div
      className="flex min-h-[60vh] items-center justify-center px-6"
      role="status"
      aria-live="polite"
    >
      <div className="panel flex min-w-[280px] items-center gap-4 px-6 py-5">
        <div className="relative h-10 w-10">
          <motion.div
            className="absolute inset-0 border-2 border-black"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, ease: "linear", repeat: Infinity }}
            style={{ borderRightColor: "transparent", borderBottomColor: "transparent" }}
          />
          <motion.div
            className="absolute inset-2 border-2 border-black"
            animate={{ rotate: -360 }}
            transition={{ duration: 1.8, ease: "linear", repeat: Infinity }}
            style={{ borderTopColor: "transparent", borderLeftColor: "transparent" }}
          />
        </div>

        <div className="relative h-10 min-w-[160px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <p className="text-xs font-black uppercase tracking-[0.28em] text-black/55">
                {phrase.eyebrow}
              </p>
              <p className="text-sm font-medium text-black/60">{phrase.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}