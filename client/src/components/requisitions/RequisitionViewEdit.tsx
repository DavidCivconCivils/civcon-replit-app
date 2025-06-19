import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Requisition, Project, Supplier, RequisitionItem, insertRequisitionSchema, insertRequisitionItemSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Edit2, Save, X, Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RequisitionViewEditProps {
  requisitionId: number;
  onClose: () => void;
  allowEdit?: boolean;
}

const requisitionEditSchema = insertRequisitionSchema.omit({ totalAmount: true }).extend({
  items: z.array(z.object({
    id: z.number().optional(),
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().int().positive("Quantity must be positive"),
    unit: z.string().min(1, "Unit is required"),
    unitPrice: z.coerce.number().positive("Unit price must be positive"),
  })).min(1, "At least one item is required")
});

type RequisitionEditValues = z.infer<typeof requisitionEditSchema>;

export default function RequisitionViewEdit({ requisitionId, onClose, allowEdit = false }: RequisitionViewEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Fetch requisition details
  const { data: requisition, isLoading } = useQuery<Requisition & {
    project: Project;
    supplier: Supplier;
    user: { firstName: string; lastName: string; email: string };
  }>({
    queryKey: ['/api/requisitions', requisitionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/requisitions/${requisitionId}`);
      return res.json();
    },
  });

  // Fetch requisition items
  const { data: items = [] } = useQuery<RequisitionItem[]>({
    queryKey: ['/api/requisitions', requisitionId, 'items'],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/requisitions/${requisitionId}/items`);
      return res.json();
    },
  });

  // Fetch projects and suppliers for editing
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: isEditing,
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
    enabled: isEditing,
  });

  const form = useForm<RequisitionEditValues>({
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

  // Update form when requisition data loads
  useEffect(() => {
    if (requisition && items.length > 0) {
      form.reset({
        projectId: requisition.projectId,
        supplierId: requisition.supplierId,
        requestDate: requisition.requestDate,
        deliveryDate: requisition.deliveryDate,
        deliveryAddress: requisition.deliveryAddress,
        deliveryInstructions: requisition.deliveryInstructions || "",
        items: items.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: parseFloat(item.unitPrice.toString())
        }))
      });
    }
  }, [requisition, items, form]);

  // Update requisition mutation
  const updateRequisitionMutation = useMutation({
    mutationFn: async (data: RequisitionEditValues) => {
      // Calculate total amount from items
      const totalAmount = data.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);
      
      const updateData = {
        ...data,
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
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update requisition",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (requisition && items.length > 0) {
      form.reset({
        projectId: requisition.projectId,
        supplierId: requisition.supplierId,
        requestDate: requisition.requestDate,
        deliveryDate: requisition.deliveryDate,
        deliveryAddress: requisition.deliveryAddress,
        deliveryInstructions: requisition.deliveryInstructions || "",
        totalAmount: requisition.totalAmount,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          vatType: item.vatType || "VAT 20%",
          vatAmount: item.vatAmount || "0.00"
        }))
      });
    }
  };

  const handleSave = async (data: RequisitionEditValues) => {
    updateRequisitionMutation.mutate(data);
  };

  const addItem = () => {
    const currentItems = form.getValues("items");
    form.setValue("items", [
      ...currentItems,
      {
        description: "",
        quantity: 1,
        unit: "Each",
        unitPrice: "0.00",
        totalPrice: "0.00",
        vatType: "VAT 20%",
        vatAmount: "0.00"
      }
    ]);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues("items");
    form.setValue("items", currentItems.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="text-center p-8">
        <p className="text-neutral-textLight">Requisition not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{requisition.requisitionNumber}</h2>
          <p className="text-neutral-textLight">
            Status: <span className={`font-medium ${requisition.status === 'pending' ? 'text-yellow-600' : requisition.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
              {requisition.status.charAt(0).toUpperCase() + requisition.status.slice(1)}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          {allowEdit && !isEditing && (
            <Button onClick={handleEdit} variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button onClick={handleCancel} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(handleSave)} disabled={updateRequisitionMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          )}
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>

      {isEditing ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            {/* Project and Supplier Selection */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name} ({project.contractNumber})
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
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier) => (
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
            </div>

            {/* Dates and Delivery */}
            <div className="grid grid-cols-2 gap-4">
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
                    <Input {...field} placeholder="Enter delivery address" />
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
                    <Textarea {...field} value={field.value || ""} placeholder="Enter delivery instructions" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Items */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Items</CardTitle>
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.watch("items").map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <Input {...field} placeholder="Item description" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                className="w-20"
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.unit`}
                            render={({ field }) => (
                              <Input {...field} className="w-20" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <Input {...field} className="w-24" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.totalPrice`}
                            render={({ field }) => (
                              <Input {...field} className="w-24" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </form>
        </Form>
      ) : (
        <div className="space-y-6">
          {/* Project and Supplier Info */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {requisition.project.name}</p>
                  <p><strong>Contract:</strong> {requisition.project.contractNumber}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Supplier Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {requisition.supplier.name}</p>
                  <p><strong>Address:</strong> {requisition.supplier.address}</p>
                  <p><strong>Email:</strong> {requisition.supplier.email}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Request Date:</strong> {formatDate(requisition.requestDate)}</p>
                  <p><strong>Delivery Date:</strong> {formatDate(requisition.deliveryDate)}</p>
                </div>
                <div>
                  <p><strong>Requested By:</strong> {requisition.user.firstName} {requisition.user.lastName}</p>
                  <p><strong>Email:</strong> {requisition.user.email}</p>
                </div>
              </div>
              <div className="mt-4">
                <p><strong>Delivery Address:</strong> {requisition.deliveryAddress}</p>
                {requisition.deliveryInstructions && (
                  <p><strong>Delivery Instructions:</strong> {requisition.deliveryInstructions}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>VAT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(item.unitPrice))}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(item.totalPrice))}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(item.vatAmount || "0"))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 text-right">
                <p className="text-lg font-bold">
                  Total: {formatCurrency(parseFloat(requisition.totalAmount))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}