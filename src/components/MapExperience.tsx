import { motion, useInView, useReducedMotion } from "motion/react";
import * as React from "react";

const corridorMarkers = [
  {
    label: "Pickup cluster",
    detail: "Koramangala / HSR",
    style: "left-[14%] top-[18%] bg-black text-white",
    delay: 0.2,
  },
  {
    label: "Shared lane",
    detail: "ORR connector",
    style: "left-[43%] top-[32%] bg-white text-black",
    delay: 0.32,
  },
  {
    label: "Drop corridor",
    detail: "Whitefield edge",
    style: "left-[68%] top-[55%] bg-white text-black",
    delay: 0.44,
  },
  {
    label: "Driver staging",
    detail: "East cluster",
    style: "left-[28%] top-[68%] bg-black text-white",
    delay: 0.56,
  },
] as const;

const routeSignals = [
  "Live route boards should show corridor intent, not just pins.",
  "Seat and departure context should stay visible while riders compare options.",
  "Illustrative surfaces should not pull the full map runtime into the homepage bundle.",
] as const;

const pulseDots = [
  { style: "left-[18%] top-[28%]", delay: 0 },
  { style: "left-[30%] top-[36%]", delay: 0.2 },
  { style: "left-[44%] top-[44%]", delay: 0.4 },
  { style: "left-[56%] top-[50%]", delay: 0.6 },
  { style: "left-[70%] top-[58%]", delay: 0.8 },
] as const;

const statCards = [
  { label: "Corridor", value: "Bangalore commuter spine" },
  { label: "Snapshot", value: "3 live route types" },
  { label: "Signal", value: "fare + seats + timing" },
] as const;

const lineStyles = [
  { style: "left-[17%] top-[30%] w-[22%] rotate-[12deg]", delay: 0.1 },
  { style: "left-[38%] top-[42%] w-[19%] rotate-[9deg]", delay: 0.25 },
  { style: "left-[54%] top-[52%] w-[18%] rotate-[16deg]", delay: 0.4 },
] as const;

const MapExperience = () => {
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-b-2 border-black bg-white py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8">
        <motion.div
          ref={sectionRef}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col justify-center"
        >
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.34em] text-black/50">
            Route context surface
          </p>
          <h2 className="mb-6 text-5xl font-black uppercase tracking-tighter text-black md:text-7xl">
            Clear route
            <br />
            context.
          </h2>
          <p className="max-w-2xl text-xl font-medium text-black">
            The homepage only needs to communicate corridor structure and trip clarity. It does not
            need the runtime cost of the booking map to do that.
          </p>

          <div className="mt-10 space-y-4">
            {routeSignals.map((signal, idx) => (
              <motion.div
                key={signal}
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : undefined}
                transition={{ delay: 0.2 + idx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-4 border-l-4 border-black pl-4 text-base font-medium text-black"
              >
                <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 bg-black" />
                <span>{signal}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="relative overflow-hidden border-4 border-black bg-white shadow-premium">
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(0,0,0,0.07),transparent_30%),radial-gradient(circle_at_76%_64%,rgba(0,0,0,0.08),transparent_32%)]" />

          <div className="relative h-[600px] overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={isInView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-8 top-8 z-20 border-4 border-black bg-white px-6 py-4 shadow-soft"
            >
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-black">
                Illustrative Bangalore corridor
              </p>
            </motion.div>

            <div className="absolute right-8 top-8 z-20 grid gap-3">
              {statCards.map((card, idx) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : undefined}
                  transition={{ delay: 0.2 + idx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="border-2 border-black bg-white px-4 py-3 text-right shadow-soft"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">
                    {card.label}
                  </p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.1em] text-black">
                    {card.value}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={isInView ? { opacity: 1, scale: 1 } : undefined}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-[18%_8%_12%_8%] border-2 border-black/20 bg-white/65"
            />

            {/* Animated dashed route lines */}
            {lineStyles.map((line, idx) => (
              <motion.div
                key={line.style}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={isInView ? { scaleX: 1, opacity: 1 } : undefined}
                transition={{ delay: 0.4 + line.delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: "left center" }}
                className={`absolute h-0 border-t-4 border-dashed border-black ${line.style}`}
              />
            ))}

            {/* Pulse dots on the corridor */}
            {pulseDots.map((dot) => (
              <motion.div
                key={dot.style}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={isInView ? { opacity: 1, scale: 1 } : undefined}
                transition={{ delay: 0.6 + dot.delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={`absolute z-10 h-3 w-3 rounded-full border-2 border-black bg-white ${dot.style}`}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-[-5px] rounded-full border-2 border-black"
                  style={{
                    animation: shouldReduceMotion
                      ? undefined
                      : "live-pulse 2.4s cubic-bezier(0.16,1,0.3,1) infinite",
                    animationDelay: `${dot.delay * 0.4}s`,
                  }}
                />
              </motion.div>
            ))}

            {corridorMarkers.map((marker) => (
              <motion.div
                key={marker.label}
                initial={{ opacity: 0, scale: 0.88, y: 8 }}
                animate={isInView ? { opacity: 1, scale: 1, y: 0 } : undefined}
                transition={{ delay: 0.6 + marker.delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -2, scale: 1.02 }}
                className={`absolute z-20 w-44 border-2 border-black px-4 py-3 shadow-soft ${marker.style}`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.24em] opacity-70">
                  {marker.label}
                </p>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.08em]">
                  {marker.detail}
                </p>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : undefined}
              transition={{ delay: 1.0, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-8 left-8 right-8 z-20 border-4 border-black bg-black p-6 text-white shadow-premium"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
                Why this surface changed
              </p>
              <p className="mt-3 max-w-2xl text-lg font-bold leading-8">
                The booking flow owns the real map runtime. The homepage only needs a sharp visual
                explanation of corridor logic, route density, and live inventory context.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapExperience;
