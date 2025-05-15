import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Requisition } from "@shared/schema";

interface RequisitionApprovalDialogProps {
  requisitionId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RequisitionApprovalDialog({
  requisitionId,
  isOpen,
  onClose
}: RequisitionApprovalDialogProps) {
  const [poNumber, setPoNumber] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if user is finance or admin
  const isFinanceOrAdmin = user?.role === 'admin' || user?.role === 'finance';
  
  // Fetch requisition data to check if current user is the requester
  const { data: requisition } = useQuery<Requisition>({
    queryKey: ['/api/requisitions', requisitionId],
    queryFn: async () => {
      if (!requisitionId) return null;
      const response = await fetch(`/api/requisitions/${requisitionId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch requisition: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: requisitionId !== null && isOpen,
  });
  
  // Determine if current user is the requester
  const isRequester = user && requisition ? requisition.requestedById === user.id : false;
  
  // Set dialog title based on user role
  const dialogTitle = isFinanceOrAdmin 
    ? "Process Requisition as Finance/Admin" 
    : "Process Your Requisition";
  
  const approveMutation = useMutation({
    mutationFn: async ({ requisitionId, poNumber }: { requisitionId: number, poNumber: string }) => {
      const response = await apiRequest(
        "PUT",
        `/api/requisitions/${requisitionId}/status`,
        {
          status: "approved",
          poNumber
        }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Requisition approved",
        description: "Purchase order has been created successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requisitionId, reason }: { requisitionId: number, reason: string }) => {
      const response = await apiRequest(
        "PUT",
        `/api/requisitions/${requisitionId}/status`,
        {
          status: "rejected",
          rejectionReason: reason
        }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Requisition rejected",
        description: "The requisition has been rejected with a reason.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requisitions'] });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (!requisitionId) return;
    
    if (!poNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a purchase order number",
        variant: "destructive",
      });
      return;
    }

    approveMutation.mutate({ requisitionId, poNumber });
  };

  const handleShowRejectForm = () => {
    setShowRejectionForm(true);
  };

  const handleReject = () => {
    if (!requisitionId) return;
    
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }
    
    rejectMutation.mutate({ requisitionId, reason: rejectionReason });
  };

  const handleClose = () => {
    setPoNumber("");
    setRejectionReason("");
    setShowRejectionForm(false);
    onClose();
  };

  const isLoading = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {showRejectionForm ? (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Requisition</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this requisition. This will be visible to the requester.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={isLoading}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowRejectionForm(false)}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button 
              onClick={handleReject}
              disabled={isLoading}
              variant="destructive"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {isRequester
                ? "As the requisition creator, you can process this requisition. Enter a purchase order number to approve it."
                : "Enter a purchase order number to approve this requisition or reject it with a reason."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="poNumber">Purchase Order Number</Label>
              <Input
                id="poNumber"
                placeholder="Enter PO number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {/* Only finance/admin can reject requisitions */}
              {isFinanceOrAdmin && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleShowRejectForm}
                  disabled={isLoading}
                >
                  Reject
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={isLoading}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Approve
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}