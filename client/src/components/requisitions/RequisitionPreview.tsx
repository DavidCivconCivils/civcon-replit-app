import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, Mail } from "lucide-react";
import { User } from "@shared/schema";

interface RequisitionPreviewProps {
  data: {
    requisitionNumber?: string;
    project?: {
      id: number;
      name: string;
      contractNumber: string;
    };
    supplier?: {
      id: number;
      name: string;
      address: string;
      email: string;
    };
    projectId?: number;
    supplierId?: number;
    requestDate: string;
    deliveryDate: string;
    deliveryAddress: string;
    deliveryInstructions?: string;
    status?: string;
    rejectionReason?: string;
    items: {
      description: string;
      quantity: number;
      unit: string;
      unitPrice: string;
      totalPrice: string;
    }[];
    totalAmount: string;
    user?: User | null;
    requestedById?: string;
    terms?: boolean;
  };
  onExportPdf?: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
}

export default function RequisitionPreview({ data, onExportPdf, onPrint, onEmail }: RequisitionPreviewProps) {
  console.log("RequisitionPreview data:", data);
  
  return (
    <div className="print-container">
      {/* Requisition Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-text">Purchase Requisition</h2>
          {data.requisitionNumber && (
            <p className="text-sm text-neutral-textLight font-mono">{data.requisitionNumber}</p>
          )}
        </div>
        <div className="h-16 w-48 flex items-center justify-center">
          <img src="/Civcon Civils Logo.png" alt="Civcon Logo" className="h-full object-contain" />
        </div>
      </div>
      
      {/* Project & Date Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-neutral-textLight">Project:</p>
          <p className="font-medium">
            {data.project 
              ? `${data.project.name} (${data.project.contractNumber})` 
              : "No project specified"}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Date:</p>
          <p className="font-medium">{formatDate(data.requestDate)}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Status:</p>
          <p className="font-medium">
            {data.status === "pending" ? "Sent for Approval" : 
             data.status === "rejected" ? "Rejected" : 
             data.status || "Draft"}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Required By:</p>
          <p className="font-medium">{formatDate(data.deliveryDate)}</p>
        </div>
      </div>
      
      {/* Supplier Info */}
      <div className="bg-neutral p-4 rounded-md mb-6">
        <h4 className="font-medium mb-2">Supplier Information</h4>
        {data.supplier ? (
          <>
            <p className="font-medium">{data.supplier.name}</p>
            {data.supplier.address && <p className="text-sm">{data.supplier.address}</p>}
            {data.supplier.email && <p className="text-sm text-primary">{data.supplier.email}</p>}
          </>
        ) : (
          <p className="text-sm text-neutral-textLight">No supplier selected</p>
        )}
      </div>
      
      {/* Items Summary */}
      <h4 className="font-medium mb-2">Items Summary</h4>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full divide-y divide-neutral-secondary border border-neutral-secondary rounded-md">
          <thead className="bg-neutral-secondary">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">#</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">Description</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">Quantity</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">Unit</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">Unit Price</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-textLight tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-secondary">
            {data.items && data.items.length > 0 ? data.items.map((item, index) => (
              <tr key={index}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">{index + 1}</td>
                <td className="px-4 py-2 text-sm text-neutral-text">{item.description}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">{item.quantity}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">{item.unit}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">
                  {formatCurrency(parseFloat(item.unitPrice) || 0)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">
                  {formatCurrency(parseFloat(item.totalPrice) || 0)}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-sm text-neutral-textLight">
                  No items found in this requisition.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-neutral-secondary">
            <tr>
              <td colSpan={5} className="px-4 py-2 text-sm font-medium text-right">Total Amount:</td>
              <td className="px-4 py-2 text-sm font-medium">
                {data.totalAmount ? formatCurrency(parseFloat(data.totalAmount)) : '£0.00'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {/* Delivery Info */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div>
          <p className="text-sm text-neutral-textLight">Delivery Address:</p>
          <p className="font-medium">{data.deliveryAddress || "N/A"}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Delivery Date:</p>
          <p className="font-medium">{formatDate(data.deliveryDate)}</p>
        </div>
        {data.deliveryInstructions && (
          <div>
            <p className="text-sm text-neutral-textLight">Delivery Instructions:</p>
            <p className="font-medium">{data.deliveryInstructions}</p>
          </div>
        )}
      </div>
      
      {/* Rejection Reason (if rejected) */}
      {data.status === "rejected" && data.rejectionReason && (
        <div className="bg-red-50 p-4 rounded-md mb-6 border border-red-200">
          <h4 className="font-medium mb-2 text-red-800">Rejection Reason</h4>
          <p className="text-red-700">{data.rejectionReason}</p>
        </div>
      )}
      
      {/* Terms and Conditions */}
      {data.terms && (
        <div className="bg-neutral p-4 rounded-md mb-6">
          <h4 className="font-medium mb-2">Terms and Conditions</h4>
          <p className="text-sm">By submitting this requisition, I confirm that all information is accurate and approve the purchase of items listed above.</p>
        </div>
      )}
      
      {/* Signature Section */}
      <div className="border-t border-neutral-secondary pt-4 mb-6">
        <div>
          <p className="text-sm text-neutral-textLight">Requested By:</p>
          <p className="font-medium">
            {data.user ? `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || data.user.email : "Unknown User"}
          </p>
          <p className="text-xs text-neutral-textLight">
            {data.user?.role === 'finance' ? 'Finance Team' : 'Project Manager'}
          </p>
          <p className="text-xs text-neutral-textLight">{formatDate(data.requestDate)}</p>
        </div>
      </div>
      
      {/* Action Buttons (only visible in non-print mode) */}
      <div className="no-print flex justify-end space-x-3 mt-6">
        {onExportPdf && (
          <Button 
            onClick={onExportPdf} 
            variant="outline"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        )}
        {onEmail && (
          <Button 
            onClick={onEmail}
            disabled={!onEmail}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
        )}
      </div>
    </div>
  );
}
