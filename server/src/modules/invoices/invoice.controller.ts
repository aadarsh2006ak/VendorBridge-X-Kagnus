import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from './invoice.service.js';
import {
  listInvoicesQuerySchema,
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  emailInvoiceSchema,
} from './invoice.schemas.js';

export class InvoiceController {
  public static async listInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listInvoicesQuerySchema.parse(req.query);
      const result = await InvoiceService.listInvoices(query, req.user!);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async getInvoiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const invoice = await InvoiceService.getInvoiceById(id, req.user!);
      res.status(200).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  public static async createFromPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createInvoiceSchema.parse(req.body);
      const invoice = await InvoiceService.createFromPurchaseOrder(input, req.user!, req.ip);
      res.status(201).json({
        message: 'Invoice generated successfully.',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const input = updateInvoiceStatusSchema.parse(req.body);
      const invoice = await InvoiceService.updateStatus(id, input, req.user!, req.ip);
      res.status(200).json({
        message: `Invoice status updated to ${input.status}.`,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { buffer, filename } = await InvoiceService.getPdfBuffer(id, req.user!);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  public static async emailInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const input = emailInvoiceSchema.parse(req.body);
      const result = await InvoiceService.emailInvoice(id, input, req.user!, req.ip);

      res.status(200).json({
        message: `Invoice email successfully dispatched to ${result.recipient}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
