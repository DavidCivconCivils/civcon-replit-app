import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, Mail } from "lucide-react";
import { User, PurchaseOrder, Requisition, Project, Supplier, RequisitionItem } from "@shared/schema";

interface PurchaseOrderPreviewProps {
  data: PurchaseOrder & {
    requisition?: Requisition;
    items?: RequisitionItem[];
    project?: Project;
    supplier?: Supplier;
    user?: User;
  };
  onExportPdf?: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
}

export default function PurchaseOrderPreview({ data, onExportPdf, onPrint, onEmail }: PurchaseOrderPreviewProps) {
  // Add null checks/defaults to prevent errors
  const items = data.items || [];
  const requisition = data.requisition || {};
  const project = data.project || {};
  const supplier = data.supplier || {};
  const totalAmount = data.totalAmount?.toString() || "0";
  
  return (
    <div className="print-container">
      {/* Purchase Order Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-text">Purchase Order</h2>
          <p className="text-sm text-neutral-textLight font-mono">{data.poNumber}</p>
        </div>
        <div className="h-16 w-48 flex items-center justify-center">
          <img src="/assets/Civcon Logo.png" alt="Civcon Logo" className="h-full object-contain" />
        </div>
      </div>
      
      {/* Project & Date Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-neutral-textLight">Project:</p>
          <p className="font-medium">
            {project.name 
              ? `${project.name} (${project.contractNumber || 'No contract'})` 
              : "Not specified"}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Date Issued:</p>
          <p className="font-medium">{data.issueDate ? formatDate(data.issueDate) : "Not specified"}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Purchase Order Number:</p>
          <p className="font-medium">{data.poNumber}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Status:</p>
          <p className="font-medium text-status-success">
            {data.status 
              ? data.status.charAt(0).toUpperCase() + data.status.slice(1) 
              : "Not specified"}
          </p>
        </div>
      </div>
      
      {/* Supplier Info */}
      <div className="bg-neutral p-4 rounded-md mb-6">
        <h4 className="font-medium mb-2">Supplier Information</h4>
        {supplier.name ? (
          <>
            <p>{supplier.name}</p>
            <p className="text-sm text-neutral-textLight">{supplier.address || ""}</p>
            <p className="text-sm text-neutral-textLight">{supplier.email || ""}</p>
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
            {items.length > 0 ? (
              items.map((item, index) => (
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
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-sm text-neutral-textLight">
                  No items found in this purchase order.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-neutral-secondary">
            <tr>
              <td colSpan={5} className="px-4 py-2 text-sm font-medium text-right">Subtotal:</td>
              <td className="px-4 py-2 text-sm font-medium">
                {formatCurrency(parseFloat(totalAmount))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {/* Delivery Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-neutral-textLight">Delivery Address:</p>
          <p className="font-medium">{requisition?.deliveryAddress || "N/A"}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-textLight">Required By:</p>
          <p className="font-medium">{requisition?.deliveryDate ? formatDate(requisition.deliveryDate) : "N/A"}</p>
        </div>
        {requisition?.deliveryInstructions && (
          <div className="col-span-2">
            <p className="text-sm text-neutral-textLight">Delivery Instructions:</p>
            <p>{requisition.deliveryInstructions}</p>
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
            <p className="text-sm text-neutral-textLight">Approved By:</p>
            <p className="font-medium">
              {data.user 
                ? `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || data.user.email
                : "Finance Team"}
            </p>
            <p className="text-xs text-neutral-textLight">Finance Team</p>
            <p className="text-xs text-neutral-textLight">{data.issueDate ? formatDate(data.issueDate) : "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-textLight">Original Requisition:</p>
            <p className="font-medium">{requisition?.requisitionNumber || "N/A"}</p>
            <p className="text-xs text-neutral-textLight">Date: {requisition?.requestDate ? formatDate(requisition.requestDate) : "N/A"}</p>
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
