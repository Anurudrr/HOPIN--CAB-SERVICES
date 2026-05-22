const corridorMarkers = [
  {
    label: "Pickup cluster",
    detail: "Koramangala / HSR",
    style: "left-[14%] top-[18%] bg-black text-white",
  },
  {
    label: "Shared lane",
    detail: "ORR connector",
    style: "left-[43%] top-[32%] bg-white text-black",
  },
  {
    label: "Drop corridor",
    detail: "Whitefield edge",
    style: "left-[68%] top-[55%] bg-white text-black",
  },
  {
    label: "Driver staging",
    detail: "East cluster",
    style: "left-[28%] top-[68%] bg-black text-white",
  },
] as const;

const routeSignals = [
  "Live route boards should show corridor intent, not just pins.",
  "Seat and departure context should stay visible while riders compare options.",
  "Illustrative surfaces should not pull the full map runtime into the homepage bundle.",
] as const;

const pulseDots = [
  "left-[18%] top-[28%]",
  "left-[30%] top-[36%]",
  "left-[44%] top-[44%]",
  "left-[56%] top-[50%]",
  "left-[70%] top-[58%]",
] as const;

const statCards = [
  { label: "Corridor", value: "Bangalore commuter spine" },
  { label: "Snapshot", value: "3 live route types" },
  { label: "Signal", value: "fare + seats + timing" },
] as const;

const lineStyles = [
  "left-[17%] top-[30%] w-[22%] rotate-[12deg]",
  "left-[38%] top-[42%] w-[19%] rotate-[9deg]",
  "left-[54%] top-[52%] w-[18%] rotate-[16deg]",
] as const;

const MapExperience = () => {
  return (
    <section className="relative overflow-hidden border-b-2 border-black bg-white py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8">
        <div className="flex flex-col justify-center">
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
            {routeSignals.map((signal) => (
              <div
                key={signal}
                className="flex items-start gap-4 border-l-4 border-black pl-4 text-base font-medium text-black"
              >
                <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 bg-black" />
                <span>{signal}</span>
              </div>
            ))}
          </div>
        </div>

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
            <div className="absolute left-8 top-8 z-20 border-4 border-black bg-white px-6 py-4 shadow-soft">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-black">
                Illustrative Bangalore corridor
              </p>
            </div>

            <div className="absolute right-8 top-8 z-20 grid gap-3">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="border-2 border-black bg-white px-4 py-3 text-right shadow-soft"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">
                    {card.label}
                  </p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.1em] text-black">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="absolute inset-[18%_8%_12%_8%] border-2 border-black/20 bg-white/65" />

            {lineStyles.map((style) => (
              <div
                key={style}
                className={`absolute h-0 border-t-4 border-dashed border-black ${style}`}
              />
            ))}

            {pulseDots.map((style) => (
              <div
                key={style}
                className={`absolute z-10 h-3 w-3 rounded-full border-2 border-black bg-white ${style}`}
              />
            ))}

            {corridorMarkers.map((marker) => (
              <div
                key={marker.label}
                className={`absolute z-20 w-44 border-2 border-black px-4 py-3 shadow-soft ${marker.style}`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.24em] opacity-70">
                  {marker.label}
                </p>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.08em]">
                  {marker.detail}
                </p>
              </div>
            ))}

            <div className="absolute bottom-8 left-8 right-8 z-20 border-4 border-black bg-black p-6 text-white shadow-premium">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
                Why this surface changed
              </p>
              <p className="mt-3 max-w-2xl text-lg font-bold leading-8">
                The booking flow owns the real map runtime. The homepage only needs a sharp visual
                explanation of corridor logic, route density, and live inventory context.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapExperience;
