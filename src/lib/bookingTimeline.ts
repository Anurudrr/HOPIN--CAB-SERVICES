import type { Booking, BookingTimelineItem } from "../types";

const statusSteps = [
  {
    key: "created_at",
    label: "Booked",
    description: "Your request has been saved and shared with the provider.",
  },
  {
    key: "accepted_at",
    label: "Accepted",
    description: "A provider accepted the booking and reserved the slot.",
  },
  {
    key: "arriving_at",
    label: "Arriving",
    description: "The provider is moving toward the pickup or meeting point.",
  },
  {
    key: "ongoing_at",
    label: "Ongoing",
    description: "The booking is now actively in progress.",
  },
  {
    key: "completed_at",
    label: "Completed",
    description: "The booking has been completed and archived.",
  },
] as const;

type TimelineKey = (typeof statusSteps)[number]["key"];

function getBookingTimestamp(booking: Booking, key: TimelineKey) {
  if (key === "ongoing_at") {
    return booking.ongoing_at ?? booking.started_at ?? null;
  }

  return booking[key] ?? null;
}

export function buildBookingTimeline(booking: Booking): BookingTimelineItem[] {
  return statusSteps.map((step) => {
    const timestamp = getBookingTimestamp(booking, step.key);

    return {
      key: step.key,
      label: step.label,
      description: step.description,
      timestamp,
      completed: Boolean(timestamp),
    };
  });
}
