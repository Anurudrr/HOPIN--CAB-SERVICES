import { MapPin, Users, IndianRupee, Car } from "lucide-react";
import { motion } from "motion/react";

import { NumberTicker } from "./site/NumberTicker";

const steps = [
  {
    icon: <MapPin size={32} strokeWidth={2} />,
    title: "Choose a city",
    description:
      "Start from a live city corridor so the inventory you browse is tied to actual route coverage.",
  },
  {
    icon: <Users size={32} strokeWidth={2} />,
    title: "Compare published rides",
    description:
      "Review route timing, available seats, driver identity, and per-seat fare before you commit.",
  },
  {
    icon: <IndianRupee size={32} strokeWidth={2} />,
    title: "Lock your seat price",
    description:
      "The booking surface calculates total fare from the ride you selected and the seats you requested.",
  },
  {
    icon: <Car size={32} strokeWidth={2} />,
    title: "Track it in dashboard",
    description:
      "After booking, riders and drivers can review the route state directly from their account surfaces.",
  },
];

const stats = [
  { value: 5, suffix: "", label: "cities live now" },
  { value: 48, suffix: "K+", label: "seats routed / month" },
  { value: 14, suffix: " min", label: "median wait time" },
  { value: 32, suffix: "%", label: "commute savings" },
];

const headlineContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const headlineLine = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (idx: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: idx * 0.08,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const HowItWorks = () => {
  return (
    <section className="border-b-2 border-black bg-white py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={headlineContainer}
          className="mb-16 flex flex-col items-end justify-between border-b-2 border-black pb-8 md:flex-row"
        >
          <motion.h2
            variants={headlineLine}
            className="text-5xl font-black uppercase tracking-tighter text-black md:text-7xl"
          >
            How It
            <br />
            Works.
          </motion.h2>
          <motion.p
            variants={headlineLine}
            className="mt-6 max-w-sm text-xl font-medium text-black md:mt-0"
          >
            A direct booking flow centered on real inventory instead of a simulated matching demo.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 gap-0 border-2 border-black bg-black md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ y: -3 }}
              className="group relative flex flex-col border-b-2 border-r-2 border-black bg-white p-8 transition-colors duration-300 last:border-r-0 hover:bg-black hover:text-white"
            >
              {/* Step number, large in corner */}
              <span className="absolute right-5 top-5 text-7xl font-black leading-none text-black/[0.06] transition-colors duration-300 group-hover:text-white/10">
                0{index + 1}
              </span>

              <motion.div
                whileHover={{ rotate: -6, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
                className="mb-8 inline-flex h-14 w-14 items-center justify-center border-2 border-black bg-white text-black transition-colors group-hover:border-white"
              >
                {step.icon}
              </motion.div>

              <h3 className="mb-4 text-2xl font-black uppercase tracking-wide">
                {step.title}
              </h3>
              <p className="font-medium leading-relaxed text-black/65 transition-colors duration-300 group-hover:text-gray-300">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Stats strip */}
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: idx * 0.06, duration: 0.5 }}
              className="border-2 border-black bg-white p-5 shadow-soft transition-shadow hover:shadow-premium"
            >
              <p className="text-3xl font-black uppercase tracking-tighter text-black md:text-4xl">
                {stat.value === 32 ? (
                  <NumberTicker value={stat.value} suffix={stat.suffix} duration={1.2} />
                ) : (
                  <NumberTicker value={stat.value} suffix={stat.suffix} />
                )}
              </p>
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
