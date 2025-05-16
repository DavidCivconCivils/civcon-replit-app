import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertRequisitionSchema, insertRequisitionItemSchema, insertSupplierItemSchema, SupplierItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, ArrowLeft, ArrowRight, Send, PlusCircle } from "lucide-react";
import RequisitionPreview from "./RequisitionPreview";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

// Combine the schemas for form validation
const requisitionItemSchema = insertRequisitionItemSchema.extend({
  id: z.number().optional(),
  // Make sure quantity is always parsed as a number
  quantity: z.coerce.number().int().positive("Quantity must be a positive number"),
});

const formSchema = insertRequisitionSchema.extend({
  items: z.array(requisitionItemSchema).min(1, "At least one item is required"),
  terms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions",
  }),
});

// Schema for adding new supplier items
const addItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  unit: z.string().min(1, "Unit is required"),
  unitPrice: z.string().min(1, "Price is required"),
});

type FormValues = z.infer<typeof formSchema>;
type AddItemFormValues = z.infer<typeof addItemSchema>;

interface RequisitionFormProps {
  onSuccess?: () => void;
}

export default function RequisitionForm({ onSuccess }: RequisitionFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("basic-info");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [supplierItems, setSupplierItems] = useState<SupplierItem[]>([]);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [currentInputValue, setCurrentInputValue] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const [itemToAdd, setItemToAdd] = useState<{
    index: number;
    description: string;
    unit: string;
    unitPrice: string;
  } | null>(null);

  // Fetch projects and suppliers
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/suppliers'],
  });

  // Initialize form with user ID already set
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: undefined,
      supplierId: undefined,
      requestDate: new Date().toISOString().split('T')[0],
      // Set a default delivery date to 7 days from now
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      deliveryAddress: "",
      deliveryInstructions: "",
      totalAmount: "0",
      requestedById: user?.id,
      items: [
        {
          description: "",
          quantity: 1,
          unit: "Each",
          unitPrice: "0",
          totalPrice: "0",
          vatType: "VAT 20%",
          vatAmount: "0",
        },
      ],
      terms: false,
    },
  });

  // Get the watched supplier ID
  const watchedSupplierId = form.watch("supplierId");
  
  // Fetch supplier items for the selected supplier
  const { data: fetchedSupplierItems = [] } = useQuery({
    queryKey: ['/api/suppliers', watchedSupplierId, 'items'],
    queryFn: async () => {
      if (!watchedSupplierId) return [];
      const response = await fetch(`/api/suppliers/${watchedSupplierId}/items`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!watchedSupplierId,
  });
  
  // Update the local supplier items state when the fetched items change
  useEffect(() => {
    setSupplierItems(fetchedSupplierItems);
  }, [fetchedSupplierItems]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch form fields to update in real-time
  const watchedItems = form.watch("items");
  const watchedAllFields = form.watch(); // Watch all fields for live preview updates
  const watchedProjectId = form.watch("projectId"); // Watch project ID for delivery address updates
  
  // This function will be called directly when quantity or price changes
  const calculateTotals = () => {
    setTimeout(() => {
      const items = form.getValues("items");
      
      // Calculate totals for each line
      items.forEach((item, index) => {
        const quantity = parseFloat(item.quantity.toString());
        const unitPrice = parseFloat(item.unitPrice);
        const totalPrice = quantity * unitPrice;
        
        // Calculate VAT based on the selected type
        let vatAmount = 0;
        if (item.vatType === "VAT 20%") {
          vatAmount = totalPrice * 0.2;
        } else if (item.vatType === "20% RC CIS (0%)") {
          // For RC CIS, we show the VAT amount in the display but it nets to zero
          vatAmount = 0; // Net effect is zero
        }
        
        // Update the fields in the form
        form.setValue(`items.${index}.totalPrice`, totalPrice.toFixed(2));
        form.setValue(`items.${index}.vatAmount`, vatAmount.toFixed(2));
      });
      
      // Calculate grand total
      const grandTotal = items.reduce((sum, item) => {
        return sum + parseFloat(item.totalPrice);
      }, 0);
      
      form.setValue("totalAmount", grandTotal.toFixed(2));
    }, 0);
  };

  // Add a default new item
  const addItem = () => {
    append({
      description: "",
      quantity: 1,
      unit: "Each",
      unitPrice: "0",
      totalPrice: "0",
      vatType: "VAT 20%",
      vatAmount: "0",
    });
    
    // Move to items tab if we're not already on it
    if (activeTab !== "items-info") {
      setActiveTab("items-info");
    }
  };

  // Move to the next tab
  const goToNextTab = () => {
    if (activeTab === "basic-info") {
      setActiveTab("items-info");
    } else if (activeTab === "items-info") {
      setActiveTab("delivery-info");
    }
  };

  // Move to the previous tab
  const goToPrevTab = () => {
    if (activeTab === "delivery-info") {
      setActiveTab("items-info");
    } else if (activeTab === "items-info") {
      setActiveTab("basic-info");
    }
  };

  // Form submission handler
  const createRequisition = async (values: FormValues) => {
    const project = projects.find(p => p.id === values.projectId);
    const supplier = suppliers.find(s => s.id === values.supplierId);
    
    // Preview the requisition in the modal
    return await apiRequest("POST", "/api/requisitions", {
      ...values,
      status: "Pending",
      project,
      supplier,
      user: user,
    });
  };

  // Mutation for creating requisitions
  const mutation = useMutation({
    mutationFn: createRequisition,
    onSuccess: () => {
      toast({
        title: "Requisition Created",
        description: "Your requisition has been successfully submitted for approval.",
      });
      
      // Reset form and preview
      form.reset();
      setPreviewVisible(false);
      
      // Call success callback if provided
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to create requisition. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  // Form validation steps before navigating tabs
  const validateAndGoToNextTab = async () => {
    if (activeTab === "basic-info") {
      const result = await form.trigger(["projectId", "supplierId", "requestDate"]);
      if (result) {
        goToNextTab();
      }
    } else if (activeTab === "items-info") {
      const result = await form.trigger("items");
      if (result) {
        goToNextTab();
      }
    }
  };

  // Update delivery address based on selected project
  useEffect(() => {
    if (watchedProjectId) {
      const selectedProject = projects.find(project => project.id === watchedProjectId);
      if (selectedProject) {
        form.setValue("deliveryAddress", selectedProject.address || "");
      }
    }
  }, [watchedProjectId, projects, form]);

  // Add new supplier item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: AddItemFormValues & { supplierId: number }) => {
      return await apiRequest("POST", `/api/suppliers/${data.supplierId}/items`, data);
    },
    onSuccess: (newItem) => {
      toast({
        title: "Item Added",
        description: "The item has been added to the supplier catalog.",
      });
      
      // Add the new item to the local state
      setSupplierItems(prevItems => [...prevItems, newItem]);
      
      // Close the dialog
      setShowAddItemDialog(false);
      setItemToAdd(null);
      
      // Refresh supplier items
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers', watchedSupplierId, 'items'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Item",
        description: error.message || "Failed to add item to the supplier catalog.",
        variant: "destructive",
      });
    },
  });

  // Handle adding an item to the supplier catalog
  const handleAddItemToSupplier = () => {
    if (!itemToAdd || !watchedSupplierId) return;
    
    // Check if an item with the same description already exists
    const existingItem = supplierItems.find(item => 
      item.itemName.toLowerCase() === itemToAdd.description.toLowerCase()
    );
    
    if (existingItem) {
      toast({
        title: "Item Already Exists",
        description: "An item with the same name already exists in this supplier's catalog.",
        variant: "destructive",
      });
      return;
    }
    
    addItemMutation.mutate({
      supplierId: watchedSupplierId,
      itemName: itemToAdd.description,
      description: itemToAdd.description,
      unit: itemToAdd.unit,
      unitPrice: itemToAdd.unitPrice,
      vatType: 'VAT 20%'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-text">Create Purchase Requisition</h2>
        <Button 
          variant="outline" 
          onClick={() => setPreviewVisible(true)}
        >
          Preview Requisition
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 bg-neutral-secondary border">
              <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
              <TabsTrigger value="items-info">Items & Delivery</TabsTrigger>
              <TabsTrigger value="delivery-info">Review & Submit</TabsTrigger>
            </TabsList>
            
            {/* Basic Info Tab */}
            <TabsContent value="basic-info" className="space-y-4">
              <h3 className="text-lg font-medium text-neutral-text">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project <span className="text-red-500">*</span></FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name} - {project.contractNumber}
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
                      <FormLabel>Supplier <span className="text-red-500">*</span></FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a supplier" />
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
                
                <FormField
                  control={form.control}
                  name="requestDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Date <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="requestedById"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requested By</FormLabel>
                      <FormControl>
                        <Input 
                          value={user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || ''}
                          disabled 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end mt-6">
                <Button 
                  type="button" 
                  onClick={validateAndGoToNextTab}
                >
                  Continue to Items
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            
            {/* Items & Delivery Tab */}
            <TabsContent value="items-info" className="space-y-4">
              <h3 className="text-lg font-medium text-neutral-text">Items & Delivery Information</h3>
              
              {/* Items Table */}
              <div className="mt-4">
                <h4 className="text-md font-medium text-neutral-text mb-2">Requisition Items</h4>
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full divide-y divide-neutral-secondary">
                    <thead className="bg-neutral-secondary">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider w-12">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">Unit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">VAT</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-neutral-textLight tracking-wider w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-secondary">
                      {fields.map((field, index) => (
                        <tr key={field.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">{index + 1}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <Popover 
                                  open={open} 
                                  onOpenChange={(isOpen) => {
                                    setOpen(isOpen);
                                    if (!isOpen) {
                                      // Reset the input value when closing
                                      setCurrentInputValue("");
                                    }
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={open}
                                      className="w-full justify-between border-0 p-0 focus:ring-0 text-sm text-neutral-text"
                                      onClick={() => setOpen(!open)}
                                    >
                                      {field.value || "Select or type item..."}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                      <CommandInput 
                                        placeholder="Search items or enter new item..." 
                                        className="h-9"
                                        onValueChange={(value) => {
                                          // Store the current input value to use in CommandEmpty
                                          setCurrentInputValue(value);
                                        }}
                                      />
                                      <CommandEmpty>
                                        <CommandItem
                                          value={currentInputValue}
                                          onSelect={() => {
                                            field.onChange(currentInputValue);
                                            // This is a custom item, so we don't auto-populate anything
                                            setOpen(false);
                                          }}
                                        >
                                          + Add new item: {currentInputValue}
                                        </CommandItem>
                                      </CommandEmpty>
                                      <CommandGroup heading="From Supplier Catalog">
                                        {supplierItems.map((item) => (
                                          <CommandItem
                                            key={item.id}
                                            value={item.itemName}
                                            onSelect={() => {
                                              field.onChange(item.itemName);
                                              // Also set the unit price and unit if from catalog
                                              // Update unit price for this item
                                              form.setValue(`items.${index}.unitPrice`, item.unitPrice.toString(), {
                                                shouldValidate: true,
                                              });
                                              // Update unit for this item
                                              form.setValue(`items.${index}.unit`, item.unit, {
                                                shouldValidate: true,
                                              });
                                              // Update VAT type
                                              form.setValue(`items.${index}.vatType`, item.vatType || 'VAT 20%');
                                              calculateTotals();
                                              setOpen(false);
                                            }}
                                          >
                                            {item.itemName}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              )}
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <Input 
                                  {...field} 
                                  type="number" 
                                  min="1" 
                                  className="block w-20 border-0 p-0 focus:ring-0 text-sm text-neutral-text" 
                                  placeholder="Qty"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    calculateTotals();
                                  }}
                                />
                              )}
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <FormField
                              control={form.control}
                              name={`items.${index}.unit`}
                              render={({ field }) => (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-between border-0 p-0 focus:ring-0 text-sm text-neutral-text"
                                    >
                                      {field.value || "Select unit..."}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Search units or type new..." className="h-9" />
                                      <CommandEmpty>
                                        No units found. Type to create a new one.
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {["Each", "Meters", "Kg", "Box", "Day", "Hour", "Liter", "Roll", "Pack", "Set", "Ton"].map((unit) => (
                                          <CommandItem
                                            key={unit}
                                            value={unit}
                                            onSelect={(value) => {
                                              field.onChange(value);
                                            }}
                                          >
                                            {unit}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              )}
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field }) => (
                                <Input 
                                  {...field} 
                                  type="number"
                                  step="0.01"
                                  min="0" 
                                  className="block w-24 border-0 p-0 focus:ring-0 text-sm text-neutral-text" 
                                  placeholder="0.00"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    calculateTotals();
                                  }}
                                />
                              )}
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <FormField
                              control={form.control}
                              name={`items.${index}.vatType`}
                              render={({ field }) => (
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    calculateTotals();
                                  }} 
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-32 text-sm border-0 focus:ring-0 p-0 px-1">
                                      <SelectValue placeholder="VAT Type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="VAT 20%">VAT 20%</SelectItem>
                                    <SelectItem value="VAT 0%">VAT 0%</SelectItem>
                                    <SelectItem value="20% RC CIS (0%)">20% RC CIS (0%)</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">
                            {formatCurrency(parseFloat(watchedItems[index]?.totalPrice || "0"))}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                type="button"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  if (watchedSupplierId && form.getValues(`items.${index}.description`)) {
                                    setItemToAdd({
                                      index,
                                      description: form.getValues(`items.${index}.description`),
                                      unit: form.getValues(`items.${index}.unit`),
                                      unitPrice: form.getValues(`items.${index}.unitPrice`),
                                    });
                                    setShowAddItemDialog(true);
                                  } else {
                                    toast({
                                      title: "Cannot Add Item",
                                      description: "Please select a supplier and enter item details first.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                type="button"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  if (fields.length > 1) {
                                    remove(index);
                                    calculateTotals();
                                  } else {
                                    toast({
                                      title: "Cannot Remove",
                                      description: "At least one item is required.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-right font-medium">Total:</td>
                        <td className="px-4 py-3 font-medium">
                          {formatCurrency(parseFloat(form.watch("totalAmount")))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </div>
              
              <div className="mt-6">
                <h4 className="text-md font-medium text-neutral-text mb-2">Delivery Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Date <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="deliveryInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Instructions</FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goToPrevTab}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Basic Info
                </Button>
                <Button 
                  type="button" 
                  onClick={validateAndGoToNextTab}
                >
                  Continue to Review
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            
            {/* Review & Submit Tab */}
            <TabsContent value="delivery-info" className="space-y-6">
              <h3 className="text-lg font-medium text-neutral-text">Review & Submit</h3>
              
              <div className="bg-neutral-background p-4 rounded-md shadow-sm border">
                <h4 className="text-md font-medium mb-2">Requisition Summary</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium mb-1">Project</h5>
                      <p className="text-sm">
                        {projects.find(p => p.id === form.getValues("projectId"))?.name || "Not selected"}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-1">Supplier</h5>
                      <p className="text-sm">
                        {suppliers.find(s => s.id === form.getValues("supplierId"))?.name || "Not selected"}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-1">Request Date</h5>
                      <p className="text-sm">{form.getValues("requestDate")}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-1">Delivery Date</h5>
                      <p className="text-sm">{form.getValues("deliveryDate")}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-1">Delivery Address</h5>
                      <p className="text-sm">{form.getValues("deliveryAddress")}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-1">Requester</h5>
                      <p className="text-sm">
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user?.email || "Unknown"}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium mb-1">Items</h5>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-neutral-secondary">
                        <thead className="bg-neutral-secondary">
                          <tr>
                            <th className="px-2 py-1 text-left text-xs">#</th>
                            <th className="px-2 py-1 text-left text-xs">Description</th>
                            <th className="px-2 py-1 text-left text-xs">Quantity</th>
                            <th className="px-2 py-1 text-left text-xs">Unit</th>
                            <th className="px-2 py-1 text-left text-xs">Unit Price</th>
                            <th className="px-2 py-1 text-left text-xs">VAT</th>
                            <th className="px-2 py-1 text-left text-xs">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.getValues("items").map((item, idx) => (
                            <tr key={idx} className="border-b border-neutral-secondary">
                              <td className="px-2 py-1 text-xs">{idx + 1}</td>
                              <td className="px-2 py-1 text-xs">{item.description}</td>
                              <td className="px-2 py-1 text-xs">{item.quantity}</td>
                              <td className="px-2 py-1 text-xs">{item.unit}</td>
                              <td className="px-2 py-1 text-xs">{formatCurrency(parseFloat(item.unitPrice))}</td>
                              <td className="px-2 py-1 text-xs">{item.vatType}</td>
                              <td className="px-2 py-1 text-xs">{formatCurrency(parseFloat(item.totalPrice))}</td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={6} className="px-2 py-1 text-right text-xs font-medium">Total:</td>
                            <td className="px-2 py-1 text-xs font-medium">
                              {formatCurrency(parseFloat(form.getValues("totalAmount")))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-6">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree to the terms and conditions <span className="text-red-500">*</span>
                      </FormLabel>
                      <p className="text-sm text-neutral-textLight">
                        By submitting this requisition, I confirm that all details are accurate and the items are required for the specified project.
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goToPrevTab}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Items
                </Button>
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Requisition
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
      
      {/* Preview Modal */}
      {previewVisible && (
        <Dialog open={previewVisible} onOpenChange={setPreviewVisible}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Requisition Preview</DialogTitle>
            </DialogHeader>
            <RequisitionPreview
              requisition={{
                requisitionNumber: "DRAFT",
                project: projects.find(p => p.id === form.getValues("projectId")),
                supplier: suppliers.find(s => s.id === form.getValues("supplierId")),
                requestDate: form.getValues("requestDate"),
                deliveryDate: form.getValues("deliveryDate"),
                deliveryAddress: form.getValues("deliveryAddress"),
                deliveryInstructions: form.getValues("deliveryInstructions"),
                items: form.getValues("items"),
                totalAmount: form.getValues("totalAmount"),
                status: "Draft",
                requestedById: user?.id || "",
                user: user,
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewVisible(false)}>
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Add to Supplier Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item to Supplier Catalog</DialogTitle>
            <DialogDescription>
              This will add the item to this supplier's catalog for future use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Item Description
              </label>
              <Input 
                value={itemToAdd?.description || ''} 
                onChange={(e) => setItemToAdd(prev => prev ? {
                  ...prev, 
                  description: e.target.value
                } : null)} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Unit
                </label>
                <Input 
                  value={itemToAdd?.unit || ''} 
                  onChange={(e) => setItemToAdd(prev => prev ? {
                    ...prev, 
                    unit: e.target.value
                  } : null)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Unit Price
                </label>
                <Input 
                  type="number"
                  step="0.01"
                  value={itemToAdd?.unitPrice || ''} 
                  onChange={(e) => setItemToAdd(prev => prev ? {
                    ...prev, 
                    unitPrice: e.target.value
                  } : null)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddItemToSupplier}
              disabled={addItemMutation.isPending}
            >
              {addItemMutation.isPending ? "Adding..." : "Add to Catalog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}