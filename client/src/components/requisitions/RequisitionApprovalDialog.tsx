import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
  const { toast } = useToast();

  const approvalMutation = useMutation({
    mutationFn: async () => {
      if (!requisitionId) return;
      const res = await apiRequest("PUT", `/api/requisitions/${requisitionId}/status`, {
        status: "approved",
        poNumber
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Requisition approved",
        description: "The requisition has been approved and a purchase order has been created."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      onClose();
      setPoNumber("");
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message || "There was an error approving the requisition.",
        variant: "destructive"
      });
    }
  });

  const rejectionMutation = useMutation({
    mutationFn: async () => {
      if (!requisitionId) return;
      const res = await apiRequest("PUT", `/api/requisitions/${requisitionId}/status`, {
        status: "rejected"
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Requisition rejected",
        description: "The requisition has been rejected."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requisitions'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection failed",
        description: error.message || "There was an error rejecting the requisition.",
        variant: "destructive"
      });
    }
  });

  const handleApprove = () => {
    if (!poNumber.trim()) {
      toast({
        title: "Purchase Order Required",
        description: "Please enter a Purchase Order number before approving.",
        variant: "destructive"
      });
      return;
    }
    approvalMutation.mutate();
  };

  const handleReject = () => {
    rejectionMutation.mutate();
  };

  const isPending = approvalMutation.isPending || rejectionMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Requisition Approval</DialogTitle>
          <DialogDescription>
            Review this requisition and decide whether to approve or reject it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="poNumber">Purchase Order Number</Label>
            <Input
              id="poNumber"
              placeholder="Enter PO number (required for approval)"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              disabled={isPending}
            />
            <p className="text-sm text-muted-foreground">
              The purchase order number is required when approving a requisition.
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex space-x-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReject}
            disabled={isPending}
          >
            {rejectionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rejecting...
              </>
            ) : "Reject"}
          </Button>
          <Button 
            onClick={handleApprove}
            disabled={isPending || !poNumber.trim()}
          >
            {approvalMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}