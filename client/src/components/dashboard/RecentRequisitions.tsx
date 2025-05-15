import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Requisition } from "@shared/schema";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, CalendarDays } from "lucide-react";

export default function RecentRequisitions() {
  const { data: requisitions, isLoading } = useQuery<Requisition[]>({
    queryKey: ['/api/requisitions'],
  });

  if (isLoading) {
    return (
      <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-neutral-secondary flex justify-between items-center">
          <h3 className="text-lg font-medium text-neutral-text">Recent Requisitions</h3>
          <Link href="/requisitions" className="text-primary text-sm hover:underline">
            View All
          </Link>
        </div>
        <ul className="divide-y divide-neutral-secondary">
          {Array(4).fill(0).map((_, i) => (
            <li key={i} className="px-4 py-3 flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center">
                <Skeleton className="h-6 w-24 rounded-full mr-2" />
                <ChevronRight className="text-neutral-textLight" size={18} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-neutral-secondary flex justify-between items-center">
        <h3 className="text-lg font-medium text-neutral-text">Recent Requisitions</h3>
        <Link href="/requisitions" className="text-primary text-sm hover:underline">
          View All
        </Link>
      </div>
      <ul className="divide-y divide-neutral-secondary">
        {requisitions && requisitions.length > 0 ? (
          requisitions.slice(0, 4).map((req) => {
            const { bg, text } = getStatusColor(req.status);
            return (
              <li key={req.id} className="px-4 py-3 flex items-center justify-between hover:bg-neutral-secondary/20">
                <div>
                  <p className="text-sm font-medium">{req.requisitionNumber}</p>
                  <p className="text-xs text-neutral-textLight flex items-center">
                    <CalendarDays className="mr-1" size={12} />
                    {formatDate(req.requestDate)}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${bg} ${text} mr-2`}>
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                  <Link href={`/requisitions/${req.id}`}>
                    <a>
                      <ChevronRight className="text-neutral-textLight" size={18} />
                    </a>
                  </Link>
                </div>
              </li>
            );
          })
        ) : (
          <li className="px-4 py-6 text-center text-neutral-textLight">
            No requisitions found.
          </li>
        )}
      </ul>
    </div>
  );
}
