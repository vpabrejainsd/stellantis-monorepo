import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  totalStars?: number;
}
const StarRating = ({
  rating,
  onRatingChange,
  totalStars = 5,
}: StarRatingProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  return (
    <div className="flex items-center space-x-1">
      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hoverRating ?? rating);
        return (
          <button
            key={starValue}
            type="button"
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(null)}
            onClick={() => onRatingChange(starValue)}
            className="cursor-pointer"
          >
            <Star
              className={cn(
                "h-8 w-8 transition-colors",
                isFilled ? "fill-yellow-400 text-yellow-400" : "text-gray-300",
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
