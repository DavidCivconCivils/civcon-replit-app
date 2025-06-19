import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PurchaseOrder, Project, Supplier, User, RequisitionItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, X } from "lucide-react";

const purchaseOrderEditSchema = z.object({
  poNumber: z.string().min(1, "PO number is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  status: z.enum(["draft", "issued", "received", "cancelled"]),
  totalAmount: z.string().min(1, "Total amount is required"),
});

type PurchaseOrderEditFormValues = z.infer<typeof purchaseOrderEditSchema>;

interface PurchaseOrderEditProps {
  purchaseOrderId: number;
  onClose: () => void;
}

export default function PurchaseOrderEdit({ purchaseOrderId, onClose }: PurchaseOrderEditProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch purchase order details
  const { data: orderData, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['/api/purchase-orders', purchaseOrderId],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-orders/${purchaseOrderId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch purchase order');
      }
      return response.json();
    },
  });

  // Fetch supporting data
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const form = useForm<PurchaseOrderEditFormValues>({
    resolver: zodResolver(purchaseOrderEditSchema),
    defaultValues: {
      poNumber: "",
      issueDate: "",
      status: "draft",
      totalAmount: "",
    },
  });

  // Populate form with purchase order data
  useEffect(() => {
    if (orderData) {
      form.reset({
        poNumber: orderData.poNumber || "",
        issueDate: orderData.issueDate ? orderData.issueDate.split('T')[0] : "",
        status: orderData.status || "draft",
        totalAmount: orderData.totalAmount?.toString() || "",
      });
    }
  }, [orderData, form]);

  // Update purchase order mutation
  const updatePurchaseOrderMutation = useMutation({
    mutationFn: async (data: PurchaseOrderEditFormValues) => {
      return apiRequest(`/api/purchase-orders/${purchaseOrderId}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders', purchaseOrderId] });
      toast({
        title: "Success",
        description: "Purchase order updated successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update purchase order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PurchaseOrderEditFormValues) => {
    updatePurchaseOrderMutation.mutate(data);
  };

  if (isLoadingOrder) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
        <p className="mt-2 text-neutral-textLight">Loading purchase order...</p>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="p-8 text-center">
        <p className="text-neutral-textLight">Purchase order not found</p>
      </div>
    );
  }

  const project = orderData.project;
  const supplier = orderData.supplier;
  const requisition = orderData.requisition;
  const items = orderData.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Edit Purchase Order</h2>
          <p className="text-neutral-textLight">
            Editing PO #{orderData.poNumber} for Requisition #{requisition?.requisitionNumber}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="poNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PO Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter PO number" />
                      </FormControl>
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
                        <Input {...field} type="date" />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="issued">Issued</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={updatePurchaseOrderMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {updatePurchaseOrderMutation.isPending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Related Information */}
        <div className="space-y-6">
          {/* Project Information */}
          {project && (
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">Project Name</Label>
                  <p className="text-sm text-neutral-textLight">{project.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Contract Number</Label>
                  <p className="text-sm text-neutral-textLight">{project.contractNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-neutral-textLight capitalize">{project.status}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Supplier Information */}
          {supplier && (
            <Card>
              <CardHeader>
                <CardTitle>Supplier Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-neutral-textLight">{supplier.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="text-sm text-neutral-textLight">{supplier.address}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-neutral-textLight">{supplier.email}</p>
                </div>
                {supplier.phone && (
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-neutral-textLight">{supplier.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Requisition Items */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items from Requisition #{requisition?.requisitionNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, index: number) => {
                  const unitPrice = parseFloat(item.unitPrice?.toString() || '0');
                  const quantity = parseInt(item.quantity?.toString() || '0');
                  const total = unitPrice * quantity;
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{formatCurrency(unitPrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delivery Information */}
      {requisition && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label className="text-sm font-medium">Delivery Date</Label>
              <p className="text-sm text-neutral-textLight">
                {formatDate(requisition.deliveryDate)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Delivery Address</Label>
              <p className="text-sm text-neutral-textLight">{requisition.deliveryAddress}</p>
            </div>
            {requisition.deliveryInstructions && (
              <div>
                <Label className="text-sm font-medium">Delivery Instructions</Label>
                <p className="text-sm text-neutral-textLight">{requisition.deliveryInstructions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}