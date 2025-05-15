import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Requisition } from "@shared/schema";
import RequisitionForm from "@/components/requisitions/RequisitionForm";
import RequisitionPreview from "@/components/requisitions/RequisitionPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Plus, Search, Eye, Edit, Printer, FileText, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Requisitions() {
  const [location, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequisition, setSelectedRequisition] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();

  // Check URL params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1]);
    
    // Check if we should show the form
    if (searchParams.has('new') && searchParams.get('new') === 'true') {
      setShowForm(true);
      // Clear the query parameter
      setLocation('/requisitions', { replace: true });
    }
    
    // Check if a project filter is specified
    if (searchParams.has('projectId')) {
      // Could set additional filter here
    }
  }, [location, setLocation]);

  // Fetch requisitions
  const { data: requisitions, isLoading } = useQuery<Requisition[]>({
    queryKey: ['/api/requisitions'],
  });

  // Fetch requisition details for preview
  const { data: requisitionDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/requisitions', selectedRequisition],
    enabled: selectedRequisition !== null,
  });

  // Filter and sort requisitions
  const filteredRequisitions = requisitions?.filter(req => {
    // Filter by status tab
    if (activeTab !== "all" && req.status !== activeTab) {
      return false;
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

  // Handle print functionality
  const handlePrintRequisition = () => {
    window.print();
  };

  const handleExportPdf = () => {
    // This would typically invoke a server endpoint to generate and download a PDF
    // For now, we'll simulate it with an alert
    alert('PDF export functionality would be implemented here.');
  };
  
  const handleEmailRequisition = () => {
    if (selectedRequisition) {
      emailRequisitionMutation.mutate(selectedRequisition);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-text">Purchase Requisitions</h1>
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
                  <TabsTrigger value="pending">Pending</TabsTrigger>
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
                            <TableCell>{req.projectId}</TableCell>
                            <TableCell>{req.supplierId}</TableCell>
                            <TableCell>{formatDate(req.requestDate)}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(req.totalAmount.toString()))}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs rounded-full ${bg} ${text}`}>
                                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
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
                                {req.status === "pending" && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-primary hover:text-primary-dark"
                                  >
                                    <Edit size={16} />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-primary hover:text-primary-dark"
                                  onClick={() => handlePreviewRequisition(req.id)}
                                >
                                  <Printer size={16} />
                                </Button>
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
                  data={requisitionDetails} 
                  onPrint={handlePrintRequisition}
                  onExportPdf={handleExportPdf}
                  onEmail={handleEmailRequisition}
                />
              ) : (
                <p className="text-neutral-textLight">Could not load requisition details.</p>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
