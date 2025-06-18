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
  // Create PDF with compression options and proper page management
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
  
  // Add company information block with logo
  try {
    const logoPath = path.resolve('./public/Civcon Civils Logo.png');
    console.log('Using logo path:', logoPath);
    
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath, { encoding: 'base64' });
      const imgData = `data:image/png;base64,${logoData}`;
      doc.addImage(imgData, 'PNG', 140, 10, 50, 20);
      console.log('Logo added to PDF successfully');
    } else {
      throw new Error('Logo file not found at: ' + logoPath);
    }
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CIVCON CIVIL ENGINEERING', 140, 20);
  }
  
  // Add Civcon's address (right side)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Civcon Civil Engineering Ltd', 140, 32);
  doc.text('113 Brigshaw Drive', 140, 37);
  doc.text('Allerton Bywater, Castleford', 140, 42);
  doc.text('WF10 2HS', 140, 47);
  doc.text('Tel: 01252 717700', 140, 52);
  doc.text('Email: info@civconcivils.co.uk', 140, 57);
  
  // Document header - left side
  currentY = 20;
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(type === 'requisition' ? 'Purchase Requisition' : 'Purchase Order', margin, currentY);
  currentY += 8;
  
  // Document number with highlighting
  const documentNumber = type === 'requisition' 
    ? (data as RequisitionData).requisition.requisitionNumber 
    : (data as PurchaseOrderData).purchaseOrder.poNumber;
  
  if (type === 'purchaseOrder') {
    doc.setFillColor(255, 255, 200);
    doc.rect(margin, currentY - 2, 100, 9, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Purchase Order Number: ${documentNumber}`, margin, currentY + 4);
    currentY += 12;
  } else {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Requisition Number: ${documentNumber}`, margin, currentY);
    currentY += 8;
  }
  
  // Project & Date Info section
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const project = data.project;
  doc.text(`Project:`, margin, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(`${project.name} (${project.contractNumber})`, margin + 26, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 6;
  
  doc.text(`Date:`, margin, currentY);
  doc.setFont('helvetica', 'bold');
  const date = type === 'requisition' 
    ? format(new Date((data as RequisitionData).requisition.requestDate), 'MMM dd, yyyy')
    : format(new Date((data as PurchaseOrderData).purchaseOrder.issueDate), 'MMM dd, yyyy');
  doc.text(date, margin + 26, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 6;
  
  if (type === 'requisition') {
    const requisitionData = data as RequisitionData;
    doc.text(`Requested By:`, margin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${requisitionData.user.firstName || ''} ${requisitionData.user.lastName || ''}`, margin + 26, currentY);
    doc.setFont('helvetica', 'normal');
  } else {
    const poData = data as PurchaseOrderData;
    doc.text(`Approved By:`, margin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${poData.approver.firstName || ''} ${poData.approver.lastName || ''}`, margin + 26, currentY);
    doc.setFont('helvetica', 'normal');
  }
  currentY += 6;
  
  doc.text(`Status:`, margin, currentY);
  doc.setFont('helvetica', 'bold');
  const status = type === 'requisition' 
    ? (data as RequisitionData).requisition.status
    : (data as PurchaseOrderData).purchaseOrder.status;
  doc.text(status.charAt(0).toUpperCase() + status.slice(1), margin + 26, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 8;
  
  // Supplier Information section with dynamic sizing
  checkPageBreak(40);
  
  const supplierAddressLines = data.supplier.address.split('\n').filter(line => line.trim());
  const supplierContactLines = [
    data.supplier.email ? `Email: ${data.supplier.email}` : '',
    data.supplier.phone ? `Phone: ${data.supplier.phone}` : '',
    data.supplier.contactPerson ? `Contact: ${data.supplier.contactPerson}` : ''
  ].filter(line => line);
  
  const supplierBoxHeight = 15 + (supplierAddressLines.length * 4) + (supplierContactLines.length * 4);
  
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, currentY, pageWidth - (margin * 2), supplierBoxHeight, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Supplier Information`, margin + 2, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  let supplierY = currentY + 11;
  
  // Supplier name
  doc.setFont('helvetica', 'bold');
  doc.text(data.supplier.name, margin + 2, supplierY);
  doc.setFont('helvetica', 'normal');
  supplierY += 5;
  
  // Multi-line address
  supplierAddressLines.forEach((line, index) => {
    if (line.trim()) {
      doc.text(line.trim(), margin + 2, supplierY + (index * 4));
    }
  });
  supplierY += supplierAddressLines.length * 4 + 2;
  
  // Contact information
  supplierContactLines.forEach((line, index) => {
    doc.text(line, margin + 2, supplierY + (index * 4));
  });
  
  currentY += supplierBoxHeight + 8;
  
  // Items Table section
  checkPageBreak(60); // Ensure table has enough space
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${type === 'requisition' ? 'Requisition' : 'Purchase Order'} Items`, margin, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 5;
  
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
  
  // Calculate subtotal (pre-VAT)
  const subtotal = data.items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice.toString()) || 0;
    return sum + (quantity * unitPrice);
  }, 0).toFixed(2);
  
  // Calculate VAT amounts by type
  let vat20Amount = 0;
  let vatCisAmount = 0;
  
  data.items.forEach(item => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice.toString()) || 0;
    const itemSubtotal = quantity * unitPrice;
    
    if (item.vatType === "VAT 20%" || !item.vatType) { // Default to 20% if not specified
      vat20Amount += itemSubtotal * 0.2;
    } else if (item.vatType === "20% RC CIS (0%)") {
      vatCisAmount += itemSubtotal * 0.2;
    }
    // VAT 0% doesn't add any VAT
  });
  
  // Total amount includes VAT
  const totalAmount = (parseFloat(subtotal) + vat20Amount).toFixed(2);
  
  // Create footer rows according to VAT types used
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
    headStyles: {
      fillColor: [26, 82, 118],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    didDrawPage: (data) => {
      currentY = data.cursor?.y || currentY;
    }
  });
  
  // Update currentY after table
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Delivery Info section
  const deliveryData = type === 'requisition' 
    ? (data as RequisitionData).requisition 
    : (data as PurchaseOrderData).requisition;
  
  // Calculate delivery box content
  let deliveryAddressLines: string[] = [];
  let deliveryInstructionLines: string[] = [];
  
  if (deliveryData.deliveryAddress) {
    deliveryAddressLines = deliveryData.deliveryAddress.split(',').map(line => line.trim()).filter(line => line);
  }
  
  if (deliveryData.deliveryInstructions && deliveryData.deliveryInstructions.trim()) {
    deliveryInstructionLines = deliveryData.deliveryInstructions.split('\n').map(line => line.trim()).filter(line => line);
  }
  
  const deliveryBoxHeight = Math.max(35, 15 + (deliveryAddressLines.length * 4) + (deliveryInstructionLines.length * 4) + 8);
  
  // Check if delivery section fits on current page
  checkPageBreak(deliveryBoxHeight + 20);
  
  // Delivery Information Box
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, currentY, pageWidth - (margin * 2), deliveryBoxHeight, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Delivery Information`, margin + 2, currentY + 6);
  
  let deliveryY = currentY + 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Delivery Address
  doc.text(`Address:`, margin + 2, deliveryY);
  
  if (deliveryAddressLines.length > 0) {
    deliveryAddressLines.forEach((line, index) => {
      doc.text(line, margin + 32, deliveryY + (index * 4));
    });
    deliveryY += deliveryAddressLines.length * 4 + 4;
  } else {
    deliveryY += 6;
  }
  
  // Required By Date
  doc.text(`Required By:`, margin + 2, deliveryY);
  doc.text(format(new Date(deliveryData.deliveryDate), 'MMM dd, yyyy'), margin + 32, deliveryY);
  deliveryY += 6;
  
  // Delivery Instructions
  if (deliveryInstructionLines.length > 0) {
    doc.text(`Instructions:`, margin + 2, deliveryY);
    
    deliveryInstructionLines.forEach((line, index) => {
      doc.text(line, margin + 32, deliveryY + 2 + (index * 4));
    });
  }
  
  currentY += deliveryBoxHeight + 10;
  
  // Terms and Invoice submission section
  if (type === 'purchaseOrder') {
    // Check if we need space for invoice submission box
    checkPageBreak(45);
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 25, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice Submission Instructions`, margin + 2, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Please submit all invoices to: accounts.payable@civconcivils.co.uk`, margin + 2, currentY + 12);
    doc.text(`Include this Purchase Order Number (${documentNumber}) in your invoice.`, margin + 2, currentY + 17);
    
    currentY += 30;
    
    // Terms section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Terms and Conditions`, margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 255);
    doc.text(`View full terms and conditions online:`, margin, currentY + 6);
    doc.text(`https://civconcivils.co.uk/wp-content/uploads/2025/02/Purchase-Order-Terms-and-Conditions.pdf`, margin, currentY + 11);
    doc.setTextColor(0, 0, 0);
    
    currentY += 20;
  } else {
    // Terms for requisitions
    checkPageBreak(40);
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 40, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Terms and Conditions`, margin + 2, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`1. All prices quoted must include delivery to the specified location.`, margin + 2, currentY + 12);
    doc.text(`2. The supplier must notify Civcon of any anticipated delays immediately.`, margin + 2, currentY + 17);
    doc.text(`3. Payment terms are net 30 days from the date of receipt of goods or services.`, margin + 2, currentY + 22);
    doc.text(`4. All goods delivered must match the specifications outlined in this document.`, margin + 2, currentY + 27);
    doc.text(`5. Civcon reserves the right to reject any goods that do not meet the required standards.`, margin + 2, currentY + 32);
    
    currentY += 45;
  }
  
  // Approval Section
  const approvalY = type === 'purchaseOrder' ? termsStartY + 50 : termsStartY + 45;
  doc.setLineWidth(0.5);
  doc.line(14, approvalY, 194, approvalY);
  
  if (type === 'requisition') {
    const requisitionData = data as RequisitionData;
    doc.setFontSize(10);
    
    doc.text(`Requested By:`, 14, approvalY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${requisitionData.user.firstName || ''} ${requisitionData.user.lastName || ''}`, 14, approvalY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(requisitionData.user.role || 'Requester', 14, approvalY + 17);
    doc.text(format(new Date(requisitionData.requisition.requestDate), 'MMM dd, yyyy'), 14, approvalY + 22);
    
    doc.setFontSize(10);
    doc.text(`Approved By:`, 120, approvalY + 6);
    
    if (requisitionData.requisition.status === 'pending') {
      doc.setFont('helvetica', 'italic');
      doc.text(`Pending Approval`, 120, approvalY + 12);
    } else if (requisitionData.requisition.status === 'approved') {
      doc.setFont('helvetica', 'bold');
      doc.text(`Finance Team`, 120, approvalY + 12);
    } else if (requisitionData.requisition.status === 'rejected') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 53, 69);
      doc.text(`Rejected`, 120, approvalY + 12);
      doc.setTextColor(0, 0, 0);
    }
  } else {
    const poData = data as PurchaseOrderData;
    doc.setFontSize(10);
    
    doc.text(`Issued By:`, 14, approvalY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${poData.approver.firstName || ''} ${poData.approver.lastName || ''}`, 14, approvalY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(poData.approver.role || 'Finance Team', 14, approvalY + 17);
    doc.text(format(new Date(poData.purchaseOrder.issueDate), 'MMM dd, yyyy'), 14, approvalY + 22);
    
    doc.setFontSize(10);
    doc.text(`Original Requisition:`, 120, approvalY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(poData.requisition.requisitionNumber, 120, approvalY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Requested by: ${poData.requisition.requestedById}`, 120, approvalY + 17);
    doc.text(format(new Date(poData.requisition.requestDate), 'MMM dd, yyyy'), 120, approvalY + 22);
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
  try {
    // Convert to string output, which is supported by jsPDF
    const base64Data = doc.output('datauristring').split(',')[1];
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('Error generating PDF buffer:', error);
    return Buffer.from([]); // Fallback empty buffer in case of error
  }
}
