import * as React from "react";
import { cn } from "../../lib/utils";

interface BreathingDotProps {
  className?: string;
  /** Background color — defaults to black. Keep it monochrome for the brutalist system. */
  color?: "black" | "white";
  /** Render with surrounding label */
  label?: string;
  size?: "sm" | "md";
}

/**
 * The signature "live" indicator: a small filled dot with a pulsing halo.
 * Used wherever the product is showing real-time or up-to-the-second state.
 */
export function BreathingDot({
  className,
  color = "black",
  label,
  size = "sm",
}: BreathingDotProps) {
  const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const haloInset = size === "sm" ? "-inset-1.5" : "-inset-2";
  const ringColor = color === "black" ? "border-black" : "border-white";
  const fillColor = color === "black" ? "bg-black" : "bg-white";

  return (
    <span
      className={cn("inline-flex items-center gap-2 align-middle", className)}
      role={label ? "status" : undefined}
      aria-label={label}
    >
      <span className="relative inline-flex shrink-0 items-center justify-center">
        <span className={cn(dotSize, fillColor, "relative z-10 rounded-full")} />
        <span
          aria-hidden="true"
          className={cn(
            "absolute rounded-full border-2",
            haloInset,
            ringColor,
            "opacity-60 animate-[live-pulse_1.8s_cubic-bezier(0.16,1,0.3,1)_infinite]",
          )}
        />
      </span>
      {label ? (
        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-[0.28em]",
            color === "black" ? "text-black" : "text-white",
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}