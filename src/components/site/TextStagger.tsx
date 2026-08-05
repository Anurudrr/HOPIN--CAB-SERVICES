import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "../../lib/utils";

interface TextStaggerProps {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  staggerMs?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  /** If true, only animates when scrolled into view */
  onView?: boolean;
  /** Viewport margin for onView mode */
  amount?: number;
}

/**
 * Splits text into words and animates them in with a small vertical translate.
 * Preserves manual <br /> tags by splitting on them first.
 */
export function TextStagger({
  text,
  className,
  wordClassName,
  delay = 0,
  staggerMs = 70,
  as = "h2",
  onView = false,
  amount = 0.3,
}: TextStaggerProps) {
  const shouldReduceMotion = useReducedMotion();

  // Split on <br /> first so line breaks survive; then on whitespace.
  const lines = text.split(/<br\s*\/?>/i);
  const words = lines.flatMap((line, lineIdx) => {
    const lineWords = line.split(/\s+/).filter(Boolean);
    return lineWords.map((word, wordIdx) => ({
      word,
      // Mark the last word in each line so we can render a <br /> after it
      isLineEnd: wordIdx === lineWords.length - 1,
      lineIdx,
    }));
  });

  const Wrapper = motion[as];

  const animProps = onView
    ? {
        initial: shouldReduceMotion ? false : "hidden",
        whileInView: "visible",
        viewport: { once: true, amount },
      }
    : {
        initial: shouldReduceMotion ? false : "hidden",
        animate: "visible",
      };

  return (
    <Wrapper className={cn(className)} {...animProps}>
      {words.map(({ word, isLineEnd, lineIdx }, idx) => (
        <React.Fragment key={`${lineIdx}-${word}-${idx}`}>
          <motion.span
            className={cn("inline-block", wordClassName)}
            variants={{
              hidden: { opacity: 0, y: 22 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.55,
                  delay: delay + idx * (staggerMs / 1000),
                  ease: [0.16, 1, 0.3, 1],
                },
              },
            }}
          >
            {word}
          </motion.span>
          {isLineEnd && lineIdx < lines.length - 1 ? <br /> : null}
          {!isLineEnd ? " " : null}
        </React.Fragment>
      ))}
    </Wrapper>
  );
}
