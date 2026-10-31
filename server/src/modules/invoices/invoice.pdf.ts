import PDFDocument from 'pdfkit';

export interface InvoicePdfData {
  invoiceNumber: string;
  poNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  buyer: {
    name: string;
    address: string;
    gstin: string;
  };
  vendor: {
    name: string;
    address: string;
    gstin: string;
    contactEmail: string;
    contactPhone: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
  }>;
  financials: {
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    taxAmount: number;
    grandTotal: number;
  };
}

export function generateInvoicePdfBuffer(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    const emerald = '#15803D';
    const darkBg = '#121614';
    const textPrimary = '#111827';
    const textSecondary = '#4B5563';
    const borderGray = '#E5E7EB';

    // Header Branding
    doc.rect(40, 40, 515, 60).fill('#0B0D0C');
    doc.fontSize(20).fillColor('#FFFFFF').text('VendorBridge', 55, 52, { continued: true });
    doc.fontSize(10).fillColor('#22C55E').text('   ERP & PROCUREMENT', { baseline: 'bottom' });

    doc.fontSize(14).fillColor('#FFFFFF').text('PURCHASE ORDER & INVOICE', 300, 52, {
      align: 'right',
      width: 240,
    });
    doc.fontSize(9).fillColor('#9CA3AF').text(data.invoiceNumber, 300, 72, {
      align: 'right',
      width: 240,
    });

    // 2-Column Meta Box (Bill to & Vendor)
    const metaTop = 115;
    doc.rect(40, metaTop, 515, 115).lineWidth(1).strokeColor(borderGray).stroke();
    doc.moveTo(297, metaTop).lineTo(297, metaTop + 115).strokeColor(borderGray).stroke();

    // Left Column: Bill To
    doc.fontSize(9).fillColor(emerald).text('BILL TO:', 55, metaTop + 12);
    doc.fontSize(11).fillColor(textPrimary).font('Helvetica-Bold').text(data.buyer.name, 55, metaTop + 26);
    doc.fontSize(9).fillColor(textSecondary).font('Helvetica').text(data.buyer.address, 55, metaTop + 42);
    doc.text(`GSTIN: ${data.buyer.gstin}`, 55, metaTop + 58);

    doc.fontSize(9).fillColor(textSecondary).text(`PO Number: ${data.poNumber}`, 55, metaTop + 80);
    doc.text(`Invoice Date: ${data.invoiceDate}`, 55, metaTop + 96);

    // Right Column: Vendor
    doc.fontSize(9).fillColor(emerald).text('VENDOR:', 310, metaTop + 12);
    doc.fontSize(11).fillColor(textPrimary).font('Helvetica-Bold').text(data.vendor.name, 310, metaTop + 26);
    doc.fontSize(9).fillColor(textSecondary).font('Helvetica').text(data.vendor.address, 310, metaTop + 42);
    doc.text(`GSTIN: ${data.vendor.gstin}`, 310, metaTop + 58);

    doc.fontSize(9).fillColor(textSecondary).text(`Due Date: ${data.dueDate}`, 310, metaTop + 80);
    const statusColor = data.status === 'PAID' ? '#16A34A' : '#D97706';
    doc.fillColor(statusColor).font('Helvetica-Bold').text(`Status: ${data.status.replace('_', ' ')}`, 310, metaTop + 96);

    // Table Header
    const tableTop = 245;
    doc.rect(40, tableTop, 515, 24).fill('#F3F4F6');
    doc.fontSize(9).fillColor(textPrimary).font('Helvetica-Bold');
    doc.text('ITEM DESCRIPTION', 50, tableTop + 7, { width: 220 });
    doc.text('QTY', 280, tableTop + 7, { width: 50, align: 'center' });
    doc.text('UNIT PRICE', 350, tableTop + 7, { width: 80, align: 'right' });
    doc.text('TOTAL (INR)', 450, tableTop + 7, { width: 90, align: 'right' });

    // Table Rows
    let currentY = tableTop + 26;
    doc.font('Helvetica').fontSize(9).fillColor(textPrimary);

    data.items.forEach((item, index) => {
      const isZebra = index % 2 === 1;
      if (isZebra) {
        doc.rect(40, currentY, 515, 22).fill('#F9FAFB');
      }

      doc.fillColor(textPrimary);
      doc.text(item.name, 50, currentY + 6, { width: 220, ellipsis: true });
      doc.text(`${item.quantity} ${item.unit}`, 280, currentY + 6, { width: 50, align: 'center' });
      doc.text(`₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 350, currentY + 6, {
        width: 80,
        align: 'right',
      });
      doc.text(`₹${item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 450, currentY + 6, {
        width: 90,
        align: 'right',
      });

      currentY += 22;
    });

    // Divider Line
    doc.moveTo(40, currentY + 5).lineTo(555, currentY + 5).strokeColor(borderGray).stroke();
    currentY += 15;

    // Financial Breakdown Table (Right aligned)
    const summaryX = 330;
    const summaryWidth = 210;

    const printRow = (label: string, value: number, isBold: boolean = false, isEmerald: boolean = false) => {
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isBold ? 11 : 9);
      doc.fillColor(isEmerald ? emerald : textPrimary);
      doc.text(label, summaryX, currentY, { width: 100 });
      doc.text(`₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 100, currentY, {
        width: 110,
        align: 'right',
      });
      currentY += isBold ? 20 : 16;
    };

    printRow('Subtotal:', data.financials.subtotal);
    printRow('CGST (9%):', data.financials.cgstAmount);
    printRow('SGST (9%):', data.financials.sgstAmount);

    doc.moveTo(summaryX, currentY + 2).lineTo(summaryX + summaryWidth, currentY + 2).strokeColor(emerald).lineWidth(1.5).stroke();
    currentY += 6;

    printRow('Grand Total:', data.financials.grandTotal, true, true);

    // Footer
    const footerY = 750;
    doc.rect(40, footerY, 515, 1).strokeColor(borderGray).stroke();
    doc.fontSize(8).fillColor('#9CA3AF').text(
      'This is a computer-generated procurement invoice from VendorBridge ERP. No physical signature is required.',
      40,
      footerY + 8,
      { align: 'center', width: 515 }
    );

    doc.end();
  });
}
