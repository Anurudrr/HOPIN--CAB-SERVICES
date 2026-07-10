import * as React from "react";
import { Minus, Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Reveal } from "../components/site/Reveal";
import { SectionHeading } from "../components/site/SectionHeading";
import { ButtonLink } from "../components/ui/Button";
import { faqItems } from "../content/siteContent";

export default function FAQ() {
  const [query, setQuery] = React.useState("");
  const [openQuestion, setOpenQuestion] = React.useState<string | null>(
    faqItems[0]?.question ?? null,
  );

  const filteredFaqs = faqItems.filter((faq) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return (
      faq.question.toLowerCase().includes(normalized) ||
      faq.answer.toLowerCase().includes(normalized)
    );
  });

  return (
    <div className="site-shell">
      <section className="section-shell">
        <div className="section-frame space-y-10">
          <SectionHeading
            eyebrow="Help center"
            title={
              <>
                Common questions, answered without
                <span className="serif-accent"> filler language</span>.
              </>
            }
            description="The previous search field looked interactive but did nothing. It now filters the FAQ content directly on the page."
          />

          <Reveal className="panel max-w-3xl p-4">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-black/60" size={18} />
              <label htmlFor="faq-search" className="sr-only">
                Search frequently asked questions
              </label>
              <input
                id="faq-search"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for route, pricing, safety, or support"
                className="field-shell w-full pl-14"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-frame max-w-4xl">
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => (
              <Reveal key={faq.question} delay={index * 0.03} className="panel overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setOpenQuestion(openQuestion === faq.question ? null : faq.question)
                  }
                  aria-expanded={openQuestion === faq.question}
                  aria-controls={`faq-answer-${index}`}
                  className="flex w-full items-center justify-between gap-4 p-7 text-left"
                >
                  <span className="text-xl font-black uppercase tracking-tight text-black">
                    {faq.question}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-none border-2 border-black bg-black text-white">
                    {openQuestion === faq.question ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {openQuestion === faq.question ? (
                    <motion.div
                      id={`faq-answer-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-7 pb-7 text-sm leading-7 text-black/60">
                        {faq.answer}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </Reveal>
            ))}

            {!filteredFaqs.length ? (
              <Reveal className="panel p-8 text-sm leading-7 text-black/60">
                No matching FAQ found. Try a different term or contact the team directly.
              </Reveal>
            ) : null}
          </div>

          <Reveal className="panel mt-8 flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-black">
                Still blocked
              </p>
              <h3 className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
                Use the support page for route, safety, or partnership questions.
              </h3>
            </div>
            <ButtonLink to="/contact" size="lg">
              Contact Support
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

