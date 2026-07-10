import { MapPin, Users, IndianRupee, Car } from 'lucide-react';
import { motion } from 'motion/react';

const steps = [
  {
    icon: <MapPin size={32} strokeWidth={2} />,
    title: 'Choose a city',
    description: 'Start from a live city corridor so the inventory you browse is tied to actual route coverage.',
  },
  {
    icon: <Users size={32} strokeWidth={2} />,
    title: 'Compare published rides',
    description: 'Review route timing, available seats, driver identity, and per-seat fare before you commit.',
  },
  {
    icon: <IndianRupee size={32} strokeWidth={2} />,
    title: 'Lock your seat price',
    description: 'The booking surface calculates total fare from the ride you selected and the seats you requested.',
  },
  {
    icon: <Car size={32} strokeWidth={2} />,
    title: 'Track it in dashboard',
    description: 'After booking, riders and drivers can review the route state directly from their account surfaces.',
  },
];

const HowItWorks = () => {
  return (
    <section className="py-32 bg-white border-b-2 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b-2 border-black pb-8">
          <h2 className="text-5xl md:text-7xl font-black text-black tracking-tighter uppercase">
            How It<br />Works.
          </h2>
          <p className="text-xl text-black font-medium max-w-sm mt-6 md:mt-0">
            A direct booking flow centered on real inventory instead of a simulated matching demo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-black bg-black">
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col p-8 bg-white hover:bg-black hover:text-white transition-colors duration-300 group border-r-2 border-b-2 border-black lg:border-b-0 last:border-r-0"
            >
              <div className="mb-8 p-4 inline-block border-2 border-black group-hover:border-white transition-colors bg-white text-black">
                {step.icon}
              </div>
              <h3 className="text-2xl font-black uppercase tracking-wide mb-4">
                0{index + 1}. {step.title}
              </h3>
              <p className="font-medium leading-relaxed group-hover:text-gray-300 transition-colors">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
