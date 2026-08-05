/**
 * Skeleton Loading Component
 * Used for showing placeholder UI while data is loading.
 * Brutalist variant — uses a horizontal shimmer sweep across hard-edged blocks
 * (no rounded corners, no Tailwind pulse) to stay on-brand.
 */

import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height = 20,
}: SkeletonProps) {
  const variantClasses = {
    text: "h-4",
    rectangular: "",
    circular: "rounded-full",
  };

  const style: React.CSSProperties = {
    ...(width !== undefined && { width: typeof width === "number" ? `${width}px` : width }),
    ...(height !== undefined && { height: typeof height === "number" ? `${height}px` : height }),
  };

  return (
    <div
      className={cn("shimmer border-2 border-black/15 bg-black/[0.06]", variantClasses[variant], className)}
      style={style}
      aria-busy="true"
      aria-label="Loading"
    />
  );
}

export function RideCardSkeleton() {
  return (
    <div className="border-2 border-black bg-white p-4 shadow-soft">
      <div className="flex gap-3">
        <Skeleton variant="circular" width={44} height={44} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" />
          <Skeleton variant="text" className="w-2/3" />
        </div>
      </div>
      <div className="mt-4">
        <Skeleton variant="rectangular" height={64} />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton variant="rectangular" className="flex-1" height={40} />
        <Skeleton variant="rectangular" className="flex-1" height={40} />
      </div>
    </div>
  );
}

export function BookingDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton variant="text" className="w-1/3" height={28} />
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </div>
      <Skeleton variant="rectangular" height={84} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="flex-1" height={40} />
        <Skeleton variant="rectangular" className="flex-1" height={40} />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton variant="text" className="w-1/4" height={32} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <RideCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}