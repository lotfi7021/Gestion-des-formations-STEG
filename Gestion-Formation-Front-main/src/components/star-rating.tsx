import { Star } from "lucide-react";

export function StarRating({
  value,
  className = "h-4 w-4",
  emptyClassName = "text-muted-foreground/20",
}: {
  value: number;
  className?: string;
  emptyClassName?: string;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${className} ${
            s <= Math.round(value) ? "fill-ochre text-ochre" : emptyClassName
          }`}
        />
      ))}
    </div>
  );
}
