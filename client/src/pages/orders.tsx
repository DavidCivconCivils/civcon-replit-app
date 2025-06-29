import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PurchaseOrder, Requisition, Project, Supplier } from "@shared/schema";
import PurchaseOrderForm from "@/components/orders/PurchaseOrderForm";
import PurchaseOrderPreview from "@/components/orders/PurchaseOrderPreview";
import PurchaseOrderEdit from "@/components/orders/PurchaseOrderEdit";
import RequisitionApprovalDialog from "@/components/requisitions/RequisitionApprovalDialog";
import RequisitionViewEdit from "@/components/requisitions/RequisitionViewEdit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Filter, Search, Eye, Edit, Mail, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Orders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<number | null>(null);
  const [isRequisitionPreviewOpen, setIsRequisitionPreviewOpen] = useState(false);
  const [requisitionToApprove, setRequisitionToApprove] = useState<number | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [editPurchaseOrderId, setEditPurchaseOrderId] = useState<number | null>(null);
  const [isPurchaseOrderEditOpen, setIsPurchaseOrderEditOpen] = useState(false);

  // Check if user is finance or admin
  const isFinanceOrAdmin = user?.role === 'admin' || user?.role === 'finance';

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
  });

  // Fetch all requisitions - needed for both finance/admin and requesters
  const { data: requisitions = [], isLoading: isLoadingRequisitions } = useQuery<Requisition[]>({
    queryKey: ['/api/requisitions'],
  });

  // Get pending requisitions - these are the ones with status 'pending' (case insensitive)
  const pendingRequisitions = requisitions.filter(req => req.status.toLowerCase() === 'pending');
  
  // Get requisitions created by the current user
  const userCreatedRequisitions = user ? requisitions.filter(req => 
    req.requestedById === user.id && req.status.toLowerCase() === 'pending'
  ) : [];

  // Fetch order details for preview
  const { data: orderDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/purchase-orders', selectedOrder],
    queryFn: async () => {
      if (!selectedOrder) return null;
      const response = await fetch(`/api/purchase-orders/${selectedOrder}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch purchase order: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: selectedOrder !== null,
  });

  // Fetch projects and suppliers for displaying names
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  // Filter purchase orders
  const filteredOrders = purchaseOrders.filter(order => {
    if (!searchTerm) return true;
    
    return (
      order.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }).sort((a, b) => {
    // Sort by date (newest first)
    return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
  });

  // Generate PDF mutation
  const generatePdfMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("GET", `/api/purchase-orders/${orderId}/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    onError: (error: Error) => {
      toast({
        title: "Error generating PDF",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Email PO mutation
  const emailPurchaseOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/purchase-orders/${id}/email`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email sent",
        description: "Purchase order has been emailed to the supplier.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Email failed",
        description: error.message || "Failed to email purchase order to supplier.",
        variant: "destructive",
      });
    },
  });

  // Handle preview
  const handlePreview = (orderId: number) => {
    setSelectedOrder(orderId);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setSelectedOrder(null);
  };

  // Handle requisition preview
  const handleViewRequisition = (requisitionId: number) => {
    setSelectedRequisition(requisitionId);
    setIsRequisitionPreviewOpen(true);
  };

  const handleCloseRequisitionPreview = () => {
    setIsRequisitionPreviewOpen(false);
    setSelectedRequisition(null);
  };

  // Handle approve requisition
  const handleApproveRequisition = (requisitionId: number) => {
    setRequisitionToApprove(requisitionId);
    setShowApprovalDialog(true);
  };

  const handleCloseApprovalDialog = () => {
    setShowApprovalDialog(false);
    setRequisitionToApprove(null);
  };

  // Handle edit purchase order
  const handleEditPurchaseOrder = (orderId: number) => {
    setEditPurchaseOrderId(orderId);
    setIsPurchaseOrderEditOpen(true);
  };

  const handleClosePurchaseOrderEdit = () => {
    setIsPurchaseOrderEditOpen(false);
    setEditPurchaseOrderId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-text">Purchase Orders</h1>
        {isFinanceOrAdmin && (
          <Button onClick={() => setIsFormOpen(true)}>Create Purchase Order</Button>
        )}
      </div>
      
      <Tabs defaultValue="orders" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          
          {/* Finance/Admin can see all pending requisitions */}
          {isFinanceOrAdmin && (
            <TabsTrigger value="pending">
              Requisitions to Process
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                {pendingRequisitions.length}
              </span>
            </TabsTrigger>
          )}
          
          {/* All users can see their own pending requisitions */}
          {userCreatedRequisitions.length > 0 && (
            <TabsTrigger value="my-requisitions">
              My Pending Requisitions
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                {userCreatedRequisitions.length}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Purchase Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {/* Purchase Orders Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-textLight" />
                <Input 
                  placeholder="Search orders..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Purchase Orders Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-neutral-secondary">
              <h3 className="text-lg font-medium text-neutral-text">All Purchase Orders</h3>
            </div>
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                <p className="mt-2 text-neutral-textLight">Loading purchase orders...</p>
              </div>
            ) : filteredOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO #</TableHead>
                    <TableHead>Requisition #</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const { bg, text } = getStatusColor(order.status);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium font-mono">{order.poNumber}</TableCell>
                        <TableCell className="font-mono">{order.requisitionId}</TableCell>
                        <TableCell>{formatDate(order.issueDate)}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(order.totalAmount.toString()))}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${bg} ${text}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex space-x-2 justify-end">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary hover:text-primary-dark"
                              onClick={() => handlePreview(order.id)}
                            >
                              <Eye size={16} />
                            </Button>
                            {isFinanceOrAdmin && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-primary hover:text-primary-dark"
                                onClick={() => handleEditPurchaseOrder(order.id)}
                              >
                                <Edit size={16} />
                              </Button>
                            )}
                            {isFinanceOrAdmin && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-primary hover:text-primary-dark"
                                onClick={() => emailPurchaseOrderMutation.mutate(order.id)}
                                disabled={emailPurchaseOrderMutation.isPending}
                              >
                                {emailPurchaseOrderMutation.isPending && selectedOrder === order.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                                ) : (
                                  <Mail size={16} />
                                )}
                              </Button>
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
                <h3 className="text-lg font-medium mb-2">No Purchase Orders Found</h3>
                <p className="text-neutral-textLight mb-4">
                  {searchTerm
                    ? "Try adjusting your search terms."
                    : "No purchase orders have been created yet."}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Finance/Admin Tab for pending requisitions */}
        {isFinanceOrAdmin && (
          <TabsContent value="pending" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Pending Requisitions to Process</h2>
            </div>

            {isLoadingRequisitions ? (
              <div className="text-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                <p className="mt-2 text-neutral-textLight">Loading requisitions...</p>
              </div>
            ) : pendingRequisitions.length > 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requisition #</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequisitions.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.requisitionNumber}</TableCell>
                        <TableCell>
                          {projects.find((p: Project) => p.id === req.projectId)?.name || `Project ${req.projectId}`}
                        </TableCell>
                        <TableCell>
                          {suppliers.find((s: Supplier) => s.id === req.supplierId)?.name || `Supplier ${req.supplierId}`}
                        </TableCell>
                        <TableCell>{formatDate(req.requestDate)}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(req.totalAmount.toString()))}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewRequisition(req.id)}
                              className="flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApproveRequisition(req.id)}
                              className="flex items-center"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Process
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 border rounded-md bg-white shadow">
                <p className="text-neutral-textLight">No requisitions awaiting processing.</p>
              </div>
            )}
          </TabsContent>
        )}

        {/* My Pending Requisitions Tab - For non-finance/admin users */}
        <TabsContent value="my-requisitions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">My Pending Requisitions</h2>
          </div>

          {isLoadingRequisitions ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              <p className="mt-2 text-neutral-textLight">Loading your requisitions...</p>
            </div>
          ) : userCreatedRequisitions.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requisition #</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userCreatedRequisitions.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.requisitionNumber}</TableCell>
                      <TableCell>
                        {projects.find((p: Project) => p.id === req.projectId)?.name || `Project ${req.projectId}`}
                      </TableCell>
                      <TableCell>
                        {suppliers.find((s: Supplier) => s.id === req.supplierId)?.name || `Supplier ${req.supplierId}`}
                      </TableCell>
                      <TableCell>{formatDate(req.requestDate)}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(req.totalAmount.toString()))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproveRequisition(req.id)}
                            className="flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Process
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-md bg-white shadow">
              <p className="text-neutral-textLight">You have no pending requisitions to process.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Purchase Order Form */}
      <PurchaseOrderForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
      
      {/* Purchase Order Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={handleClosePreview}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Preview</DialogTitle>
          </DialogHeader>
          {isLoadingDetails ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              <p className="mt-2 text-neutral-textLight">Loading details...</p>
            </div>
          ) : orderDetails ? (
            <PurchaseOrderPreview 
              data={orderDetails} 
              onExportPdf={() => generatePdfMutation.mutate(orderDetails.id)}
              onEmail={isFinanceOrAdmin ? () => {
                toast({
                  title: "Sending email...",
                  description: "Emailing purchase order to supplier",
                });
                emailPurchaseOrderMutation.mutate(orderDetails.id);
              } : undefined}
            />
          ) : (
            <p className="text-neutral-textLight">Could not load purchase order details.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <RequisitionApprovalDialog 
        isOpen={showApprovalDialog} 
        onClose={handleCloseApprovalDialog} 
        requisitionId={requisitionToApprove} 
      />

      {/* Requisition Preview Dialog */}
      <Dialog open={isRequisitionPreviewOpen} onOpenChange={setIsRequisitionPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Requisition Details</DialogTitle>
          </DialogHeader>
          {selectedRequisition && (
            <RequisitionViewEdit 
              requisitionId={selectedRequisition} 
              onClose={handleCloseRequisitionPreview}
              allowEdit={isFinanceOrAdmin}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Purchase Order Edit Dialog */}
      <Dialog open={isPurchaseOrderEditOpen} onOpenChange={setIsPurchaseOrderEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
          </DialogHeader>
          {editPurchaseOrderId && (
            <PurchaseOrderEdit 
              purchaseOrderId={editPurchaseOrderId} 
              onClose={handleClosePurchaseOrderEdit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}