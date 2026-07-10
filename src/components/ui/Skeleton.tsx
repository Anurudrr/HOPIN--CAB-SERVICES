/**
 * Skeleton Loading Component
 * Used for showing placeholder UI while data is loading
 */

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height = 20,
}: SkeletonProps) {
  const baseClasses =
    'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 background-size-200';

  const variantClasses = {
    text: 'rounded h-4',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  };

  const style = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-busy="true"
      aria-label="Loading"
    />
  );
}

export function RideCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex gap-2">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" />
          <Skeleton variant="text" className="w-2/3" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={60} />
      <div className="flex gap-2">
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
      <Skeleton variant="rectangular" height={80} />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <RideCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
