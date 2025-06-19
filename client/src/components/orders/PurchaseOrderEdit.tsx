import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, X, Plus, Trash2 } from "lucide-react";
import type { Project, Supplier } from "@shared/schema";

const purchaseOrderEditSchema = z.object({
  poNumber: z.string().min(1, "PO number is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  status: z.enum(["draft", "issued", "received", "cancelled"]),
  items: z.array(z.object({
    id: z.number().optional(),
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().int().positive("Quantity must be positive"),
    unit: z.string().min(1, "Unit is required"),
    unitPrice: z.coerce.number().positive("Unit price must be positive"),
  })).min(1, "At least one item is required"),
});

type PurchaseOrderEditFormValues = z.infer<typeof purchaseOrderEditSchema>;

interface PurchaseOrderEditProps {
  purchaseOrderId: number;
  onClose: () => void;
}

export default function PurchaseOrderEdit({ purchaseOrderId, onClose }: PurchaseOrderEditProps) {
  const { toast } = useToast();

  // Fetch purchase order details
  const { data: orderData, isLoading } = useQuery({
    queryKey: ['/api/purchase-orders', purchaseOrderId],
  });

  // Fetch reference data
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
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Populate form with purchase order data
  useEffect(() => {
    if (orderData && orderData.items) {
      form.reset({
        poNumber: orderData.poNumber || "",
        issueDate: orderData.issueDate ? orderData.issueDate.split('T')[0] : "",
        status: orderData.status || "draft",
        items: orderData.items.map((item: any) => ({
          id: item.id,
          description: item.description || "",
          quantity: parseInt(item.quantity?.toString() || "0"),
          unit: item.unit || "",
          unitPrice: parseFloat(item.unitPrice?.toString() || "0"),
        })),
      });
    }
  }, [orderData, form]);

  // Update purchase order mutation
  const updatePurchaseOrderMutation = useMutation({
    mutationFn: async (data: PurchaseOrderEditFormValues) => {
      // Calculate total amount from items
      const totalAmount = data.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);
      
      const updateData = {
        poNumber: data.poNumber,
        issueDate: data.issueDate,
        status: data.status,
        totalAmount: totalAmount.toFixed(2),
        items: data.items.map(item => ({
          ...item,
          unitPrice: item.unitPrice.toString(),
          totalPrice: (item.quantity * item.unitPrice).toFixed(2),
        })),
      };
      
      return apiRequest(`/api/purchase-orders/${purchaseOrderId}`, 'PUT', updateData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders', purchaseOrderId] });
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

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-neutral-textLight">Loading purchase order...</p>
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

  return (
    <Form {...form}>
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Order Details */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {/* Calculated Total Display */}
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium">Calculated Total</Label>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(
                      form.watch("items")?.reduce((sum, item) => {
                        return sum + ((item?.quantity || 0) * (item?.unitPrice || 0));
                      }, 0) || 0
                    )}
                  </p>
                </div>
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
                      <Label className="text-sm font-medium">Supplier Name</Label>
                      <p className="text-sm text-neutral-textLight">{supplier.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Contact Person</Label>
                      <p className="text-sm text-neutral-textLight">{supplier.contactPerson}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-neutral-textLight">{supplier.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p className="text-sm text-neutral-textLight">{supplier.phone}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Editable Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Edit Items
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: "", quantity: 1, unit: "", unitPrice: 0 })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-textLight">No items added yet. Click "Add Item" to start.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Item description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" min="1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., each, kg, m" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Price</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" step="0.01" min="0" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Form Actions */}
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
      </div>
    </Form>
  );
}