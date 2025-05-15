import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertPurchaseOrderSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import PurchaseOrderPreview from "./PurchaseOrderPreview";

const formSchema = insertPurchaseOrderSchema;
type FormValues = z.infer<typeof formSchema>;

interface PurchaseOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PurchaseOrderForm({ isOpen, onClose }: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [previewMode, setPreviewMode] = useState(false);

  // Fetch pending requisitions (only the ones that are approved but don't have POs yet)
  const { data: requisitions, isLoading } = useQuery({
    queryKey: ['/api/requisitions'],
    select: (data) => data.filter((req: any) => req.status === 'pending'),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requisitionId: undefined,
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      status: "issued",
      totalAmount: "0",
    },
  });

  // Fetch requisition details when selected
  const requisitionId = form.watch("requisitionId");
  const { data: requisitionDetails } = useQuery({
    queryKey: ['/api/requisitions', requisitionId],
    enabled: !!requisitionId,
    onSuccess: (data) => {
      // Update form total amount
      if (data) {
        form.setValue("totalAmount", data.totalAmount);
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/purchase-orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requisitions"] });
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  if (!user || user.role !== 'finance') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permission Denied</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Only finance team members can create purchase orders.</p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>
        
        {previewMode && requisitionDetails ? (
          <>
            <PurchaseOrderPreview 
              data={{
                poNumber: 'PO-XXXX-XXXXX', // Will be generated on server
                purchaseOrder: {
                  issueDate: form.getValues("issueDate"),
                  status: form.getValues("status"),
                  totalAmount: form.getValues("totalAmount"),
                },
                requisition: requisitionDetails,
                items: requisitionDetails.items || [],
                project: requisitionDetails.project,
                supplier: requisitionDetails.supplier,
                user,
              }}
            />
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setPreviewMode(false)}>
                Back to Edit
              </Button>
              <Button onClick={() => form.handleSubmit(onSubmit)()}>
                {createMutation.isPending ? "Creating..." : "Issue Purchase Order"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="requisitionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Requisition</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a requisition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoading ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : requisitions && requisitions.length > 0 ? (
                          requisitions.map((req: any) => (
                            <SelectItem key={req.id} value={req.id.toString()}>
                              {req.requisitionNumber} - ${parseFloat(req.totalAmount).toFixed(2)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No pending requisitions</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="issued">Issued</SelectItem>
                        <SelectItem value="in progress">In Progress</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {requisitionDetails && (
                <div className="border rounded-md p-4 bg-neutral/20">
                  <h4 className="font-medium mb-2">Requisition Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-neutral-textLight">Requisition Number:</span>
                      <p>{requisitionDetails.requisitionNumber}</p>
                    </div>
                    <div>
                      <span className="text-neutral-textLight">Requested By:</span>
                      <p>{requisitionDetails.requestedById}</p>
                    </div>
                    <div>
                      <span className="text-neutral-textLight">Supplier:</span>
                      <p>{requisitionDetails.supplier?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="text-neutral-textLight">Total Amount:</span>
                      <p className="font-medium">${parseFloat(requisitionDetails.totalAmount).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  disabled={!form.formState.isValid || !requisitionId} 
                  onClick={() => setPreviewMode(true)}
                >
                  Preview
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
