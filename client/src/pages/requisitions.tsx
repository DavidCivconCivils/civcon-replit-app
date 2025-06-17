import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Requisition, Project, Supplier } from "@shared/schema";
import RequisitionForm from "@/components/requisitions/RequisitionForm";
import RequisitionPreview from "@/components/requisitions/RequisitionPreview";
import RequisitionApprovalDialog from "@/components/requisitions/RequisitionApprovalDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Plus, Search, Eye, Edit, Printer, FileText, Mail, XCircle, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Requisitions() {
  const [location, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequisition, setSelectedRequisition] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [requisitionToCancel, setRequisitionToCancel] = useState<Requisition | null>(null);
  const [requisitionToApprove, setRequisitionToApprove] = useState<number | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check URL params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1]);
    
    // Check if we should show the form
    if (searchParams.has('new') && searchParams.get('new') === 'true') {
      setShowForm(true);
      // Clear the query parameter
      setLocation('/requisitions', { replace: true });
    }
    
    // Check if a status filter is specified
    if (searchParams.has('status')) {
      const status = searchParams.get('status');
      if (status === 'pending' || status === 'approved' || status === 'rejected' || status === 'all') {
        setActiveTab(status);
      }
    }
    
    // Check if a project filter is specified
    if (searchParams.has('projectId')) {
      setProjectFilter(searchParams.get('projectId'));
    } else {
      setProjectFilter(null);
    }
  }, [location, setLocation]);

  // Fetch requisitions
  const { data: requisitions, isLoading } = useQuery<Requisition[]>({
    queryKey: ['/api/requisitions'],
  });
  
  // Fetch projects data
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Fetch suppliers data
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  // Mutation for cancelling requisitions
  const cancelRequisitionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/requisitions/${id}/status`, { status: "cancelled" });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Requisition cancelled",
        description: "The requisition has been successfully cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requisitions'] });
      setShowCancelDialog(false);
      setRequisitionToCancel(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error cancelling requisition",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Fetch requisition details for preview
  const { data: requisitionDetails, isLoading: isLoadingDetails } = useQuery<any>({
    queryKey: ['/api/requisitions', selectedRequisition],
    queryFn: async () => {
      if (!selectedRequisition) return null;
      console.log("Fetching details for requisition ID:", selectedRequisition);
      const response = await fetch(`/api/requisitions/${selectedRequisition}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch requisition: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Received requisition data:", data);
      return data;
    },
    enabled: selectedRequisition !== null
  });

  // Filter and sort requisitions
  const filteredRequisitions = requisitions?.filter(req => {
    // Filter by project if specified
    if (projectFilter && req.projectId !== parseInt(projectFilter)) {
      return false;
    }
    
    // Filter by status tab
    if (activeTab !== "all") {
      // Special handling for each tab to ensure correct filtering
      if (activeTab === "pending" && req.status !== "pending") {
        return false;
      } else if (activeTab === "approved" && req.status !== "approved") {
        return false;
      } else if (activeTab === "rejected" && req.status !== "rejected") {
        return false;
      }
    }
    
    // Filter by search term
    if (searchTerm && !req.requisitionNumber.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by date (newest first)
    return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
  });

  const handleShowForm = () => {
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handlePreviewRequisition = (id: number) => {
    setSelectedRequisition(id);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setSelectedRequisition(null);
  };

  // Email requisition mutation
  const emailRequisitionMutation = useMutation({
    mutationFn: async (requisitionId: number) => {
      const res = await apiRequest("POST", `/api/requisitions/${requisitionId}/email`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email sent",
        description: "The requisition has been emailed to finance successfully.",
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message || "There was an error sending the email. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleExportPdf = () => {
    if (!selectedRequisition) return;
    
    // Call the PDF export endpoint and trigger a download
    fetch(`/api/requisitions/${selectedRequisition}/pdf`, {
      method: 'GET',
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      return response.blob();
    })
    .then(blob => {
      // Create a download link for the blob
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `requisition-${selectedRequisition}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    })
    .catch(error => {
      toast({
        title: "PDF Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    });
  };
  
  const handleEmailRequisition = () => {
    if (selectedRequisition) {
      emailRequisitionMutation.mutate(selectedRequisition);
    }
  };
  
  const handleEditRequisition = (id: number) => {
    // Here you would typically load the requisition and populate a form
    // For now, just show the form as if creating a new requisition
    setShowForm(true);
    // In a full implementation, you'd set the form data to match the existing requisition
  };
  
  const handleApproveRequisition = (id: number) => {
    setRequisitionToApprove(id);
    setShowApprovalDialog(true);
  };
  
  const handleCloseApprovalDialog = () => {
    setShowApprovalDialog(false);
    setRequisitionToApprove(null);
  };

  // Get the filtered project details if filtering by project
  const filteredProject = projectFilter ? projects.find(p => p.id === parseInt(projectFilter)) : null;
  
  // Count outstanding (pending) requisitions for the current filter
  const outstandingCount = filteredRequisitions?.filter(req => req.status === "pending").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-text">
            {filteredProject ? `${filteredProject.name} - Requisitions` : 'Purchase Requisitions'}
          </h1>
          {filteredProject && (
            <p className="text-sm text-neutral-textLight mt-1">
              {outstandingCount} outstanding requisition{outstandingCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button className="flex items-center" onClick={handleShowForm}>
          <Plus className="mr-2 h-4 w-4" />
          New Requisition
        </Button>
      </div>
      
      {showForm ? (
        <RequisitionForm onSuccess={handleCloseForm} />
      ) : (
        <>
          {/* Tabs for filtering by status */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Sent for Approval</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
                
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-textLight" />
                  <Input 
                    placeholder="Search requisitions..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <TabsContent value={activeTab} className="mt-4">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                    <p className="mt-2 text-neutral-textLight">Loading requisitions...</p>
                  </div>
                ) : filteredRequisitions && filteredRequisitions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requisition #</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequisitions.map((req) => {
                        const { bg, text } = getStatusColor(req.status);
                        return (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium font-mono">{req.requisitionNumber}</TableCell>
                            <TableCell>{projects.find(p => p.id === req.projectId)?.name || `Project ${req.projectId}`}</TableCell>
                            <TableCell>{suppliers.find(s => s.id === req.supplierId)?.name || `Supplier ${req.supplierId}`}</TableCell>
                            <TableCell>{formatDate(req.requestDate)}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(req.totalAmount.toString()))}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs rounded-full ${bg} ${text}`}>
                                {req.status === "pending" ? "Sent for Approval" : 
                                 req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex space-x-2 justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-primary hover:text-primary-dark"
                                  onClick={() => handlePreviewRequisition(req.id)}
                                >
                                  <Eye size={16} />
                                </Button>
                                {/* Only allow creators or admin/finance to edit pending requisitions */}
                                {req.status === "pending" && (
                                  req.requestedById === user?.id || user?.role === "finance" || user?.role === "admin"
                                ) && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-primary hover:text-primary-dark"
                                    onClick={() => handleEditRequisition(req.id)}
                                  >
                                    <Edit size={16} />
                                  </Button>
                                )}
                                {/* Allow creator or finance/admin to email the requisition */}
                                {(req.requestedById === user?.id || user?.role === "finance" || user?.role === "admin") && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-primary hover:text-primary-dark"
                                    onClick={() => {
                                      setSelectedRequisition(req.id);
                                      emailRequisitionMutation.mutate(req.id);
                                    }}
                                  >
                                    <Mail size={16} />
                                  </Button>
                                )}
                                {/* Only allow creators or admin/finance to cancel pending requisitions */}
                                {req.status === "pending" && (
                                  req.requestedById === user?.id || user?.role === "finance" || user?.role === "admin"
                                ) && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                                    onClick={() => {
                                      setRequisitionToCancel(req);
                                      setShowCancelDialog(true);
                                    }}
                                  >
                                    <XCircle size={16} />
                                  </Button>
                                )}
                                {req.status === "pending" && (user?.role === "finance" || user?.role === "admin") && (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-success hover:text-success/80"
                                      onClick={() => handleApproveRequisition(req.id)}
                                    >
                                      <CheckCircle size={16} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="h-8 text-primary hover:text-primary-dark text-xs"
                                      onClick={() => handlePreviewRequisition(req.id)}
                                    >
                                      View
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center">
                    <h3 className="text-lg font-medium mb-2">No Requisitions Found</h3>
                    <p className="text-neutral-textLight mb-4">
                      {searchTerm || activeTab !== "all"
                        ? "Try adjusting your filters or search terms."
                        : "Get started by creating your first requisition."}
                    </p>
                    <Button onClick={handleShowForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      New Requisition
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Requisition Preview Dialog */}
          <Dialog open={isPreviewOpen} onOpenChange={handleClosePreview}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Requisition Preview</DialogTitle>
              </DialogHeader>
              {isLoadingDetails ? (
                <div className="p-8 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                  <p className="mt-2 text-neutral-textLight">Loading details...</p>
                </div>
              ) : requisitionDetails ? (
                <RequisitionPreview 
                  requisition={requisitionDetails} 
                  onExportPdf={handleExportPdf}
                  onEmail={handleEmailRequisition}
                />
              ) : (
                <p className="text-neutral-textLight">Could not load requisition details.</p>
              )}
            </DialogContent>
          </Dialog>
          
          {/* Cancel Requisition Dialog */}
          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Requisition</DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel this requisition? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              {requisitionToCancel && (
                <div className="py-4">
                  <p className="text-sm font-semibold">Requisition Details:</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>Requisition #: <span className="font-mono">{requisitionToCancel.requisitionNumber}</span></p>
                    <p>Project: {projects.find(p => p.id === requisitionToCancel.projectId)?.name || `Project ${requisitionToCancel.projectId}`}</p>
                    <p>Supplier: {suppliers.find(s => s.id === requisitionToCancel.supplierId)?.name || `Supplier ${requisitionToCancel.supplierId}`}</p>
                    <p>Total: {formatCurrency(parseFloat(requisitionToCancel.totalAmount.toString()))}</p>
                  </div>
                </div>
              )}
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCancelDialog(false);
                    setRequisitionToCancel(null);
                  }}
                >
                  No, Keep it
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => requisitionToCancel && cancelRequisitionMutation.mutate(requisitionToCancel.id)}
                  disabled={cancelRequisitionMutation.isPending}
                >
                  {cancelRequisitionMutation.isPending ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></span>
                      Cancelling...
                    </span>
                  ) : (
                    "Yes, Cancel Requisition"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Approval Dialog */}
          <RequisitionApprovalDialog 
            isOpen={showApprovalDialog} 
            onClose={handleCloseApprovalDialog} 
            requisitionId={requisitionToApprove} 
          />
        </>
      )}
    </div>
  );
}
