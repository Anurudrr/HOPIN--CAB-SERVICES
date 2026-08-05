import { ArrowLeft, Compass } from "lucide-react";
import { motion } from "motion/react";

import { Reveal } from "../components/site/Reveal";
import { MagneticWrap } from "../components/site/MagneticWrap";
import { ButtonLink } from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="section-shell flex min-h-[calc(100vh-5rem)] items-center">
      <div className="section-frame max-w-3xl">
        <Reveal className="panel relative overflow-hidden p-8 text-center md:p-12">
          {/* Decorative oversized 404 watermark */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="select-none text-[18rem] font-black leading-none tracking-tighter text-black/[0.04] md:text-[26rem]"
            >
              404
            </motion.span>
          </div>

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-black bg-black text-white"
            >
              <Compass size={26} />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.5 }}
              className="mt-6 text-[11px] font-black uppercase tracking-[0.26em] text-black/60"
            >
              Off the route map
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-5xl font-black uppercase leading-[0.95] tracking-tighter text-black md:text-6xl"
            >
              That route does
              <br />
              not exist.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.5 }}
              className="mx-auto mt-5 max-w-xl text-base leading-7 text-black/60"
            >
              The page may have moved, or the URL is not part of the current HopIn site map. We can
              route you back to a live corridor instead.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.5 }}
              className="mt-8 flex flex-col justify-center gap-4 sm:flex-row"
            >
              <MagneticWrap strength={0.18}>
                <ButtonLink to="/" variant="primary" size="lg" className="gap-2">
                  <ArrowLeft size={16} />
                  Back to home
                </ButtonLink>
              </MagneticWrap>
              <ButtonLink to="/contact" variant="outline" size="lg">
                Contact support
              </ButtonLink>
            </motion.div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}