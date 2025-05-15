import { Link } from "wouter";
import { Project } from "@shared/schema";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Eye, Edit, FileText } from "lucide-react";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
}

export default function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const { bg, text } = getStatusColor(project.status);

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="h-48 overflow-hidden">
        <img 
          src={getProjectImage(project.id)} 
          alt={project.name}
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="p-4 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-neutral-text">{project.name}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${bg} ${text}`}>
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
        </div>
        <p className="text-sm text-neutral-textLight mt-1 font-mono">{project.contractNumber}</p>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-neutral-textLight">Start Date:</span>
            <span className="text-sm font-medium">{formatDate(project.startDate)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t border-neutral-secondary p-4 bg-neutral flex justify-between">
        <Link href={`/projects/${project.id}`}>
          <a className="text-primary text-sm hover:underline flex items-center">
            <Eye size={16} className="mr-1" />
            Details
          </a>
        </Link>
        <button
          onClick={() => onEdit(project)}
          className="text-primary text-sm hover:underline flex items-center"
        >
          <Edit size={16} className="mr-1" />
          Edit
        </button>
        <Link href={`/requisitions?projectId=${project.id}`}>
          <a className="text-primary text-sm hover:underline flex items-center">
            <FileText size={16} className="mr-1" />
            Requisitions
          </a>
        </Link>
      </CardFooter>
    </Card>
  );
}

// Function to get a project image based on ID to show different images
function getProjectImage(id: number): string {
  const images = [
    "https://images.unsplash.com/photo-1545630478-cf62cdd247d1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&h=300",
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&h=300",
    "https://images.unsplash.com/photo-1530435460869-d13625c69bbf?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&h=300",
    "https://images.unsplash.com/photo-1503594384566-461fe158e797?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=900&h=300"
  ];
  
  return images[id % images.length];
}
