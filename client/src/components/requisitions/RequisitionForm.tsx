import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertRequisitionSchema, insertRequisitionItemSchema } from "@shared/schema";
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
import { Plus, Trash2, ArrowLeft, ArrowRight, Send } from "lucide-react";
import RequisitionPreview from "./RequisitionPreview";

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

type FormValues = z.infer<typeof formSchema>;

interface RequisitionFormProps {
  onSuccess?: () => void;
}

export default function RequisitionForm({ onSuccess }: RequisitionFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("basic-info");
  const [previewVisible, setPreviewVisible] = useState(false);

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
      deliveryDate: "",
      deliveryAddress: "",
      deliveryInstructions: "",
      totalAmount: "0",
      requestedById: user?.id, // Set the user ID right away if available
      items: [
        {
          description: "",
          quantity: 1,
          unit: "Each",
          unitPrice: "0",
          totalPrice: "0",
        },
      ],
      terms: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch form fields to update in real-time
  const watchedItems = form.watch("items");
  const watchedAllFields = form.watch(); // Watch all fields for live preview updates
  
  // This function will be called directly when quantity or price changes
  const calculateTotals = () => {
    setTimeout(() => {
      const items = form.getValues("items");
      const totalAmount = items.reduce((sum, item, index) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const totalPrice = quantity * unitPrice;
        
        // Update item total price (with 2 decimal places for British pounds)
        form.setValue(`items.${index}.totalPrice`, totalPrice.toFixed(2), {
          shouldValidate: true
        });
        
        return sum + totalPrice;
      }, 0);
      
      // Set the total amount with 2 decimal places for British pounds
      form.setValue("totalAmount", totalAmount.toFixed(2), {
        shouldValidate: true
      });
    }, 0);
  };
  
  // Keep effect for when items are added/removed
  useEffect(() => {
    calculateTotals();
  }, [watchedItems]);
  
  // Force render updates when any field changes
  const [, forceUpdate] = useState({});
  useEffect(() => {
    // This will trigger a re-render with the latest form values
    forceUpdate({});
  }, [watchedAllFields]);

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/requisitions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requisitions"] });
      toast({
        title: "Success",
        description: "Requisition submitted successfully",
      });
      form.reset();
      setActiveTab("basic-info");
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit requisition",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    // Make sure we have the user ID
    if (user) {
      data.requestedById = user.id;
      console.log("Submitting form data:", data);
      createMutation.mutate(data);
    } else {
      toast({
        title: "Error",
        description: "User information is missing. Please try logging in again.",
        variant: "destructive",
      });
    }
  };

  const addItem = () => {
    append({
      description: "",
      quantity: 1,
      unit: "Each",
      unitPrice: "0",
      totalPrice: "0",
    });
  };

  const navigateTab = (tab: string) => {
    // Check if the current tab is valid before proceeding
    if (activeTab === "basic-info") {
      const isBasicInfoValid = form.trigger([
        "projectId", 
        "supplierId", 
        "requestDate"
      ]);
      
      if (!isBasicInfoValid) return;
    } else if (activeTab === "items-info") {
      const isItemsInfoValid = form.trigger([
        "items", 
        "deliveryAddress", 
        "deliveryDate"
      ]);
      
      if (!isItemsInfoValid) return;
      
      // Make sure calculations are up to date before reviewing
      calculateTotals();
    }
    
    // Force a refresh of the form data when navigating to review
    if (tab === "review-submit") {
      // Make sure all calculations are updated before showing the review
      const formItems = form.getValues("items");
      
      // Update all items one more time to ensure values are current
      formItems.forEach((_, index) => {
        const quantity = Number(form.getValues(`items.${index}.quantity`)) || 0;
        const unitPrice = Number(form.getValues(`items.${index}.unitPrice`)) || 0;
        const totalPrice = quantity * unitPrice;
        
        form.setValue(`items.${index}.totalPrice`, totalPrice.toFixed(2));
      });
      
      // Update the total amount
      const total = formItems.reduce((sum, item) => {
        return sum + Number(item.totalPrice);
      }, 0);
      
      form.setValue("totalAmount", total.toFixed(2));
      
      // This ensures all updated form values are shown in review
      setTimeout(() => {
        setActiveTab(tab);
      }, 50);
    } else {
      setActiveTab(tab);
    }
  };

  // Calculation function already defined above

  const isPending = createMutation.isPending;

  const formValues = form.getValues();
  const selectedProject = projects.find(p => p.id === Number(formValues.projectId));
  const selectedSupplier = suppliers.find(s => s.id === Number(formValues.supplierId));

  const renderPreviewSection = () => (
    <div className="space-y-4">
      <RequisitionPreview 
        data={{
          ...formValues,
          project: selectedProject,
          supplier: selectedSupplier,
          user: user || undefined,
        }} 
      />
      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setPreviewVisible(false)}
          className="mt-4"
        >
          Back to Edit
        </Button>
        <Button 
          type="button" 
          onClick={() => form.handleSubmit(onSubmit)()}
          disabled={isPending}
          className="mt-4"
        >
          {isPending ? "Submitting..." : "Submit Requisition"}
        </Button>
      </div>
    </div>
  );

  const renderFormTabs = () => (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="border-b border-neutral-secondary mb-4">
              <TabsTrigger value="basic-info" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                1. Basic Info
              </TabsTrigger>
              <TabsTrigger value="items-info" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                2. Items & Delivery
              </TabsTrigger>
              <TabsTrigger value="review-submit" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                3. Review & Submit
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic-info" className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-neutral-text">Basic Information</h3>
                  <p className="text-sm text-neutral-textLight">Enter requisition details</p>
                </div>
                {/* Civcon Logo Placeholder */}
                <div className="h-16 w-40 bg-neutral-secondary flex items-center justify-center rounded border border-neutral-tertiary">
                  <span className="text-neutral-textLight font-medium">CIVCON LOGO</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Project" />
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
                  name="requestDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requisition Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
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
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Supplier" />
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
                
                <FormItem>
                  <FormLabel>Requested By</FormLabel>
                  <Input 
                    value={`${user?.firstName || ''} ${user?.lastName || ''}`} 
                    disabled 
                    className="bg-neutral-secondary/20"
                  />
                </FormItem>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  type="button" 
                  onClick={() => navigateTab("items-info")}
                  className="bg-primary text-white"
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-neutral-textLight tracking-wider w-16">Action</th>
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
                                <Input 
                                  {...field} 
                                  className="w-full border-0 p-0 focus:ring-0 text-sm text-neutral-text" 
                                  placeholder="Item description..."
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // No need to call calculateTotals since it's not a price/quantity field
                                    // But the watch will trigger a re-render for the preview
                                  }}
                                />
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
                                <Select 
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-24 border-0 p-0 focus:ring-0 text-sm text-neutral-text">
                                      <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Each">Each</SelectItem>
                                    <SelectItem value="Box">Box</SelectItem>
                                    <SelectItem value="Pallet">Pallet</SelectItem>
                                    <SelectItem value="Meter">Meter</SelectItem>
                                    <SelectItem value="Liter">Liter</SelectItem>
                                    <SelectItem value="Kg">Kg</SelectItem>
                                    <SelectItem value="Set">Set</SelectItem>
                                  </SelectContent>
                                </Select>
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
                                  min="0" 
                                  step="0.01" 
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
                              name={`items.${index}.totalPrice`}
                              render={({ field }) => (
                                <div className="text-sm font-medium">
                                  {formatCurrency(parseFloat(field.value))}
                                </div>
                              )}
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-right">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0" 
                              onClick={() => remove(index)}
                              disabled={fields.length <= 1}
                            >
                              <Trash2 className="h-4 w-4 text-status-error" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={7} className="px-4 py-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="text-xs" 
                            onClick={addItem}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Item
                          </Button>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td colSpan={5} className="px-4 py-2 text-right font-medium">
                          Total Amount:
                        </td>
                        <td className="px-4 py-2 font-bold text-primary">
                          {formatCurrency(parseFloat(form.getValues().totalAmount))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              {/* Delivery Information */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-neutral-text mb-2">Delivery Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Delivery Date</FormLabel>
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
                        <FormLabel>Delivery Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter delivery address" />
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
                          <FormLabel>Delivery Instructions (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Enter any special delivery instructions" 
                              rows={3}
                              value={field.value || ''} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigateTab("basic-info")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  type="button" 
                  onClick={() => navigateTab("review-submit")}
                  className="bg-primary text-white"
                >
                  Continue to Review
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            
            {/* Review & Submit Tab */}
            <TabsContent value="review-submit" className="space-y-4">
              {/* Force a new render with fresh form values when this tab is shown */}
              {activeTab === "review-submit" && (
                <></>
              )}
              <h3 className="text-lg font-medium text-neutral-text">Review & Submit</h3>
              
              <div className="bg-neutral-secondary/20 p-4 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-neutral-text">Project</h4>
                    <p className="text-sm text-neutral-textLight">
                      {selectedProject ? `${selectedProject.name} (${selectedProject.contractNumber})` : 'Not selected'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-text">Supplier</h4>
                    <p className="text-sm text-neutral-textLight">
                      {selectedSupplier ? selectedSupplier.name : 'Not selected'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-text">Requisition Date</h4>
                    <p className="text-sm text-neutral-textLight">{formValues.requestDate}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-text">Requested By</h4>
                    <p className="text-sm text-neutral-textLight">{`${user?.firstName || ''} ${user?.lastName || ''}`}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-text">Delivery Date</h4>
                    <p className="text-sm text-neutral-textLight">{formValues.deliveryDate}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-text">Delivery Address</h4>
                    <p className="text-sm text-neutral-textLight">{formValues.deliveryAddress}</p>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-neutral-text">Delivery Instructions</h4>
                    <p className="text-sm text-neutral-textLight">{formValues.deliveryInstructions || 'None'}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-md font-medium text-neutral-text mb-2">Items Summary</h4>
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full divide-y divide-neutral-secondary">
                    <thead className="bg-neutral-secondary">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-textLight tracking-wider">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-textLight tracking-wider">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-textLight tracking-wider">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-textLight tracking-wider">Unit</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-textLight tracking-wider">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-textLight tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-secondary">
                      {/* Get the latest values directly from the form instead of using fields array */}
                      {form.getValues("items").map((item, index) => (
                        <tr key={`item-row-${index}`}>
                          <td className="px-4 py-2 text-sm text-neutral-text">{index + 1}</td>
                          <td className="px-4 py-2 text-sm text-neutral-text">{item.description}</td>
                          <td className="px-4 py-2 text-sm text-neutral-text">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-neutral-text">{item.unit}</td>
                          <td className="px-4 py-2 text-sm text-neutral-text">{formatCurrency(parseFloat(item.unitPrice))}</td>
                          <td className="px-4 py-2 text-sm font-medium text-neutral-text">{formatCurrency(parseFloat(item.totalPrice))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-neutral-secondary/20">
                        <td colSpan={5} className="px-4 py-2 text-right font-medium">
                          Total Amount:
                        </td>
                        <td className="px-4 py-2 font-bold text-primary">
                          {formatCurrency(parseFloat(form.getValues().totalAmount))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              <div className="border p-4 rounded-md mt-6">
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I agree to the terms and conditions
                        </FormLabel>
                        <p className="text-xs text-neutral-textLight">
                          By submitting this requisition, I confirm that all information is accurate and approve the purchase of items listed above.
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-between pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigateTab("items-info")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  type="button" 
                  disabled={isPending || !form.watch("terms")}
                  className="bg-primary text-white"
                  onClick={async () => {
                    // Manually trigger validation and submit
                    const isValid = await form.trigger();
                    if (isValid) {
                      form.handleSubmit(onSubmit)();
                    } else {
                      // Show specific errors
                      const errors = form.formState.errors;
                      const errorFields = Object.keys(errors);
                      
                      // Create readable error message
                      let errorMessage = "Please fix the following errors:";
                      errorFields.forEach(field => {
                        const error = errors[field];
                        if (error?.message) {
                          if (field.includes('items')) {
                            errorMessage += `\n• Item ${field.split('.')[1]} ${error.message}`;
                          } else {
                            errorMessage += `\n• ${field}: ${error.message}`;
                          }
                        }
                      });
                      
                      toast({
                        title: "Validation Error",
                        description: errorMessage,
                        variant: "destructive",
                      });
                      
                      console.log("Form errors:", errors);
                    }
                  }}
                >
                  {isPending ? "Submitting..." : "Submit Requisition"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {previewVisible ? renderPreviewSection() : renderFormTabs()}
    </div>
  );
}