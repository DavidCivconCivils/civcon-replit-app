import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(num);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM dd, yyyy");
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName ? firstName.charAt(0).toUpperCase() : "";
  const last = lastName ? lastName.charAt(0).toUpperCase() : "";
  return first + last;
}

export function getStatusColor(status: string): {
  bg: string;
  text: string;
} {
  switch (status.toLowerCase()) {
    case "active":
    case "approved":
    case "issued":
    case "success":
    case "delivered":
      return { bg: "bg-status-success", text: "text-white" };
    case "pending":
    case "in progress":
    case "warning":
      return { bg: "bg-status-warning", text: "text-neutral-text" };
    case "rejected":
    case "error":
      return { bg: "bg-status-error", text: "text-white" };
    case "completed":
      return { bg: "bg-neutral-textLight", text: "text-white" };
    case "info":
    case "delivered":
      return { bg: "bg-status-info", text: "text-white" };
    default:
      return { bg: "bg-neutral-secondary", text: "text-neutral-text" };
  }
}
