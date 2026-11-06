import { prisma } from '../../lib/prisma.js';
import { ReportsSummaryQuery } from './reports.schemas.js';

export class ReportsService {
  /**
   * Calculates overall procurement KPI statistics based on stored records.
   */
  public static async getProcurementSummary(query: ReportsSummaryQuery) {
    const [
      totalPOs,
      posSum,
      totalInvoices,
      invoicesSum,
      paidInvoices,
      paidSum,
      activeRfqsCount,
      totalVendorsCount,
      approvalsCount,
      approvedCount,
    ] = await Promise.all([
      prisma.purchaseOrder.count(),
      prisma.purchaseOrder.aggregate({
        _sum: { grandTotal: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      prisma.invoice.count(),
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { status: 'PAID' },
      }),
      prisma.rfq.count({ where: { status: { in: ['OPEN', 'QUOTATION_SELECTED'] } } }),
      prisma.vendor.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.approvalRequest.count(),
      prisma.approvalRequest.count({ where: { status: 'APPROVED' } }),
    ]);

    const totalSpend = Number(posSum._sum.grandTotal || 0);
    const totalInvoiced = Number(invoicesSum._sum.grandTotal || 0);
    const totalPaid = Number(paidSum._sum.grandTotal || 0);
    const pendingPaymentAmount = Math.max(0, totalInvoiced - totalPaid);

    const approvalRate = approvalsCount > 0 ? Math.round((approvedCount / approvalsCount) * 100) : 100;

    return {
      totalSpend,
      totalInvoiced,
      totalPaid,
      pendingPaymentAmount,
      totalPOs,
      totalInvoices,
      paidInvoicesCount: paidInvoices,
      pendingInvoicesCount: totalInvoices - paidInvoices,
      activeRfqsCount,
      totalVendorsCount,
      approvalRate,
    };
  }

  /**
   * Generates monthly spending trends for the last N months.
   */
  public static async getMonthlySpendingTrends(monthsCount = 6) {
    const now = new Date();
    const months: Array<{
      key: string;
      label: string;
      startDate: Date;
      endDate: Date;
    }> = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth();
      const key = `${year}-${String(monthNum + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const startDate = new Date(year, monthNum, 1);
      const endDate = new Date(year, monthNum + 1, 0, 23, 59, 59, 999);

      months.push({ key, label, startDate, endDate });
    }

    const trends = await Promise.all(
      months.map(async (m) => {
        const [poAgg, invAgg, paidAgg] = await Promise.all([
          prisma.purchaseOrder.aggregate({
            where: {
              createdAt: { gte: m.startDate, lte: m.endDate },
              status: { not: 'CANCELLED' },
            },
            _sum: { grandTotal: true },
            _count: { id: true },
          }),
          prisma.invoice.aggregate({
            where: {
              createdAt: { gte: m.startDate, lte: m.endDate },
              status: { not: 'CANCELLED' },
            },
            _sum: { grandTotal: true },
            _count: { id: true },
          }),
          prisma.invoice.aggregate({
            where: {
              paidAt: { gte: m.startDate, lte: m.endDate },
              status: 'PAID',
            },
            _sum: { grandTotal: true },
          }),
        ]);

        return {
          month: m.key,
          label: m.label,
          poAmount: Number(poAgg._sum.grandTotal || 0),
          poCount: poAgg._count.id || 0,
          invoiceAmount: Number(invAgg._sum.grandTotal || 0),
          paidAmount: Number(paidAgg._sum.grandTotal || 0),
        };
      })
    );

    return trends;
  }

  /**
   * Aggregates procurement spending by category.
   */
  public static async getCategoryBreakdown() {
    const pos = await prisma.purchaseOrder.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: {
        rfq: {
          select: { category: true },
        },
      },
    });

    const categoryMap = new Map<string, { totalAmount: number; count: number }>();
    let totalAllSpend = 0;

    for (const po of pos) {
      const category = po.rfq?.category || 'General';
      const amount = Number(po.grandTotal);
      totalAllSpend += amount;

      const current = categoryMap.get(category) || { totalAmount: 0, count: 0 };
      categoryMap.set(category, {
        totalAmount: current.totalAmount + amount,
        count: current.count + 1,
      });
    }

    const results = Array.from(categoryMap.entries()).map(([category, data]) => {
      const percentage = totalAllSpend > 0 ? Number(((data.totalAmount / totalAllSpend) * 100).toFixed(1)) : 0;
      return {
        category,
        totalAmount: data.totalAmount,
        count: data.count,
        percentage,
      };
    });

    // Sort descending by total amount
    results.sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      totalSpend: totalAllSpend,
      categories: results,
    };
  }

  /**
   * Generates vendor performance rankings based on orders, rating, and spend.
   */
  public static async getVendorPerformance(limit = 10) {
    const vendors = await prisma.vendor.findMany({
      where: { deletedAt: null },
      include: {
        purchaseOrders: {
          where: { status: { not: 'CANCELLED' } },
          select: { grandTotal: true, status: true },
        },
        quotations: {
          select: { status: true },
        },
      },
    });

    const performance = vendors.map((v) => {
      const totalOrders = v.purchaseOrders.length;
      const totalSpend = v.purchaseOrders.reduce((sum, po) => sum + Number(po.grandTotal), 0);
      const totalQuotes = v.quotations.length;
      const wonQuotes = v.quotations.filter((q) => q.status === 'APPROVED').length;
      const winRate = totalQuotes > 0 ? Math.round((wonQuotes / totalQuotes) * 100) : 0;

      return {
        vendorId: v.id,
        name: v.name,
        category: v.category,
        gstNumber: v.gstNumber,
        rating: v.rating ?? 4.0,
        totalOrders,
        totalSpend,
        totalQuotes,
        wonQuotes,
        winRate,
      };
    });

    // Sort descending by total spend then rating
    performance.sort((a, b) => b.totalSpend - a.totalSpend || (b.rating ?? 0) - (a.rating ?? 0));

    return performance.slice(0, limit);
  }

  /**
   * Exports authoritative report data as CSV.
   */
  public static async exportReportCsv(type: 'spend' | 'vendors' | 'purchase_orders' | 'invoices') {
    switch (type) {
      case 'spend': {
        const trends = await this.getMonthlySpendingTrends(12);
        const headers = ['Month', 'Label', 'PO Spend (INR)', 'PO Count', 'Invoice Amount (INR)', 'Settled / Paid (INR)'];
        const rows = trends.map((t) => [
          t.month,
          `"${t.label}"`,
          t.poAmount.toFixed(2),
          t.poCount,
          t.invoiceAmount.toFixed(2),
          t.paidAmount.toFixed(2),
        ]);
        return {
          filename: `Procurement_Spend_Report_${new Date().toISOString().split('T')[0]}.csv`,
          csv: [headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
        };
      }

      case 'vendors': {
        const vendors = await this.getVendorPerformance(50);
        const headers = ['Vendor Name', 'Category', 'GSTIN', 'Rating', 'Total Orders', 'Total Spend (INR)', 'Quotations Submitted', 'Win Rate (%)'];
        const rows = vendors.map((v) => [
          `"${v.name}"`,
          `"${v.category}"`,
          `"${v.gstNumber}"`,
          v.rating,
          v.totalOrders,
          v.totalSpend.toFixed(2),
          v.totalQuotes,
          `${v.winRate}%`,
        ]);
        return {
          filename: `Vendor_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`,
          csv: [headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
        };
      }

      case 'purchase_orders': {
        const pos = await prisma.purchaseOrder.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            vendor: { select: { name: true } },
            rfq: { select: { code: true, title: true } },
            items: true,
          },
        });
        const headers = ['PO Number', 'Issue Date', 'Vendor', 'RFQ Code', 'RFQ Title', 'Line Items Count', 'Subtotal (INR)', 'Tax Amount (INR)', 'Grand Total (INR)', 'Status'];
        const rows = pos.map((po) => [
          `"${po.poNumber}"`,
          po.issueDate ? po.issueDate.toISOString().split('T')[0] : po.createdAt.toISOString().split('T')[0],
          `"${po.vendor?.name || 'N/A'}"`,
          `"${po.rfq?.code || 'N/A'}"`,
          `"${po.rfq?.title || 'N/A'}"`,
          po.items.length,
          Number(po.subtotal).toFixed(2),
          Number(po.taxAmount).toFixed(2),
          Number(po.grandTotal).toFixed(2),
          po.status,
        ]);
        return {
          filename: `Purchase_Orders_Registry_${new Date().toISOString().split('T')[0]}.csv`,
          csv: [headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
        };
      }

      case 'invoices': {
        const invoices = await prisma.invoice.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            vendor: { select: { name: true } },
            purchaseOrder: { select: { poNumber: true } },
          },
        });
        const headers = ['Invoice Number', 'PO Reference', 'Vendor', 'Issue Date', 'Due Date', 'Paid Date', 'Subtotal (INR)', 'CGST 9% (INR)', 'SGST 9% (INR)', 'Grand Total (INR)', 'Status', 'Payment Ref'];
        const rows = invoices.map((inv) => [
          `"${inv.invoiceNumber}"`,
          `"${inv.purchaseOrder?.poNumber || 'N/A'}"`,
          `"${inv.vendor?.name || 'N/A'}"`,
          inv.invoiceDate.toISOString().split('T')[0],
          inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : 'N/A',
          inv.paidAt ? inv.paidAt.toISOString().split('T')[0] : 'Unpaid',
          Number(inv.subtotal).toFixed(2),
          Number(inv.cgstAmount).toFixed(2),
          Number(inv.sgstAmount).toFixed(2),
          Number(inv.grandTotal).toFixed(2),
          inv.status,
          `"${inv.paymentReference || 'N/A'}"`,
        ]);
        return {
          filename: `Invoices_Registry_${new Date().toISOString().split('T')[0]}.csv`,
          csv: [headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
        };
      }
    }
  }
}
