import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Project, Requisition, PurchaseOrder } from "@shared/schema";
import StatsCard from "@/components/dashboard/StatsCard";
import ProjectsTable from "@/components/dashboard/ProjectsTable";
import RecentRequisitions from "@/components/dashboard/RecentRequisitions";
import { HardHat, FileText, Building2, ShoppingCart, Plus, Building, UserPen, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  const { user } = useAuth();
  const [currentDate] = useState(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));

  // Fetch data for dashboard
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: requisitions } = useQuery<Requisition[]>({
    queryKey: ['/api/requisitions'],
  });

  const { data: suppliers } = useQuery<Requisition[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: purchaseOrders } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
  });

  // Calculate stats
  const activeProjects = projects?.filter(p => p.status === 'active').length || 0;
  const pendingRequisitions = requisitions?.filter(r => r.status === 'pending').length || 0;
  const activeSuppliers = suppliers?.length || 0;
  const totalPurchaseOrders = purchaseOrders?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-text">Dashboard</h1>
        <div className="flex space-x-3">
          <span className="text-sm text-neutral-textLight">Today: <span className="font-medium">{currentDate}</span></span>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Active Projects" 
          value={activeProjects} 
          icon={<HardHat size={20} />} 
          iconBackgroundColor="bg-primary-light" 
        />
        
        <StatsCard 
          title="Pending Requisitions" 
          value={pendingRequisitions} 
          icon={<FileText size={20} />} 
          iconBackgroundColor="bg-secondary" 
        />
        
        <StatsCard 
          title="Active Suppliers" 
          value={activeSuppliers} 
          icon={<Building2 size={20} />} 
          iconBackgroundColor="bg-accent" 
        />
        
        <StatsCard 
          title="Total Purchase Orders" 
          value={totalPurchaseOrders} 
          icon={<ShoppingCart size={20} />} 
          iconBackgroundColor="bg-status-info" 
        />
      </div>
      
      {/* Project Overview */}
      <ProjectsTable />
      
      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Requisitions */}
        <RecentRequisitions />
        
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-neutral-secondary">
            <h3 className="text-lg font-medium text-neutral-text">Quick Actions</h3>
          </div>
          <div className="p-4 space-y-3">
            <Link href="/requisitions?new=true">
              <a className="flex items-center p-3 bg-primary text-white rounded-md">
                <Plus className="mr-3 h-5 w-5" />
                New Requisition
              </a>
            </Link>
            <Link href="/projects?new=true">
              <a className="flex items-center p-3 bg-neutral-secondary text-neutral-text rounded-md">
                <Building className="mr-3 h-5 w-5" />
                Add Project
              </a>
            </Link>
            <Link href="/suppliers?new=true">
              <a className="flex items-center p-3 bg-neutral-secondary text-neutral-text rounded-md">
                <UserPen className="mr-3 h-5 w-5" />
                Add Supplier
              </a>
            </Link>
            <Link href="/reports">
              <a className="flex items-center p-3 bg-neutral-secondary text-neutral-text rounded-md">
                <BarChart3 className="mr-3 h-5 w-5" />
                Generate Reports
              </a>
            </Link>
          </div>
          
          {/* Featured Projects */}
          <div className="px-4 py-3 bg-neutral-secondary">
            <h4 className="text-sm font-medium text-neutral-text">Featured Projects</h4>
          </div>
          <div className="p-4 space-y-4">
            <div className="rounded-md overflow-hidden relative h-32">
              <img 
                src="https://images.unsplash.com/photo-1503594384566-461fe158e797?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=900&h=300" 
                alt="Construction site overview" 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              
              {projects && projects.length > 0 && (
                <div className="absolute bottom-0 left-0 p-3 text-white">
                  <h4 className="font-medium">{projects[0].name}</h4>
                  <p className="text-xs opacity-90">Contract: {projects[0].contractNumber}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
