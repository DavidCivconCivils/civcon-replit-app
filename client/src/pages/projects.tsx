import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Project } from "@shared/schema";
import ProjectCard from "@/components/projects/ProjectCard";
import ProjectForm from "@/components/projects/ProjectForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, Filter } from "lucide-react";

export default function Projects() {
  const [location, setLocation] = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Check if there's a new query param indicating we should open the form
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1]);
    if (searchParams.has('new') && searchParams.get('new') === 'true') {
      setIsFormOpen(true);
      // Clear the query parameter
      setLocation('/projects', { replace: true });
    }
  }, [location, setLocation]);

  // Fetch projects
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Filter projects based on status and search term
  const filteredProjects = projects?.filter(project => {
    // Filter by status
    if (statusFilter !== "all" && project.status !== statusFilter) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !project.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const handleOpenForm = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProject(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-text">Projects</h1>
        <Button className="flex items-center" onClick={handleOpenForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>
      
      {/* Project Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-full sm:w-auto">
            <Label htmlFor="status-filter" className="block text-sm font-medium text-neutral-textLight mb-1">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter" className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="in progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full sm:w-auto flex-grow">
            <Label htmlFor="search-projects" className="block text-sm font-medium text-neutral-textLight mb-1">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-textLight" />
              <Input 
                id="search-projects" 
                placeholder="Search projects..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white rounded-lg shadow overflow-hidden flex flex-col h-[350px] animate-pulse">
              <div className="h-48 bg-neutral-secondary"></div>
              <div className="p-4 flex-grow space-y-3">
                <div className="flex justify-between">
                  <div className="h-6 w-36 bg-neutral-secondary rounded"></div>
                  <div className="h-6 w-20 bg-neutral-secondary rounded-full"></div>
                </div>
                <div className="h-4 w-28 bg-neutral-secondary rounded"></div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-24 bg-neutral-secondary rounded"></div>
                    <div className="h-4 w-20 bg-neutral-secondary rounded"></div>
                  </div>
                </div>
              </div>
              <div className="border-t border-neutral-secondary p-4 bg-neutral flex justify-between">
                <div className="h-4 w-16 bg-neutral-secondary rounded"></div>
                <div className="h-4 w-16 bg-neutral-secondary rounded"></div>
                <div className="h-4 w-16 bg-neutral-secondary rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEditProject}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-lg font-medium mb-2">No Projects Found</h3>
          <p className="text-neutral-textLight mb-4">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your filters or search terms."
              : "Get started by adding your first project."}
          </p>
          <Button onClick={handleOpenForm}>
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>
      )}
      
      {/* Project Form Dialog */}
      {isFormOpen && (
        <ProjectForm
          project={editingProject || undefined}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
