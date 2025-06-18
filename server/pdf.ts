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
  const margin = 12;
  let currentY = 15;

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 30) {
      doc.addPage();
      addPageHeader(); // Add header to new page
      currentY = 55; // Start below header
      return true;
    }
    return false;
  };

  // Helper function to auto-scale text to fit width
  const autoScaleText = (text: string, maxWidth: number, startSize: number = 10): number => {
    let fontSize = startSize;
    doc.setFontSize(fontSize);

    while (doc.getTextWidth(text) > maxWidth && fontSize > 6) {
      fontSize -= 0.5;
      doc.setFontSize(fontSize);
    }

    return fontSize;
  };

  // Helper function to add header (logo and address) for any page
  const addPageHeader = () => {
    try {
      const logoPath = path.resolve('./public/Civcon Civils Logo.png');

      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath, { encoding: 'base64' });
        const imgData = `data:image/png;base64,${logoData}`;
        doc.addImage(imgData, 'PNG', 145, 8, 40, 16);
      } else {
        throw new Error('Logo file not found at: ' + logoPath);
      }
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('CIVCON CIVIL ENGINEERING', 140, 20);
    }

    // Add gap between logo and address
    doc.setFillColor(26, 82, 118); // Civcon blue background
    doc.rect(145, 32, 50, 22, 'F');

    // Add Civcon's address with white text on blue background
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255); // White text
    doc.text('Civcon Civil Engineering Ltd', 147, 36);
    doc.text('113 Brigshaw Drive', 147, 40);
    doc.text('Allerton Bywater, WF10 2HS', 147, 44);
    doc.text('Tel: 0800 002 5147', 147, 48);
    doc.text('info@civconcivils.co.uk', 147, 52);
    doc.setTextColor(0, 0, 0); // Reset to black
  };

  // Add header to first page
  addPageHeader();

  // Document header - left side
  currentY = 15;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(type === 'requisition' ? 'Purchase Requisition' : 'Purchase Order', margin, currentY);
  currentY += 7;

  // Document number with highlighting
  const documentNumber = type === 'requisition' 
    ? (data as RequisitionData).requisition.requisitionNumber 
    : (data as PurchaseOrderData).purchaseOrder.poNumber;

  if (type === 'purchaseOrder') {
    doc.setFillColor(255, 255, 200);
    doc.rect(margin, currentY - 2, 100, 8, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Purchase Order Number: ${documentNumber}`, margin, currentY + 3);
    currentY += 10;
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Requisition Number: ${documentNumber}`, margin, currentY);
    currentY += 7;
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
  currentY += 6;

  // Grid Layout: Supplier and Delivery Information side by side with Civcon colors
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

  // Calculate box height dynamically with auto-scaling
  const supplierContentHeight = 15 + (supplierAddressLines.length * 4) + (supplierContactLines.length * 4);
  const deliveryContentHeight = 15 + (deliveryAddressLines.length * 4) + (deliveryInstructionLines.length * 4) + 8;
  const gridBoxHeight = Math.max(supplierContentHeight, deliveryContentHeight, 45);

  checkPageBreak(gridBoxHeight + 8);

  // Grid dimensions
  const boxWidth = (pageWidth - (margin * 2) - 6) / 2; // 6px gap between boxes
  const leftBoxX = margin;
  const rightBoxX = margin + boxWidth + 6;

  // Supplier Information Box (Left) - Light Civcon blue
  doc.setFillColor(230, 240, 250); // Light blue background
  doc.rect(leftBoxX, currentY, boxWidth, gridBoxHeight, 'F');
  doc.setFillColor(26, 82, 118); // Civcon blue header
  doc.rect(leftBoxX, currentY, boxWidth, 8, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Supplier Information`, leftBoxX + 4, currentY + 5);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  let supplierY = currentY + 12;

  // Supplier name with auto-scaling and padding
  doc.setFont('helvetica', 'bold');
  const supplierNameSize = autoScaleText(data.supplier.name, boxWidth - 8, 9);
  doc.text(data.supplier.name, leftBoxX + 4, supplierY);
  doc.setFont('helvetica', 'normal');
  supplierY += 5;

  // Multi-line address with auto-scaling and padding
  doc.setFontSize(8);
  supplierAddressLines.forEach((line, index) => {
    if (line.trim()) {
      autoScaleText(line.trim(), boxWidth - 8, 8);
      doc.text(line.trim(), leftBoxX + 4, supplierY + (index * 4));
    }
  });
  supplierY += supplierAddressLines.length * 4 + 3;

  // Contact information with auto-scaling and padding
  supplierContactLines.forEach((line, index) => {
    autoScaleText(line, boxWidth - 8, 8);
    doc.text(line, leftBoxX + 4, supplierY + (index * 4));
  });

  // Delivery Information Box (Right) - Light gray with Civcon accent
  doc.setFillColor(245, 245, 245); // Light gray background
  doc.rect(rightBoxX, currentY, boxWidth, gridBoxHeight, 'F');
  doc.setFillColor(70, 130, 180); // Steel blue header
  doc.rect(rightBoxX, currentY, boxWidth, 8, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Delivery Information`, rightBoxX + 4, currentY + 5);
  doc.setTextColor(0, 0, 0);

  let deliveryY = currentY + 12;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Delivery Address with auto-scaling and padding
  doc.setFont('helvetica', 'bold');
  doc.text(`Address:`, rightBoxX + 4, deliveryY);
  doc.setFont('helvetica', 'normal');

  if (deliveryAddressLines.length > 0) {
    deliveryAddressLines.forEach((line, index) => {
      autoScaleText(line, boxWidth - 12, 8);
      doc.text(line, rightBoxX + 4, deliveryY + 4 + (index * 4));
    });
    deliveryY += deliveryAddressLines.length * 4 + 8;
  } else {
    deliveryY += 6;
  }

  // Required By Date with padding
  doc.setFont('helvetica', 'bold');
  doc.text(`Required By:`, rightBoxX + 4, deliveryY);
  doc.setFont('helvetica', 'normal');
  autoScaleText(format(new Date(deliveryData.deliveryDate), 'MMM dd, yyyy'), boxWidth - 32, 8);
  doc.text(format(new Date(deliveryData.deliveryDate), 'MMM dd, yyyy'), rightBoxX + 28, deliveryY);
  deliveryY += 5;

  // Delivery Instructions with padding
  if (deliveryInstructionLines.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Instructions:`, rightBoxX + 4, deliveryY);
    doc.setFont('helvetica', 'normal');

    deliveryInstructionLines.forEach((line, index) => {
      autoScaleText(line, boxWidth - 12, 8);
      doc.text(line, rightBoxX + 4, deliveryY + 4 + (index * 3.5));
    });
  }

  currentY += gridBoxHeight + 8;

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

  // Auto-scaling table with max 10 items per page
  const itemsPerPage = 10;
  const totalItems = tableRows.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const startIndex = pageIndex * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const pageItems = tableRows.slice(startIndex, endIndex);

    // Add new page if not the first iteration
    if (pageIndex > 0) {
      doc.addPage();
      addPageHeader();
      currentY = 55;

      // Add page title for continuation
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${type === 'requisition' ? 'Requisition' : 'Purchase Order'} Items (continued)`, margin, currentY);
      currentY += 6;
    }

    // Determine if this is the last page to include footer rows
    const isLastPage = pageIndex === totalPages - 1;
    const tableFooter = isLastPage ? footerRows : [];

    autoTable(doc, {
      startY: currentY,
      head: [tableColumns.map(col => col.header)],
      body: pageItems.map(row => tableColumns.map(col => row[col.dataKey as keyof typeof row])),
      foot: tableFooter,
      theme: 'striped',
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'auto'
      },
      headStyles: {
        fillColor: [26, 82, 118], // Civcon blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      footStyles: {
        fillColor: [230, 240, 250], // Light Civcon blue
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8
      },
      didDrawPage: (data) => {
        currentY = data.cursor?.y || currentY;
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Update currentY after table
  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Purchase Order specific sections
  if (type === 'purchaseOrder') {

    // Invoice submission instructions with proper sizing and text wrapping
    const instructionsText1 = `Please submit all invoices to: accounts.payable@civconcivils.co.uk`;
    const instructionsText2 = `Include this Purchase Order Number (${documentNumber}) in your invoice.`;
    const instructionsText3 = `Quote this PO number on all correspondence and delivery notes.`;

    // Calculate required height for all instructions
    const instructionsHeight = 32; // Increased height for better spacing

    doc.setFillColor(255, 248, 220); // Light yellow background for important instructions
    doc.rect(margin, currentY, pageWidth - (margin * 2), instructionsHeight, 'F');
    doc.setLineWidth(0.5);
    doc.setDrawColor(255, 165, 0); // Orange border
    doc.rect(margin, currentY, pageWidth - (margin * 2), instructionsHeight, 'S');

    // Title with proper spacing
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(204, 102, 0); // Dark orange text
    doc.text(`INVOICE SUBMISSION INSTRUCTIONS`, margin + 2, currentY + 6);

    // Instructions with auto-scaling and proper line spacing
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // Line 1: Email instruction
    autoScaleText(instructionsText1, pageWidth - (margin * 2) - 4, 8);
    doc.text(instructionsText1, margin + 2, currentY + 12);

    // Line 2: PO number instruction
    autoScaleText(instructionsText2, pageWidth - (margin * 2) - 4, 8);
    doc.text(instructionsText2, margin + 2, currentY + 17);

    // Line 3: Additional instruction
    autoScaleText(instructionsText3, pageWidth - (margin * 2) - 4, 8);
    doc.text(instructionsText3, margin + 2, currentY + 22);

    // Footer note
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(`Failure to include PO number may delay payment processing`, margin + 2, currentY + 27);
    doc.setTextColor(0, 0, 0);

    currentY += instructionsHeight + 4;

    // Terms section with properly sized web link
    const termsLinkText = `https://civconcivils.co.uk/wp-content/uploads/2025/02/Purchase-Order-Terms-and-Conditions.pdf`;
    const termsHeight = 18; // Increased height for better spacing

    doc.setFillColor(245, 245, 245); // Light gray background
    doc.rect(margin, currentY, pageWidth - (margin * 2), termsHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Terms and Conditions`, margin + 2, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`View full terms and conditions online:`, margin + 2, currentY + 10);

    // Auto-scale the URL to fit properly
    doc.setTextColor(26, 82, 118); // Civcon blue for link
    autoScaleText(termsLinkText, pageWidth - (margin * 2) - 4, 7);
    doc.text(termsLinkText, margin + 2, currentY + 14);
    doc.setTextColor(0, 0, 0);

    currentY += termsHeight + 2;
  } else {
    // Terms for requisitions with properly sized web link
    const reqTermsLinkText = `https://civconcivils.co.uk/wp-content/uploads/2025/02/Purchase-Order-Terms-and-Conditions.pdf`;
    const reqTermsHeight = 16; // Appropriate height for requisitions

    doc.setFillColor(245, 245, 245); // Light gray background
    doc.rect(margin, currentY, pageWidth - (margin * 2), reqTermsHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Terms and Conditions`, margin + 2, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`View full terms:`, margin + 2, currentY + 9);

    // Auto-scale the URL to fit properly
    doc.setTextColor(26, 82, 118); // Civcon blue for link
    autoScaleText(reqTermsLinkText, pageWidth - (margin * 2) - 4, 7);
    doc.text(reqTermsLinkText, margin + 2, currentY + 13);
    doc.setTextColor(0, 0, 0);

    currentY += reqTermsHeight + 2;
  }

  // Approval Section - compact design
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  if (type === 'requisition') {
    const requisitionData = data as RequisitionData;
    doc.setFontSize(9);

    // Left side - Requested By
    doc.text(`Raised By:`, margin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${requisitionData.user.firstName || ''} ${requisitionData.user.lastName || ''}`, margin, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(requisitionData.user.role || 'Requester', margin, currentY + 8);
    doc.text(format(new Date(requisitionData.requisition.requestDate), 'MMM dd, yyyy'), margin, currentY + 12);

    // Right side - Approved By
    doc.setFontSize(9);
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

    currentY += 18;
  } else {
    const poData = data as PurchaseOrderData;
    doc.setFontSize(9);

    // Left side - Issued By
    doc.text(`Raised By:`, margin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${poData.approver.firstName || ''} ${poData.approver.lastName || ''}`, margin, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(poData.approver.role || 'Finance Team', margin, currentY + 8);
    doc.text(format(new Date(poData.purchaseOrder.issueDate), 'MMM dd, yyyy'), margin, currentY + 12);

    // Right side - Original Requisition
    doc.setFontSize(9);
    doc.text(`Original Requisition:`, margin + 100, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(poData.requisition.requisitionNumber, margin + 100, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    // Get actual user name from requisition data
    const requestedByUser = type === 'purchaseOrder' 
      ? `${(data as PurchaseOrderData).requisition.requestedById}` // This should be the actual user name
      : `${(data as RequisitionData).user.firstName || ''} ${(data as RequisitionData).user.lastName || ''}`;
    doc.text(`Requested by: ${requestedByUser}`, margin + 100, currentY + 8);
    doc.text(format(new Date(poData.requisition.requestDate), 'MMM dd, yyyy'), margin + 100, currentY + 12);

    currentY += 18;
  }

  // Footer with generation timestamp - compact
  currentY += 3;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy h:mm a')}`, pageWidth - 60, currentY);

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
