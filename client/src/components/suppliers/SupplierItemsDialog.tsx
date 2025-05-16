import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Supplier, InsertSupplierItem, SupplierItem } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Edit, Trash2, Plus } from "lucide-react";

const itemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  unitPrice: z.coerce.number().min(0.01, "Price must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  vatType: z.string().default("VAT 20%"),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface SupplierItemsDialogProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SupplierItemsDialog({
  supplier,
  isOpen,
  onClose
}: SupplierItemsDialogProps) {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<SupplierItem | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Form setup
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      itemName: "",
      description: "",
      unitPrice: 0,
      unit: "",
      vatType: "VAT 20%"
    }
  });

  // Fetch supplier items
  const { data: items = [], isLoading, refetch } = useQuery<SupplierItem[]>({
    queryKey: ['/api/suppliers', supplier?.id, 'items'],
    queryFn: async () => {
      if (!supplier?.id) return [];
      const response = await fetch(`/api/suppliers/${supplier.id}/items`);
      if (!response.ok) {
        throw new Error("Failed to fetch supplier items");
      }
      return response.json();
    },
    enabled: isOpen && !!supplier?.id,
  });

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: ItemFormValues) => {
      if (!supplier?.id) throw new Error("Supplier ID is required");
      const response = await apiRequest(
        "POST",
        `/api/suppliers/${supplier.id}/items`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item added successfully",
      });
      form.reset();
      setIsFormVisible(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item",
        variant: "destructive"
      });
    }
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (data: SupplierItem) => {
      const response = await apiRequest(
        "PUT",
        `/api/supplier-items/${data.id}`,
        {
          ...data,
          unitPrice: data.unitPrice.toString() // Ensure unitPrice is sent as string
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      form.reset();
      setEditingItem(null);
      setIsFormVisible(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive"
      });
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/supplier-items/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (values: ItemFormValues) => {
    if (editingItem) {
      updateItemMutation.mutate({
        ...editingItem,
        ...values,
        unitPrice: values.unitPrice.toString() // Convert to string for API
      });
    } else {
      createItemMutation.mutate({
        ...values,
        unitPrice: values.unitPrice.toString() // Convert to string for API
      });
    }
  };

  const handleEdit = (item: SupplierItem) => {
    setEditingItem(item);
    form.reset({
      itemName: item.itemName,
      description: item.description || "",
      unitPrice: parseFloat(item.unitPrice.toString()),
      unit: item.unit,
      vatType: item.vatType
    });
    setIsFormVisible(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteItemMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    form.reset();
    setEditingItem(null);
    setIsFormVisible(false);
  };

  const handleAddNew = () => {
    form.reset({
      itemName: "",
      description: "",
      unitPrice: 0,
      unit: "",
      vatType: "VAT 20%"
    });
    setEditingItem(null);
    setIsFormVisible(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Items for {supplier?.name}</DialogTitle>
        </DialogHeader>
        
        {isFormVisible ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="itemName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="each, kg, meter, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="vatType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select VAT type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="VAT 20%">VAT 20%</SelectItem>
                        <SelectItem value="VAT 0%">VAT 0%</SelectItem>
                        <SelectItem value="20% RC CIS (0%)">20% RC CIS (0%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? "Update Item" : "Add Item"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {items.length} {items.length === 1 ? "Item" : "Items"}
              </h3>
              <Button onClick={handleAddNew} className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Add New Item
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              </div>
            ) : items.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>VAT Type</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.description || "—"}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(item.unitPrice.toString()))}</TableCell>
                        <TableCell>{item.vatType}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-8 border rounded-md">
                <p className="text-neutral-textLight mb-4">No items found for this supplier.</p>
                <Button onClick={handleAddNew}>Add First Item</Button>
              </div>
            )}
          </>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}