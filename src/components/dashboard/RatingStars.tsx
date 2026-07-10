import { Star } from "lucide-react";

import { cn } from "../../lib/utils";

export function RatingStars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < Math.round(rating);

        return (
          <Star
            key={index}
            size={14}
            className={filled ? "fill-black text-black" : "text-black/20"}
          />
        );
      })}
      <span className="ml-1 text-xs font-bold uppercase tracking-[0.14em] text-black/50">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}
