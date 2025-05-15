import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
    mutationFn: async (requisitionId: number) => {
      const response = await apiRequest(
        "PUT",
        `/api/requisitions/${requisitionId}/status`,
        {
          status: "rejected"
        }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Requisition rejected",
        description: "The requisition has been rejected.",
        variant: "success",
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

  const handleReject = () => {
    if (!requisitionId) return;
    rejectMutation.mutate(requisitionId);
  };

  const handleClose = () => {
    setPoNumber("");
    onClose();
  };

  const isLoading = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Requisition</DialogTitle>
          <DialogDescription>
            Enter a purchase order number to approve this requisition or reject it.
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
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={isLoading}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Reject
            </Button>
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
    </Dialog>
  );
}