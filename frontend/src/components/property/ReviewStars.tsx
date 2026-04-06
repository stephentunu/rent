import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewStarsProps {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export function ReviewStars({ rating, max = 5, size = "md", interactive = false, onRate }: ReviewStarsProps) {
  const sizes = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-6 w-6" };
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizes[size],
            "transition-colors",
            i < Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30",
            interactive && "cursor-pointer hover:text-yellow-400 hover:fill-yellow-400"
          )}
          onClick={() => interactive && onRate?.(i + 1)}
        />
      ))}
    </div>
  );
}
