type Props = { count?: number };

export default function SkeletonList({ count = 6 }: Props): JSX.Element {
  return (
    <div className="space-y-3" aria-busy>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 rounded-lg bg-gray-200 animate-pulse" />
      ))}
    </div>
  );
}


