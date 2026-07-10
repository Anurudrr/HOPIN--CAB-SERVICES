import type { Booking } from "../../types";
import { buildBookingTimeline } from "../../lib/bookingTimeline";
import { formatDateTime } from "../../lib/format";
import { cn } from "../../lib/utils";

export function BookingTimelineCard({
  booking,
  title = "Booking timeline",
}: {
  booking: Booking;
  title?: string;
}) {
  const timeline = buildBookingTimeline(booking);

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
            {booking.booking_code || booking.id.slice(0, 8)}
          </h3>
        </div>
        <span className="route-chip">{booking.status.replace("_", " ")}</span>
      </div>

      <div className="mt-6 grid gap-4">
        {timeline.map((item, index) => (
          <div key={item.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-4 w-4 border-2 border-black",
                  item.completed ? "bg-black" : "bg-white",
                )}
              />
              {index < timeline.length - 1 ? (
                <div className="h-full min-h-8 border-l-2 border-dashed border-black/30" />
              ) : null}
            </div>
            <div className="pb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-black">
                {item.label}
              </p>
              <p className="mt-1 text-sm text-black/60">{item.description}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-black/40">
                {item.timestamp ? formatDateTime(item.timestamp) : "Awaiting update"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
