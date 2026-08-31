export function StreamingCaret({
  className = "bg-oxblood",
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`ml-0.5 inline-block h-[0.9em] w-[1.5px] animate-pulse align-[-0.1em] ${className}`}
    />
  );
}
