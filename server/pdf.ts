import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { User, Project, Supplier, Requisition, RequisitionItem, PurchaseOrder } from '@shared/schema';

type RequisitionData = {
  requisition: Requisition;
  items: RequisitionItem[];
  project: Project;
  supplier: Supplier;
  user: User;
};

type PurchaseOrderData = {
  purchaseOrder: PurchaseOrder;
  requisition: Requisition;
  items: RequisitionItem[];
  project: Project;
  supplier: Supplier;
  approver: User;
};

export async function generatePDF(
  type: 'requisition' | 'purchaseOrder',
  data: RequisitionData | PurchaseOrderData
): Promise<Buffer> {
  const doc = new jsPDF();
  
  // Add company logo (placeholder)
  doc.setFillColor(200, 200, 200);
  doc.rect(140, 10, 50, 20, 'F');
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(12);
  doc.text('CIVCON LOGO', 150, 22);
  
  // Document header
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(type === 'requisition' ? 'Purchase Requisition' : 'Purchase Order', 14, 20);
  
  // Document number
  doc.setFontSize(10);
  doc.setFont('courier', 'normal');
  const documentNumber = type === 'requisition' 
    ? (data as RequisitionData).requisition.requisitionNumber 
    : (data as PurchaseOrderData).purchaseOrder.poNumber;
  doc.text(documentNumber, 14, 26);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Project & Date Info
  const project = data.project;
  doc.text(`Project:`, 14, 40);
  doc.setFont('helvetica', 'bold');
  doc.text(`${project.name} (${project.contractNumber})`, 40, 40);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Date:`, 14, 46);
  doc.setFont('helvetica', 'bold');
  const date = type === 'requisition' 
    ? format(new Date((data as RequisitionData).requisition.requestDate), 'MMM dd, yyyy')
    : format(new Date((data as PurchaseOrderData).purchaseOrder.issueDate), 'MMM dd, yyyy');
  doc.text(date, 40, 46);
  doc.setFont('helvetica', 'normal');
  
  if (type === 'requisition') {
    const requisitionData = data as RequisitionData;
    doc.text(`Requested By:`, 14, 52);
    doc.setFont('helvetica', 'bold');
    doc.text(`${requisitionData.user.firstName || ''} ${requisitionData.user.lastName || ''}`, 40, 52);
    doc.setFont('helvetica', 'normal');
  } else {
    const poData = data as PurchaseOrderData;
    doc.text(`Approved By:`, 14, 52);
    doc.setFont('helvetica', 'bold');
    doc.text(`${poData.approver.firstName || ''} ${poData.approver.lastName || ''}`, 40, 52);
    doc.setFont('helvetica', 'normal');
  }
  
  doc.text(`Status:`, 14, 58);
  doc.setFont('helvetica', 'bold');
  const status = type === 'requisition' 
    ? (data as RequisitionData).requisition.status
    : (data as PurchaseOrderData).purchaseOrder.status;
  doc.text(status.charAt(0).toUpperCase() + status.slice(1), 40, 58);
  doc.setFont('helvetica', 'normal');
  
  // Supplier Info box
  doc.setFillColor(240, 240, 240);
  doc.rect(14, 65, 180, 25, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Supplier Information`, 16, 71);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.supplier.name, 16, 77);
  doc.text(data.supplier.address, 16, 83);
  doc.text(data.supplier.email, 16, 89);
  
  // Items Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${type === 'requisition' ? 'Requisition' : 'Purchase Order'} Items`, 14, 100);
  doc.setFont('helvetica', 'normal');
  
  const tableColumns = [
    { header: '#', dataKey: 'index' },
    { header: 'Description', dataKey: 'description' },
    { header: 'Quantity', dataKey: 'quantity' },
    { header: 'Unit', dataKey: 'unit' },
    { header: 'Unit Price', dataKey: 'unitPrice' },
    { header: 'Total', dataKey: 'totalPrice' }
  ];
  
  const tableRows = data.items.map((item, index) => {
    return {
      index: (index + 1).toString(),
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit,
      unitPrice: `$${parseFloat(item.unitPrice.toString()).toFixed(2)}`,
      totalPrice: `$${parseFloat(item.totalPrice.toString()).toFixed(2)}`
    };
  });
  
  // Calculate total amount
  const totalAmount = data.items.reduce((sum, item) => sum + parseFloat(item.totalPrice.toString()), 0).toFixed(2);
  
  autoTable(doc, {
    startY: 105,
    head: [tableColumns.map(col => col.header)],
    body: tableRows.map(row => tableColumns.map(col => row[col.dataKey as keyof typeof row])),
    foot: [['', '', '', '', 'Total:', `$${totalAmount}`]],
    theme: 'striped',
    headStyles: {
      fillColor: [26, 82, 118],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    }
  });
  
  // Get the last position after the table
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  
  // Delivery Info
  if (type === 'requisition') {
    const requisitionData = data as RequisitionData;
    
    doc.setFontSize(10);
    doc.text(`Delivery Address:`, 14, finalY + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(requisitionData.requisition.deliveryAddress, 70, finalY + 10);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Required By:`, 14, finalY + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(format(new Date(requisitionData.requisition.deliveryDate), 'MMM dd, yyyy'), 70, finalY + 16);
    doc.setFont('helvetica', 'normal');
    
    if (requisitionData.requisition.deliveryInstructions) {
      doc.text(`Delivery Instructions:`, 14, finalY + 22);
      doc.text(requisitionData.requisition.deliveryInstructions, 70, finalY + 22);
    }
  }
  
  // Terms and Conditions
  doc.setFillColor(240, 240, 240);
  doc.rect(14, finalY + 30, 180, 40, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Terms and Conditions`, 16, finalY + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`1. All prices quoted must include delivery to the specified location.`, 16, finalY + 42);
  doc.text(`2. The supplier must notify Civcon of any anticipated delays immediately.`, 16, finalY + 47);
  doc.text(`3. Payment terms are net 30 days from the date of receipt of goods or services.`, 16, finalY + 52);
  doc.text(`4. All goods delivered must match the specifications outlined in this document.`, 16, finalY + 57);
  doc.text(`5. Civcon reserves the right to reject any goods that do not meet the required standards.`, 16, finalY + 62);
  
  // Approval Section
  doc.setLineWidth(0.5);
  doc.line(14, finalY + 75, 194, finalY + 75);
  
  if (type === 'requisition') {
    const requisitionData = data as RequisitionData;
    doc.setFontSize(10);
    
    doc.text(`Requested By:`, 14, finalY + 81);
    doc.setFont('helvetica', 'bold');
    doc.text(`${requisitionData.user.firstName || ''} ${requisitionData.user.lastName || ''}`, 14, finalY + 87);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(requisitionData.user.role || 'Requester', 14, finalY + 92);
    doc.text(format(new Date(requisitionData.requisition.requestDate), 'MMM dd, yyyy'), 14, finalY + 97);
    
    doc.setFontSize(10);
    doc.text(`Approved By:`, 120, finalY + 81);
    
    if (requisitionData.requisition.status === 'pending') {
      doc.setFont('helvetica', 'italic');
      doc.text(`Pending Approval`, 120, finalY + 87);
    } else if (requisitionData.requisition.status === 'approved') {
      doc.setFont('helvetica', 'bold');
      doc.text(`Finance Team`, 120, finalY + 87);
    } else if (requisitionData.requisition.status === 'rejected') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 53, 69);
      doc.text(`Rejected`, 120, finalY + 87);
      doc.setTextColor(0, 0, 0);
    }
  } else {
    const poData = data as PurchaseOrderData;
    doc.setFontSize(10);
    
    doc.text(`Issued By:`, 14, finalY + 81);
    doc.setFont('helvetica', 'bold');
    doc.text(`${poData.approver.firstName || ''} ${poData.approver.lastName || ''}`, 14, finalY + 87);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(poData.approver.role || 'Finance Team', 14, finalY + 92);
    doc.text(format(new Date(poData.purchaseOrder.issueDate), 'MMM dd, yyyy'), 14, finalY + 97);
    
    doc.setFontSize(10);
    doc.text(`Original Requisition:`, 120, finalY + 81);
    doc.setFont('helvetica', 'bold');
    doc.text(poData.requisition.requisitionNumber, 120, finalY + 87);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Requested by: ${poData.requisition.requestedById}`, 120, finalY + 92);
    doc.text(format(new Date(poData.requisition.requestDate), 'MMM dd, yyyy'), 120, finalY + 97);
  }
  
  // Footer with page number
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, 14, 285);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy h:mm a')}`, 160, 285);
  }
  
  // Return PDF as buffer
  return Buffer.from(doc.output('arraybuffer'));
}
