import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import CivconLogo from "@/assets/civcon-logo.svg";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  HardHat, 
  Building2, 
  FileText, 
  ShoppingCart, 
  LogOut, 
  Users
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div className={cn(
      "w-64 bg-primary text-white h-full flex-shrink-0 fixed md:static z-40 transform transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 flex items-center justify-center border-b border-primary-light">
          <img src={CivconLogo} alt="Civcon Office" className="h-8" />
          <h1 className="text-xl font-bold ml-2">Civcon Office</h1>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-2 space-y-1">
            <NavLink href="/dashboard" icon={<LayoutDashboard size={18} />} text="Dashboard" active={location === "/dashboard"} />
            <NavLink href="/projects" icon={<HardHat size={18} />} text="Projects" active={location === "/projects"} />
            <NavLink href="/suppliers" icon={<Building2 size={18} />} text="Suppliers" active={location === "/suppliers"} />
            <NavLink href="/requisitions" icon={<FileText size={18} />} text="Requisitions" active={location === "/requisitions"} />
            <NavLink href="/orders" icon={<ShoppingCart size={18} />} text="Purchase Orders" active={location === "/orders"} />
            {(user?.role === "admin" || user?.role === "finance") && (
              <NavLink href="/reports" icon={<FileText size={18} />} text="Reports" active={location === "/reports"} />
            )}
            {user?.role === "admin" && (
              <NavLink href="/users" icon={<Users size={18} />} text="Users" active={location === "/users"} />
            )}
          </div>
        </nav>
        
        {/* User Profile */}
        <div className="p-4 border-t border-primary-light">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 rounded-full bg-primary-light overflow-hidden">
              {user?.profileImageUrl ? (
                <AvatarImage src={user.profileImageUrl} alt="User avatar" />
              ) : null}
              <AvatarFallback className="bg-primary-light">
                {user?.firstName?.charAt(0) || ''}{user?.lastName?.charAt(0) || ''}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-neutral-tertiary truncate">
                {user?.role === 'admin' ? 'Administrator' : 
                 user?.role === 'finance' ? 'Finance Team' : 'Project Manager'}
              </p>
            </div>
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => {
                  window.location.href = "/api/logout";
                }}
                className="p-1 rounded-full hover:bg-primary-light"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  active: boolean;
}

function NavLink({ href, icon, text, active }: NavLinkProps) {
  return (
    <Link href={href}>
      <a className={cn(
        "flex items-center px-4 py-2 text-sm rounded-md transition-colors duration-200",
        active 
          ? "bg-primary-light" 
          : "hover:bg-primary-light"
      )}>
        <span className="mr-3">{icon}</span>
        {text}
      </a>
    </Link>
  );
}
