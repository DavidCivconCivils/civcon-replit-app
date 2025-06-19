import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, Trash2, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RequisitionEditProps {
  requisitionId: number;
  onClose: () => void;
}

const requisitionEditSchema = z.object({
  projectId: z.coerce.number().min(1, "Project is required"),
  supplierId: z.coerce.number().min(1, "Supplier is required"),
  requestDate: z.string().min(1, "Request date is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
  deliveryInstructions: z.string().optional(),
  items: z.array(z.object({
    id: z.number().optional(),
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().int().positive("Quantity must be positive"),
    unit: z.string().min(1, "Unit is required"), 
    unitPrice: z.coerce.number().positive("Unit price must be positive"),
  })).min(1, "At least one item is required")
});

type RequisitionEditFormValues = z.infer<typeof requisitionEditSchema>;

export default function RequisitionEdit({ requisitionId, onClose }: RequisitionEditProps) {
  const { toast } = useToast();

  // Fetch requisition data
  const { data: requisitionData, isLoading } = useQuery({
    queryKey: ['/api/requisitions', requisitionId],
    queryFn: async () => {
      const res = await fetch(`/api/requisitions/${requisitionId}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch requisition');
      return res.json();
    }
  });

  // Fetch projects and suppliers
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects']
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/suppliers']
  });

  const form = useForm<RequisitionEditFormValues>({
    resolver: zodResolver(requisitionEditSchema),
    defaultValues: {
      projectId: 0,
      supplierId: 0,
      requestDate: "",
      deliveryDate: "",
      deliveryAddress: "",
      deliveryInstructions: "",
      items: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Populate form with requisition data
  useEffect(() => {
    if (requisitionData) {
      const data = requisitionData as any;
      form.reset({
        projectId: data.projectId || 0,
        supplierId: data.supplierId || 0,
        requestDate: data.requestDate ? data.requestDate.split('T')[0] : "",
        deliveryDate: data.deliveryDate ? data.deliveryDate.split('T')[0] : "",
        deliveryAddress: data.deliveryAddress || "",
        deliveryInstructions: data.deliveryInstructions || "",
        items: (data.items || []).map((item: any) => ({
          id: item.id,
          description: item.description || "",
          quantity: parseInt(item.quantity?.toString() || "0"),
          unit: item.unit || "",
          unitPrice: parseFloat(item.unitPrice?.toString() || "0"),
        })),
      });
    }
  }, [requisitionData, form]);

  // Update requisition mutation
  const updateRequisitionMutation = useMutation({
    mutationFn: async (data: RequisitionEditFormValues) => {
      // Calculate total amount from items
      const totalAmount = data.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);
      
      const updateData = {
        projectId: data.projectId,
        supplierId: data.supplierId,
        requestDate: data.requestDate,
        deliveryDate: data.deliveryDate,
        deliveryAddress: data.deliveryAddress,
        deliveryInstructions: data.deliveryInstructions,
        totalAmount: totalAmount.toFixed(2),
        items: data.items.map(item => ({
          ...item,
          unitPrice: item.unitPrice.toString(),
          totalPrice: (item.quantity * item.unitPrice).toFixed(2),
        })),
      };
      
      return apiRequest(`/api/requisitions/${requisitionId}`, 'PUT', updateData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Requisition updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/requisitions', requisitionId] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update requisition",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RequisitionEditFormValues) => {
    updateRequisitionMutation.mutate(data);
  };

  const addItem = () => {
    append({
      description: "",
      quantity: 1,
      unit: "",
      unitPrice: 0,
    });
  };

  // Calculate total amount from current items
  const watchedItems = form.watch("items");
  const totalAmount = watchedItems?.reduce((sum, item) => {
    const quantity = typeof item?.quantity === 'number' ? item.quantity : 0;
    const unitPrice = typeof item?.unitPrice === 'number' ? item.unitPrice : 0;
    return sum + (quantity * unitPrice);
  }, 0) || 0;

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-neutral-textLight">Loading requisition...</p>
      </div>
    );
  }

  if (!requisitionData) {
    return (
      <div className="p-8 text-center">
        <p className="text-neutral-textLight">Requisition not found</p>
      </div>
    );
  }

  const data = requisitionData as any;
  const project = data?.project;
  const supplier = data?.supplier;
  const requisition = data?.requisition;

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Edit Requisition</h2>
            <p className="text-neutral-textLight">
              Editing Requisition #{data?.requisitionNumber || 'Unknown'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(projects as any[]).map((project: any) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(suppliers as any[]).map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requestDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Address</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deliveryInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Instructions</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Items</CardTitle>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-8 text-neutral-textLight">
                No items added yet. Click "Add Item" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24">Quantity</TableHead>
                      <TableHead className="w-24">Unit</TableHead>
                      <TableHead className="w-32">Unit Price</TableHead>
                      <TableHead className="w-32">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const quantity = form.watch(`items.${index}.quantity`) || 0;
                      const unitPrice = form.watch(`items.${index}.unitPrice`) || 0;
                      const itemTotal = quantity * unitPrice;

                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input {...field} placeholder="Item description" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      step="1"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unit`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input {...field} placeholder="Unit" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(itemTotal)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Total Amount */}
                <div className="flex justify-end">
                  <div className="bg-neutral-backgroundSecondary p-4 rounded-lg">
                    <div className="text-sm text-neutral-textLight">Total Amount</div>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateRequisitionMutation.isPending}
          >
            {updateRequisitionMutation.isPending ? "Updating..." : "Update Requisition"}
          </Button>
        </div>
      </div>
    </Form>
  );
}