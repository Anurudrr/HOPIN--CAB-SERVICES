import { useEffect, useState } from "react";
import { motion } from "motion/react";

const interactiveSelector = 'a, button, input, textarea, select, [role="button"]';
const textInputSelector = 'input[type="text"], input[type="email"], input[type="password"], input[type="search"], input:not([type]), textarea, [contenteditable="true"]';
const grabSelector = '[data-grab], [role="slider"]';

type CursorState = "default" | "hover" | "text" | "grab";

const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [state, setState] = useState<CursorState>("default");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const pointerQuery = window.matchMedia("(pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncCapability = () => {
      setEnabled(pointerQuery.matches && !motionQuery.matches);
    };

    syncCapability();

    pointerQuery.addEventListener("change", syncCapability);
    motionQuery.addEventListener("change", syncCapability);

    return () => {
      pointerQuery.removeEventListener("change", syncCapability);
      motionQuery.removeEventListener("change", syncCapability);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(false);
      setState("default");
      return;
    }

    const updateMousePosition = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
      setIsVisible(true);

      const target = event.target;
      if (!(target instanceof Element)) {
        setState("default");
        return;
      }

      if (target.closest(textInputSelector)) {
        setState("text");
      } else if (target.closest(grabSelector)) {
        setState("grab");
      } else if (target.closest(interactiveSelector)) {
        setState("hover");
      } else {
        setState("default");
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
      setState("default");
    };

    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", updateMousePosition);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [enabled]);

  if (!enabled || !isVisible) return null;

  // The inner dot is small + snappy (tween). The ring is larger + springy.
  const ringScale =
    state === "hover" ? 2.6 : state === "text" ? 1.4 : state === "grab" ? 2.2 : 1;
  const ringBg =
    state === "hover"
      ? "rgba(0,0,0,1)"
      : state === "grab"
        ? "rgba(0,0,0,1)"
        : "rgba(0,0,0,0)";

  return (
    <>
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-2 w-2 rounded-full bg-black mix-blend-difference"
        animate={{
          x: mousePosition.x - 4,
          y: mousePosition.y - 4,
          opacity: state === "hover" || state === "grab" ? 0 : 1,
        }}
        transition={{ type: "tween", ease: "backOut", duration: 0.1 }}
      />

      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9998] flex h-8 w-8 items-center justify-center rounded-full border-2 border-black mix-blend-difference"
        animate={{
          x: mousePosition.x - 16,
          y: mousePosition.y - 16,
          scale: ringScale,
          backgroundColor: ringBg,
        }}
        transition={
          state === "hover"
            ? { type: "spring", stiffness: 220, damping: 18, mass: 0.5 }
            : { type: "spring", stiffness: 180, damping: 22, mass: 0.5 }
        }
      >
        {state === "hover" ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[6px] font-bold uppercase tracking-widest text-white"
          >
            Click
          </motion.span>
        ) : null}
        {state === "grab" ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[6px] font-bold uppercase tracking-widest text-white"
          >
            Grab
          </motion.span>
        ) : null}
      </motion.div>
    </>
  );
};

export default CustomCursor;