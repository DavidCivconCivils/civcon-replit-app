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
  // Create PDF with compression options
  const doc = new jsPDF({
    compress: true,
    putOnlyUsedFonts: true,
    precision: 2
  });
  
  // Add company information block with logo
  try {
    // Get absolute path to logo file
    const logoPath = path.resolve('./public/Civcon Civils Logo.png');
    console.log('Using logo path:', logoPath);
    
    // Check if file exists
    if (fs.existsSync(logoPath)) {
      // Read the file as base64
      const logoData = fs.readFileSync(logoPath, { encoding: 'base64' });
      const imgData = `data:image/png;base64,${logoData}`;
      
      // Add image using base64 data with normal quality
      doc.addImage(imgData, 'PNG', 140, 10, 50, 20);
      console.log('Logo added to PDF successfully');
    } else {
      throw new Error('Logo file not found at: ' + logoPath);
    }
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
    // Fallback text if logo can't be loaded
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CIVCON CIVIL ENGINEERING', 140, 20);
  }
  
  // Add Civcon's address
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Civcon Civil Engineering Ltd', 140, 32);
  doc.text('113 Brigshaw Drive', 140, 37);
  doc.text('Allerton Bywater, Castleford', 140, 42);
  doc.text('WF10 2HS', 140, 47);
  doc.text('Tel: 01252 717700', 140, 52);
  doc.text('Email: info@civconcivils.co.uk', 140, 57);
  
  // Document header
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(type === 'requisition' ? 'Purchase Requisition' : 'Purchase Order', 14, 20);
  
  // Document number - make it more prominent with highlighting
  const documentNumber = type === 'requisition' 
    ? (data as RequisitionData).requisition.requisitionNumber 
    : (data as PurchaseOrderData).purchaseOrder.poNumber;
  
  if (type === 'purchaseOrder') {
    // Add highlight background for PO number (critical)
    doc.setFillColor(255, 255, 200); // Light yellow highlight
    doc.rect(14, 22, 100, 9, 'F');
    
    doc.setFontSize(14); // Larger font
    doc.setFont('helvetica', 'bold');
    doc.text(`Purchase Order Number: ${documentNumber}`, 14, 28);
  } else {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Requisition Number: ${documentNumber}`, 14, 26);
  }
  
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
  
  // Calculate supplier box height based on content
  const supplierAddressLines = data.supplier.address.split('\n').filter(line => line.trim());
  const supplierContactLines = [
    data.supplier.email ? `Email: ${data.supplier.email}` : '',
    data.supplier.phone ? `Phone: ${data.supplier.phone}` : '',
    data.supplier.contactPerson ? `Contact: ${data.supplier.contactPerson}` : ''
  ].filter(line => line);
  
  const supplierBoxHeight = 15 + (supplierAddressLines.length * 4) + (supplierContactLines.length * 4);
  
  // Extended Supplier Info box - dynamic height
  doc.setFillColor(240, 240, 240);
  doc.rect(14, 65, 180, supplierBoxHeight, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Supplier Information`, 16, 71);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  let supplierY = 76;
  
  // Supplier name
  doc.setFont('helvetica', 'bold');
  doc.text(data.supplier.name, 16, supplierY);
  doc.setFont('helvetica', 'normal');
  supplierY += 5;
  
  // Handle multi-line address properly
  supplierAddressLines.forEach((line, index) => {
    if (line.trim()) {
      doc.text(line.trim(), 16, supplierY + (index * 4));
    }
  });
  supplierY += supplierAddressLines.length * 4 + 2;
  
  // Add contact information below address
  supplierContactLines.forEach((line, index) => {
    doc.text(line, 16, supplierY + (index * 4));
  });
  
  // Items Table - position after supplier box
  const tableStartY = 65 + supplierBoxHeight + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${type === 'requisition' ? 'Requisition' : 'Purchase Order'} Items`, 14, tableStartY);
  doc.setFont('helvetica', 'normal');
  
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
    startY: tableStartY + 5,
    head: [tableColumns.map(col => col.header)],
    body: tableRows.map(row => tableColumns.map(col => row[col.dataKey as keyof typeof row])),
    foot: footerRows,
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
  const deliveryData = type === 'requisition' 
    ? (data as RequisitionData).requisition 
    : (data as PurchaseOrderData).requisition;
  
  // Calculate proper spacing and box height
  let deliveryContentHeight = 8; // Base height for header
  let deliveryAddressLines: string[] = [];
  let deliveryInstructionLines: string[] = [];
  
  // Process address
  if (deliveryData.deliveryAddress) {
    deliveryAddressLines = deliveryData.deliveryAddress.split(',').map(line => line.trim()).filter(line => line);
    deliveryContentHeight += Math.max(1, deliveryAddressLines.length) * 5 + 3; // Address lines + spacing
  }
  
  // Process instructions
  if (deliveryData.deliveryInstructions && deliveryData.deliveryInstructions.trim()) {
    deliveryInstructionLines = deliveryData.deliveryInstructions.split('\n').map(line => line.trim()).filter(line => line);
    deliveryContentHeight += Math.max(1, deliveryInstructionLines.length) * 5 + 6; // Instruction lines + spacing
  }
  
  deliveryContentHeight += 8; // Required By date + final spacing
  const deliveryBoxHeight = Math.max(35, deliveryContentHeight);
  
  // Delivery Information Box
  doc.setFillColor(250, 250, 250);
  doc.rect(14, finalY + 10, 180, deliveryBoxHeight, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Delivery Information`, 16, finalY + 16);
  
  let deliveryY = finalY + 22;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Delivery Address
  doc.text(`Address:`, 16, deliveryY);
  deliveryY += 2; // Move to next line for address content
  
  if (deliveryAddressLines.length > 0) {
    deliveryAddressLines.forEach((line, index) => {
      doc.text(line, 75, deliveryY + (index * 4));
    });
    deliveryY += deliveryAddressLines.length * 4 + 4;
  } else {
    deliveryY += 6;
  }
  
  // Required By Date
  doc.text(`Required By:`, 16, deliveryY);
  doc.text(format(new Date(deliveryData.deliveryDate), 'MMM dd, yyyy'), 75, deliveryY);
  deliveryY += 6;
  
  // Delivery Instructions
  if (deliveryInstructionLines.length > 0) {
    doc.text(`Instructions:`, 16, deliveryY);
    deliveryY += 2; // Move to next line for instruction content
    
    deliveryInstructionLines.forEach((line, index) => {
      // Split long lines properly
      if (line.length > 100) {
        const words = line.split(' ');
        let currentLine = '';
        let lineCount = 0;
        
        for (const word of words) {
          if ((currentLine + word + ' ').length <= 100) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            if (currentLine) {
              doc.text(currentLine, 75, deliveryY + (lineCount * 4));
              lineCount++;
              currentLine = word;
            }
          }
        }
        
        if (currentLine) {
          doc.text(currentLine, 75, deliveryY + (lineCount * 4));
          lineCount++;
        }
        
        deliveryY += lineCount * 4;
      } else {
        doc.text(line, 75, deliveryY + (index * 4));
        if (index === deliveryInstructionLines.length - 1) {
          deliveryY += (index + 1) * 4;
        }
      }
    });
  }
  
  // Calculate dynamic positioning based on delivery information size
  const termsStartY = finalY + 15 + deliveryBoxHeight;
  
  // Invoice Submission and Terms Information
  if (type === 'purchaseOrder') {
    doc.setFillColor(240, 240, 240);
    doc.rect(14, termsStartY, 180, 25, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice Submission Instructions`, 16, termsStartY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Please submit all invoices to: accounts.payable@civconcivils.co.uk`, 16, termsStartY + 12);
    doc.text(`Include this Purchase Order Number (${documentNumber}) in your invoice.`, 16, termsStartY + 17);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Terms and Conditions`, 16, termsStartY + 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 255); // Blue color for link
    doc.text(`View full terms and conditions online:`, 16, termsStartY + 34);
    doc.text(`https://civconcivils.co.uk/wp-content/uploads/2025/02/Purchase-Order-Terms-and-Conditions.pdf`, 16, termsStartY + 39);
    doc.setTextColor(0, 0, 0); // Reset to black
  } else {
    // Keep original terms for requisitions
    doc.setFillColor(240, 240, 240);
    doc.rect(14, termsStartY, 180, 40, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Terms and Conditions`, 16, termsStartY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`1. All prices quoted must include delivery to the specified location.`, 16, termsStartY + 12);
    doc.text(`2. The supplier must notify Civcon of any anticipated delays immediately.`, 16, termsStartY + 17);
    doc.text(`3. Payment terms are net 30 days from the date of receipt of goods or services.`, 16, termsStartY + 22);
    doc.text(`4. All goods delivered must match the specifications outlined in this document.`, 16, termsStartY + 27);
    doc.text(`5. Civcon reserves the right to reject any goods that do not meet the required standards.`, 16, termsStartY + 32);
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
