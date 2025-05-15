import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PurchaseOrder } from "@shared/schema";
import PurchaseOrderForm from "@/components/orders/PurchaseOrderForm";
import PurchaseOrderPreview from "@/components/orders/PurchaseOrderPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Filter, Search, Eye, Printer, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Orders() {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch purchase orders
  const { data: purchaseOrders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
  });

  // Fetch order details for preview
  const { data: orderDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/purchase-orders', selectedOrder],
    enabled: selectedOrder !== null,
  });

  // Filter purchase orders
  const filteredOrders = purchaseOrders?.filter(order => {
    if (!searchTerm) return true;
    
    return (
      order.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }).sort((a, b) => {
    // Sort by date (newest first)
    return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
  });

  const handleOpenForm = () => {
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  const handlePreviewOrder = (id: number) => {
    setSelectedOrder(id);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setSelectedOrder(null);
  };

  // Handle print functionality
  const handlePrintOrder = () => {
    window.print();
  };

  const handleExportPdf = () => {
    // This would typically invoke a server endpoint to generate and download a PDF
    alert('PDF export functionality would be implemented here.');
  };

  const emailMutation = useMutation({
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

  const handleEmailOrder = () => {
    if (!selectedOrder) {
      toast({
        title: "Error",
        description: "Please select a purchase order first",
        variant: "destructive",
      });
      return;
    }
    
    emailMutation.mutate(selectedOrder);
  };

  const canCreatePurchaseOrder = user?.role === 'finance';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-text">Purchase Orders</h1>
        {canCreatePurchaseOrder && (
          <Button onClick={handleOpenForm}>Create Purchase Order</Button>
        )}
      </div>
      
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
        ) : filteredOrders && filteredOrders.length > 0 ? (
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
                          onClick={() => handlePreviewOrder(order.id)}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:text-primary-dark"
                          onClick={handlePrintOrder}
                        >
                          <Printer size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:text-primary-dark"
                          onClick={() => {
                            setSelectedOrder(order.id);
                            handleEmailOrder();
                          }}
                          disabled={emailMutation.isPending}
                        >
                          {emailMutation.isPending && selectedOrder === order.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                          ) : (
                            <Mail size={16} />
                          )}
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
            <h3 className="text-lg font-medium mb-2">No Purchase Orders Found</h3>
            <p className="text-neutral-textLight mb-4">
              {searchTerm
                ? "Try adjusting your search terms."
                : canCreatePurchaseOrder
                  ? "Create a purchase order for an approved requisition."
                  : "No purchase orders have been created yet."}
            </p>
            {canCreatePurchaseOrder && (
              <Button onClick={handleOpenForm}>Create Purchase Order</Button>
            )}
          </div>
        )}
      </div>
      
      {/* Purchase Order Form Dialog */}
      <PurchaseOrderForm isOpen={isFormOpen} onClose={handleCloseForm} />
      
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
              onPrint={handlePrintOrder}
              onExportPdf={handleExportPdf}
              onEmail={handleEmailOrder}
            />
          ) : (
            <p className="text-neutral-textLight">Could not load purchase order details.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
