import { getAvatarEmoji } from "@/lib/avatars";

interface AvatarProps {
  avatarId?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function Avatar({
  avatarId,
  size = "md",
  className = "",
}: AvatarProps) {
  const sizeClasses = {
    sm: "w-10 h-10 text-2xl",
    md: "w-16 h-16 text-4xl",
    lg: "w-24 h-24 text-5xl",
    xl: "w-32 h-32 text-6xl",
  };

  const borderSizes = {
    sm: "border-2",
    md: "border-3",
    lg: "border-4",
    xl: "border-4",
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${borderSizes[size]}
        rounded-full 
        bg-gradient-to-br from-accent/20 to-accent/5 
        flex items-center justify-center 
        border-surface-light
        ${className}
      `}
    >
      {getAvatarEmoji(avatarId || "cat")}
    </div>
  );
}
