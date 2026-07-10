import type { ReactNode } from "react";
import { motion } from "motion/react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <div className="relative mt-20 flex min-h-[calc(100vh-5rem)] flex-grow items-center justify-center overflow-hidden bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md border-4 border-black bg-white p-10 shadow-premium"
      >
        <div className="mb-10 border-b-4 border-black pb-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-black/55">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tighter text-black sm:text-6xl">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-black/60">{description}</p>
        </div>

        {children}
      </motion.div>
    </div>
  );
}
