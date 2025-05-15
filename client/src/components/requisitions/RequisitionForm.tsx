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
import { Card, CardContent } from "@/components/ui/card";
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
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: suppliers } = useQuery({
    queryKey: ['/api/suppliers'],
  });

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

  // Watch items to calculate total amount
  const watchedItems = form.watch("items");
  
  useEffect(() => {
    // Calculate total amount when items change
    const totalAmount = watchedItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const totalPrice = quantity * unitPrice;
      
      // Update item total price
      form.setValue(`items.${watchedItems.indexOf(item)}.totalPrice`, totalPrice.toString());
      
      return sum + totalPrice;
    }, 0);
    
    form.setValue("totalAmount", totalAmount.toString());
  }, [watchedItems, form]);

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
    createMutation.mutate(data);
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
    }
    
    setActiveTab(tab);
  };

  const calculateItemTotal = (index: number) => {
    const quantity = Number(form.getValues(`items.${index}.quantity`)) || 0;
    const unitPrice = Number(form.getValues(`items.${index}.unitPrice`)) || 0;
    const totalPrice = quantity * unitPrice;
    form.setValue(`items.${index}.totalPrice`, totalPrice.toString());
  };

  const isPending = createMutation.isPending;

  const formValues = form.getValues();
  const selectedProject = projects?.find(p => p.id === Number(formValues.projectId));
  const selectedSupplier = suppliers?.find(s => s.id === Number(formValues.supplierId));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {previewVisible ? (
        <div className="space-y-4">
          <RequisitionPreview 
            data={{
              ...formValues,
              project: selectedProject,
              supplier: selectedSupplier,
              user,
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
      ) : (
        <>
          {/* Form Tabs */}
          <div className="border-b border-neutral-secondary">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="border-b border-neutral-secondary">
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
            </Tabs>
          </div>
          
          {/* Form Content */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4">
              {/* Basic Info Section */}
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
                            {projects?.map((project) => (
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
                            {suppliers?.map((supplier) => (
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
              
              {/* Items & Delivery Section */}
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
                                      calculateItemTotal(index);
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
                                    defaultValue={field.value}
                                  >
                                    <SelectTrigger className="border-0 p-0 focus:ring-0 text-sm text-neutral-text w-24">
                                      <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Each">Each</SelectItem>
                                      <SelectItem value="Box">Box</SelectItem>
                                      <SelectItem value="Meter">Meter</SelectItem>
                                      <SelectItem value="Liter">Liter</SelectItem>
                                      <SelectItem value="Kg">Kilogram</SelectItem>
                                      <SelectItem value="Bag">Bag</SelectItem>
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
                                      calculateItemTotal(index);
                                    }}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">
                              {formatCurrency(parseFloat(watchedItems[index]?.totalPrice || "0"))}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                disabled={fields.length === 1}
                                className="h-8 w-8 p-0 text-status-error"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-right font-semibold">Total:</td>
                          <td className="px-4 py-2 font-semibold">
                            {formatCurrency(parseFloat(form.watch("totalAmount") || "0"))}
                          </td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan={7} className="px-4 py-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addItem}
                              className="flex items-center text-primary text-sm"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Item
                            </Button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
                
                {/* Delivery Information */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={3} 
                            placeholder="Enter delivery address" 
                          />
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
                          <Textarea 
                            {...field} 
                            rows={3} 
                            placeholder="Enter any special delivery instructions" 
                          />
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
                        <FormLabel>Required Delivery Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
              
              {/* Review & Submit Section */}
              <TabsContent value="review-submit" className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-text">Review & Submit</h3>
                <p className="text-sm text-neutral-textLight">Please review your requisition details before submission.</p>
                
                {/* Terms and Conditions */}
                <div className="mt-4">
                  <h4 className="text-md font-medium text-neutral-text mb-2">Terms and Conditions</h4>
                  <div className="bg-neutral-secondary p-4 rounded-md text-sm text-neutral-text">
                    <ol className="list-decimal ml-4 space-y-2">
                      <li>All prices quoted must include delivery to the specified location.</li>
                      <li>The supplier must notify Civcon of any anticipated delays immediately.</li>
                      <li>Payment terms are net 30 days from the date of receipt of goods or services.</li>
                      <li>All goods delivered must match the specifications outlined in this requisition.</li>
                      <li>Civcon reserves the right to reject any goods that do not meet the required standards.</li>
                    </ol>
                  </div>
                </div>
                
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>I confirm that all information provided is accurate</FormLabel>
                          <p className="text-sm text-neutral-textLight">
                            By submitting this requisition, I acknowledge that I am authorized to make this request on behalf of the company.
                          </p>
                          <FormMessage />
                        </div>
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
                    onClick={() => setPreviewVisible(true)}
                    disabled={!form.formState.isValid}
                  >
                    Preview Requisition
                  </Button>
                </div>
              </TabsContent>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
