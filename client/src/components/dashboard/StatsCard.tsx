import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBackgroundColor: string;
  className?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  iconBackgroundColor,
  className,
}: StatsCardProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow p-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-textLight">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <div className={cn("p-2 rounded-full text-white", iconBackgroundColor)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
