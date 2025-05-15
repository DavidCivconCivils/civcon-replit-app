import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, Mail } from "lucide-react";
import { User } from "@shared/schema";

interface PurchaseOrderPreviewProps {
  data: {
    poNumber: string;
    purchaseOrder: {
      issueDate: string;
      status: string;
      totalAmount: string;
    };
    requisition: {
      requisitionNumber: string;
      requestDate: string;
      deliveryDate: string;
      deliveryAddress: string;
      deliveryInstructions?: string;
    };
    items: {
      description: string;
      quantity: number;
      unit: string;
      unitPrice: string;
      totalPrice: string;
    }[];
    project?: {
      name: string;
      contractNumber: string;
    };
    supplier?: {
      name: string;
      address: string;
      email: string;
    };
    user?: User | null;
  };
  onExportPdf?: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
}

export default function PurchaseOrderPreview({ data, onExportPdf, onPrint, onEmail }: PurchaseOrderPreviewProps) {
  return (
    <div className="print-container">
      {/* Purchase Order Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-text">Purchase Order</h2>
          <p className="text-sm text-neutral-textLight font-mono">{data.poNumber}</p>
        </div>
        <div className="h-16 w-40 bg-neutral-secondary flex items-center justify-center rounded border border-neutral-tertiary">
          <span className="text-neutral-textLight font-medium">CIVCON LOGO</span>
        </div>
      </div>
      
      {/* Project & Date Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-neutral-textLight">Project:</p>
          <p className="font-medium">
            {data.project 
              ? `${data.project.name} (${data.project.contractNumber})` 
              : "Not specified"}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Date Issued:</p>
          <p className="font-medium">{formatDate(data.purchaseOrder.issueDate)}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Approved By:</p>
          <p className="font-medium">
            {data.user 
              ? `${data.user.firstName || ''} ${data.user.lastName || ''}` 
              : "Finance Team"}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Status:</p>
          <p className="font-medium text-status-success">
            {data.purchaseOrder.status.charAt(0).toUpperCase() + data.purchaseOrder.status.slice(1)}
          </p>
        </div>
      </div>
      
      {/* Supplier Info */}
      <div className="bg-neutral p-4 rounded-md mb-6">
        <h4 className="font-medium mb-2">Supplier Information</h4>
        {data.supplier ? (
          <>
            <p>{data.supplier.name}</p>
            <p className="text-sm text-neutral-textLight">{data.supplier.address}</p>
            <p className="text-sm text-neutral-textLight">{data.supplier.email}</p>
          </>
        ) : (
          <p className="text-sm text-neutral-textLight">No supplier information</p>
        )}
      </div>
      
      {/* Items Table */}
      <h4 className="font-medium mb-2">Purchase Order Items</h4>
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
            {data.items && data.items.map((item, index) => (
              <tr key={index}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">{index + 1}</td>
                <td className="px-4 py-2 text-sm text-neutral-text">{item.description}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">{item.quantity}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">{item.unit}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">
                  {formatCurrency(parseFloat(item.unitPrice))}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-text">
                  {formatCurrency(parseFloat(item.totalPrice))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-neutral-secondary">
            <tr>
              <td colSpan={5} className="px-4 py-2 text-sm font-medium text-right">Subtotal:</td>
              <td className="px-4 py-2 text-sm font-medium">
                {formatCurrency(parseFloat(data.purchaseOrder.totalAmount))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {/* Delivery Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-neutral-textLight">Delivery Address:</p>
          <p className="font-medium">{data.requisition.deliveryAddress}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Required By:</p>
          <p className="font-medium">{formatDate(data.requisition.deliveryDate)}</p>
        </div>
        {data.requisition.deliveryInstructions && (
          <div className="col-span-2">
            <p className="text-sm text-neutral-textLight">Delivery Instructions:</p>
            <p>{data.requisition.deliveryInstructions}</p>
          </div>
        )}
      </div>
      
      {/* Terms and Conditions */}
      <div className="bg-neutral p-4 rounded-md mb-6">
        <h4 className="font-medium mb-2">Terms and Conditions</h4>
        <ol className="list-decimal ml-4 space-y-1 text-sm">
          <li>All prices quoted must include delivery to the specified location.</li>
          <li>The supplier must notify Civcon of any anticipated delays immediately.</li>
          <li>Payment terms are net 30 days from the date of receipt of goods or services.</li>
          <li>All goods delivered must match the specifications outlined in this purchase order.</li>
          <li>Civcon reserves the right to reject any goods that do not meet the required standards.</li>
        </ol>
      </div>
      
      {/* Original Requisition Info */}
      <div className="border-t border-neutral-secondary pt-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-neutral-textLight">Issued By:</p>
            <p className="font-medium">
              {data.user ? `${data.user.firstName || ''} ${data.user.lastName || ''}` : "Finance Team"}
            </p>
            <p className="text-xs text-neutral-textLight">Finance Team</p>
            <p className="text-xs text-neutral-textLight">{formatDate(data.purchaseOrder.issueDate)}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-textLight">Original Requisition:</p>
            <p className="font-medium">{data.requisition.requisitionNumber}</p>
            <p className="text-xs text-neutral-textLight">Date: {formatDate(data.requisition.requestDate)}</p>
          </div>
        </div>
      </div>
      
      {/* Action Buttons (only visible in non-print mode) */}
      {(onPrint || onExportPdf || onEmail) && (
        <div className="no-print flex justify-end space-x-3 mt-6">
          {onPrint && (
            <Button 
              onClick={onPrint} 
              variant="outline"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          )}
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
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
