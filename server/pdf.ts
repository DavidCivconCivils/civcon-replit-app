import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { User, Project, Supplier, Requisition, RequisitionItem, PurchaseOrder } from '@shared/schema';
import fs from 'fs';
import path from 'path';

type RequisitionData = {
  requisition: Requisition;
  items: any[]; // Allow more flexible types for items
  project: Project;
  supplier: Supplier;
  user: User;
};

type PurchaseOrderData = {
  purchaseOrder: PurchaseOrder;
  requisition: Requisition;
  items: any[]; // Allow more flexible types for items
  project: Project;
  supplier: Supplier;
  approver: User;
};

export async function generatePDF(
  type: 'requisition' | 'purchaseOrder',
  data: RequisitionData | PurchaseOrderData
): Promise<Buffer> {
  // Create PDF with proper page management
  const doc = new jsPDF({
    compress: true,
    putOnlyUsedFonts: true,
    precision: 2,
    format: 'a4'
  });

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  let currentY = 20;
  
  // Helper function to check if we need a new page
  const checkPageBreak = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 30) {
      doc.addPage();
      currentY = 20;
      return true;
    }
    return false;
  };
  
  // Add smaller company logo and information
  try {
    const logoPath = path.resolve('./public/Civcon Civils Logo.png');
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath, { encoding: 'base64' });
      const imgData = `data:image/png;base64,${logoData}`;
      doc.addImage(imgData, 'PNG', 150, 8, 40, 16); // Smaller logo
      console.log('Logo added to PDF successfully');
    }
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CIVCON CIVIL ENGINEERING', 150, 16);
  }
  
  // Company address (right side, more compact)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Civcon Civil Engineering Ltd', 150, 26);
  doc.text('113 Brigshaw Drive, Allerton Bywater', 150, 30);
  doc.text('Castleford, WF10 2HS', 150, 34);
  doc.text('Tel: 01252 717700', 150, 38);
  doc.text('Email: info@civconcivils.co.uk', 150, 42);
  
  // Document header - more compact
  currentY = 16;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(type === 'requisition' ? 'Purchase Requisition' : 'Purchase Order', margin, currentY);
  currentY += 6;
  
  // Document number with highlighting
  const documentNumber = type === 'requisition' 
    ? (data as RequisitionData).requisition.requisitionNumber 
    : (data as PurchaseOrderData).purchaseOrder.poNumber;
  
  if (type === 'purchaseOrder') {
    doc.setFillColor(255, 255, 200);
    doc.rect(margin, currentY - 1, 90, 7, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Purchase Order Number: ${documentNumber}`, margin, currentY + 3);
    currentY += 8;
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Requisition Number: ${documentNumber}`, margin, currentY);
    currentY += 6;
  }
  
  // Project & Date Info section - more compact
  currentY += 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const project = data.project;
  doc.text(`Project:`, margin, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(`${project.name} (${project.contractNumber})`, margin + 22, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 5;
  
  doc.text(`Date:`, margin, currentY);
  doc.setFont('helvetica', 'bold');
  const date = type === 'requisition' 
    ? format(new Date((data as RequisitionData).requisition.requestDate), 'MMM dd, yyyy')
    : format(new Date((data as PurchaseOrderData).purchaseOrder.issueDate), 'MMM dd, yyyy');
  doc.text(date, margin + 22, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 5;
  
  if (type === 'requisition') {
    const requisitionData = data as RequisitionData;
    doc.text(`Requested By:`, margin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${requisitionData.user.firstName || ''} ${requisitionData.user.lastName || ''}`, margin + 22, currentY);
    doc.setFont('helvetica', 'normal');
  } else {
    const poData = data as PurchaseOrderData;
    doc.text(`Approved By:`, margin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${poData.approver.firstName || ''} ${poData.approver.lastName || ''}`, margin + 22, currentY);
    doc.setFont('helvetica', 'normal');
  }
  currentY += 5;
  
  doc.text(`Status:`, margin, currentY);
  doc.setFont('helvetica', 'bold');
  const status = type === 'requisition' 
    ? (data as RequisitionData).requisition.status
    : (data as PurchaseOrderData).purchaseOrder.status;
  doc.text(status.charAt(0).toUpperCase() + status.slice(1), margin + 22, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 8;
  
  // Grid layout: Supplier and Delivery Information side by side
  const deliveryData = type === 'requisition' 
    ? (data as RequisitionData).requisition 
    : (data as PurchaseOrderData).requisition;
  
  // Calculate content for both boxes
  const supplierAddressLines = data.supplier.address.split('\n').filter(line => line.trim());
  const supplierContactLines = [
    data.supplier.email ? `Email: ${data.supplier.email}` : '',
    data.supplier.phone ? `Phone: ${data.supplier.phone}` : '',
    data.supplier.contactPerson ? `Contact: ${data.supplier.contactPerson}` : ''
  ].filter(line => line);
  
  let deliveryAddressLines: string[] = [];
  let deliveryInstructionLines: string[] = [];
  
  if (deliveryData.deliveryAddress) {
    deliveryAddressLines = deliveryData.deliveryAddress.split(',').map(line => line.trim()).filter(line => line);
  }
  
  if (deliveryData.deliveryInstructions && deliveryData.deliveryInstructions.trim()) {
    deliveryInstructionLines = deliveryData.deliveryInstructions.split('\n').map(line => line.trim()).filter(line => line);
  }
  
  // Calculate heights and use the taller one for both boxes
  const supplierContentHeight = 15 + (supplierAddressLines.length * 3.5) + (supplierContactLines.length * 3.5);
  const deliveryContentHeight = 15 + (deliveryAddressLines.length * 3.5) + (deliveryInstructionLines.length * 3.5) + 8;
  const boxHeight = Math.max(30, Math.max(supplierContentHeight, deliveryContentHeight));
  
  // Grid dimensions with gap
  const boxWidth = (pageWidth - (margin * 2) - 8) / 2; // 8px gap between boxes
  const leftBoxX = margin;
  const rightBoxX = margin + boxWidth + 8;
  
  // Supplier Information Box (Left)
  doc.setFillColor(240, 240, 240);
  doc.rect(leftBoxX, currentY, boxWidth, boxHeight, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Supplier Information`, leftBoxX + 2, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  let supplierY = currentY + 11;
  
  // Supplier name
  doc.setFont('helvetica', 'bold');
  doc.text(data.supplier.name, leftBoxX + 2, supplierY);
  doc.setFont('helvetica', 'normal');
  supplierY += 4;
  
  // Multi-line address
  supplierAddressLines.forEach((line, index) => {
    if (line.trim()) {
      doc.text(line.trim(), leftBoxX + 2, supplierY + (index * 3.5));
    }
  });
  supplierY += supplierAddressLines.length * 3.5 + 2;
  
  // Contact information
  supplierContactLines.forEach((line, index) => {
    doc.text(line, leftBoxX + 2, supplierY + (index * 3.5));
  });
  
  // Delivery Information Box (Right)
  doc.setFillColor(250, 250, 250);
  doc.rect(rightBoxX, currentY, boxWidth, boxHeight, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Delivery Information`, rightBoxX + 2, currentY + 6);
  
  let deliveryY = currentY + 11;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Delivery Address
  doc.text(`Address:`, rightBoxX + 2, deliveryY);
  
  if (deliveryAddressLines.length > 0) {
    deliveryAddressLines.forEach((line, index) => {
      doc.text(line, rightBoxX + 20, deliveryY + (index * 3.5));
    });
    deliveryY += deliveryAddressLines.length * 3.5 + 3;
  } else {
    deliveryY += 5;
  }
  
  // Required By Date
  doc.text(`Required By:`, rightBoxX + 2, deliveryY);
  doc.text(format(new Date(deliveryData.deliveryDate), 'MMM dd, yyyy'), rightBoxX + 20, deliveryY);
  deliveryY += 5;
  
  // Delivery Instructions
  if (deliveryInstructionLines.length > 0) {
    doc.text(`Instructions:`, rightBoxX + 2, deliveryY);
    
    deliveryInstructionLines.forEach((line, index) => {
      // Truncate long lines to fit in box
      const maxLength = 35;
      const truncatedLine = line.length > maxLength ? line.substring(0, maxLength) + '...' : line;
      doc.text(truncatedLine, rightBoxX + 20, deliveryY + 2 + (index * 3.5));
    });
  }
  
  currentY += boxHeight + 6;
  
  // Items Table section - more compact
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${type === 'requisition' ? 'Requisition' : 'Purchase Order'} Items`, margin, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 4;
  
  const tableColumns = [
    { header: '#', dataKey: 'index' },
    { header: 'Description', dataKey: 'description' },
    { header: 'Quantity', dataKey: 'quantity' },
    { header: 'Unit', dataKey: 'unit' },
    { header: 'Unit Price', dataKey: 'unitPrice' },
    { header: 'VAT', dataKey: 'vatType' },
    { header: 'Total', dataKey: 'totalPrice' }
  ];
  
  const tableRows = data.items.map((item, index) => {
    return {
      index: (index + 1).toString(),
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit,
      unitPrice: `£${parseFloat(item.unitPrice.toString()).toFixed(2)}`,
      vatType: item.vatType || 'VAT 20%',
      totalPrice: `£${parseFloat(item.totalPrice.toString()).toFixed(2)}`
    };
  });
  
  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice.toString()) || 0;
    return sum + (quantity * unitPrice);
  }, 0).toFixed(2);
  
  let vat20Amount = 0;
  let vatCisAmount = 0;
  
  data.items.forEach(item => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice.toString()) || 0;
    const itemSubtotal = quantity * unitPrice;
    
    if (item.vatType === "VAT 20%" || !item.vatType) {
      vat20Amount += itemSubtotal * 0.2;
    } else if (item.vatType === "20% RC CIS (0%)") {
      vatCisAmount += itemSubtotal * 0.2;
    }
  });
  
  const totalAmount = (parseFloat(subtotal) + vat20Amount).toFixed(2);
  
  const footerRows = [];
  footerRows.push(['', '', '', '', '', 'Subtotal:', `£${subtotal}`]);
  
  if (vat20Amount > 0) {
    footerRows.push(['', '', '', '', '', 'VAT @ 20%:', `£${vat20Amount.toFixed(2)}`]);
  }
  
  if (vatCisAmount > 0) {
    footerRows.push(['', '', '', '', '', 'VAT @ 20% (RC CIS):', `£${vatCisAmount.toFixed(2)}`]);
    footerRows.push(['', '', '', '', '', 'VAT @ -20% (RC CIS):', `-£${vatCisAmount.toFixed(2)}`]);
  }
  
  footerRows.push(['', '', '', '', '', 'Total:', `£${totalAmount}`]);
  
  autoTable(doc, {
    startY: currentY,
    head: [tableColumns.map(col => col.header)],
    body: tableRows.map(row => tableColumns.map(col => row[col.dataKey as keyof typeof row])),
    foot: footerRows,
    theme: 'striped',
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [26, 82, 118],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8
    },
    didDrawPage: (data) => {
      currentY = data.cursor?.y || currentY;
    }
  });
  
  // Update currentY after table
  currentY = (doc as any).lastAutoTable.finalY + 6;
  
  // Compact Terms and Invoice submission section
  if (type === 'purchaseOrder') {
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 18, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice Submission Instructions`, margin + 2, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Please submit all invoices to: accounts.payable@civconcivils.co.uk`, margin + 2, currentY + 9);
    doc.text(`Include this Purchase Order Number (${documentNumber}) in your invoice.`, margin + 2, currentY + 13);
    
    currentY += 22;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Terms and Conditions`, margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 255);
    doc.text(`View full terms and conditions online:`, margin, currentY + 4);
    doc.text(`https://civconcivils.co.uk/wp-content/uploads/2025/02/Purchase-Order-Terms-and-Conditions.pdf`, margin, currentY + 8);
    doc.setTextColor(0, 0, 0);
    
    currentY += 14;
  } else {
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 25, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Terms and Conditions`, margin + 2, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`1. All prices quoted must include delivery to the specified location.`, margin + 2, currentY + 8);
    doc.text(`2. The supplier must notify Civcon of any anticipated delays immediately.`, margin + 2, currentY + 11);
    doc.text(`3. Payment terms are net 30 days from the date of receipt of goods or services.`, margin + 2, currentY + 14);
    doc.text(`4. All goods delivered must match the specifications outlined in this document.`, margin + 2, currentY + 17);
    doc.text(`5. Civcon reserves the right to reject any goods that do not meet the required standards.`, margin + 2, currentY + 20);
    
    currentY += 28;
  }
  
  // Compact Approval Section - no page break to keep on single page
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;
  
  if (type === 'requisition') {
    const requisitionData = data as RequisitionData;
    doc.setFontSize(8);
    
    doc.text(`Raised By:`, margin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${requisitionData.user.firstName || ''} ${requisitionData.user.lastName || ''}`, margin, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(requisitionData.user.role || 'Requester', margin, currentY + 8);
    doc.text(format(new Date(requisitionData.requisition.requestDate), 'MMM dd, yyyy'), margin, currentY + 12);
    
    doc.setFontSize(8);
    doc.text(`Approved By:`, margin + 100, currentY);
    
    if (requisitionData.requisition.status === 'pending') {
      doc.setFont('helvetica', 'italic');
      doc.text(`Pending Approval`, margin + 100, currentY + 4);
    } else if (requisitionData.requisition.status === 'approved') {
      doc.setFont('helvetica', 'bold');
      doc.text(`Finance Team`, margin + 100, currentY + 4);
    } else if (requisitionData.requisition.status === 'rejected') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 53, 69);
      doc.text(`Rejected`, margin + 100, currentY + 4);
      doc.setTextColor(0, 0, 0);
    }
  } else {
    const poData = data as PurchaseOrderData;
    doc.setFontSize(8);
    
    doc.text(`Raised By:`, margin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${poData.approver.firstName || ''} ${poData.approver.lastName || ''}`, margin, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(poData.approver.role || 'Finance Team', margin, currentY + 8);
    doc.text(format(new Date(poData.purchaseOrder.issueDate), 'MMM dd, yyyy'), margin, currentY + 12);
    
    doc.setFontSize(8);
    doc.text(`Original Requisition:`, margin + 100, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(poData.requisition.requisitionNumber, margin + 100, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Requested by: ${poData.requisition.requestedById}`, margin + 100, currentY + 8);
    doc.text(format(new Date(poData.requisition.requestDate), 'MMM dd, yyyy'), margin + 100, currentY + 12);
  }
  
  currentY += 18;
  
  // Footer with generation timestamp - positioned at bottom of page
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy h:mm a')}`, pageWidth - 60, currentY);
  
  return Buffer.from(doc.output('arraybuffer'));
}