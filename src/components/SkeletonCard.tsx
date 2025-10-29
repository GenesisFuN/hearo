interface SkeletonCardProps {
  className?: string;
}

export default function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`bg-surface rounded-lg overflow-hidden animate-pulse ${className}`}
    >
      {/* Cover Image */}
      <div className="aspect-[2/3] bg-surface-light" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-5 bg-surface-light rounded w-3/4" />

        {/* Author */}
        <div className="h-4 bg-surface-light rounded w-1/2" />

        {/* Duration */}
        <div className="h-3 bg-surface-light rounded w-1/3" />
      </div>
    </div>
  );
}
