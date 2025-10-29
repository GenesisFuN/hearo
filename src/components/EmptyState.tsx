import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-12 px-4 text-center ${className}`}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center text-text-light/40">
          {icon}
        </div>
      )}

      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-text-light">{title}</h3>
        {description && (
          <p className="text-sm text-text-light/70">{description}</p>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-6 py-3 bg-accent hover:bg-accent/80 text-background font-medium rounded-lg transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
