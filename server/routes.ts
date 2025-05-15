import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import { z } from "zod";
import { insertProjectSchema, insertSupplierSchema, insertRequisitionSchema, insertRequisitionItemSchema, insertPurchaseOrderSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { generatePDF } from "./pdf";
import { sendEmail } from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/user', isAuthenticated, async (req: any, res) => {
    try {
      // User is already attached to req by passport
      // Don't send password back to client
      const { password, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectData = insertProjectSchema.parse({
        ...req.body,
        userId
      });
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const projectData = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(id, projectData);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(updatedProject);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const deleted = await storage.deleteProject(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Supplier routes
  app.get('/api/suppliers', isAuthenticated, async (_req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.get('/api/suppliers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid supplier ID" });
      }
      
      const supplier = await storage.getSupplier(id);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.post('/api/suppliers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const supplierData = insertSupplierSchema.parse({
        ...req.body,
        userId
      });
      
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.put('/api/suppliers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid supplier ID" });
      }
      
      const supplierData = insertSupplierSchema.partial().parse(req.body);
      const updatedSupplier = await storage.updateSupplier(id, supplierData);
      
      if (!updatedSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json(updatedSupplier);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete('/api/suppliers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid supplier ID" });
      }
      
      const deleted = await storage.deleteSupplier(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Requisition routes
  app.get('/api/requisitions', isAuthenticated, async (_req, res) => {
    try {
      const requisitions = await storage.getRequisitions();
      res.json(requisitions);
    } catch (error) {
      console.error("Error fetching requisitions:", error);
      res.status(500).json({ message: "Failed to fetch requisitions" });
    }
  });

  app.get('/api/requisitions/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid requisition ID" });
      }
      
      const requisition = await storage.getRequisition(id);
      if (!requisition) {
        return res.status(404).json({ message: "Requisition not found" });
      }
      
      const items = await storage.getRequisitionItems(requisition.id);
      
      res.json({ ...requisition, items });
    } catch (error) {
      console.error("Error fetching requisition:", error);
      res.status(500).json({ message: "Failed to fetch requisition" });
    }
  });

  app.post('/api/requisitions', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID properly (session-based auth doesn't have claims.sub)
      const userId = req.user.id;
      console.log('Creating requisition for user:', userId);
      
      // Validate requisition data
      const requisitionSchema = insertRequisitionSchema.extend({
        items: z.array(insertRequisitionItemSchema)
      });
      
      const { items, ...requisitionData } = requisitionSchema.parse({
        ...req.body,
        requestedById: userId
      });
      
      // Create the requisition
      const requisition = await storage.createRequisition(requisitionData, items);
      
      // Send email to finance team
      const project = await storage.getProject(requisitionData.projectId);
      const supplier = await storage.getSupplier(requisitionData.supplierId);
      const user = await storage.getUser(userId);
      
      if (project && supplier && user) {
        // Get the saved requisition items
        const savedItems = await storage.getRequisitionItems(requisition.id);
        
        // Generate PDF
        const pdfBuffer = await generatePDF('requisition', {
          requisition,
          items: savedItems,
          project,
          supplier,
          user
        });
        
        // Send email
        await sendEmail({
          to: 'finance@civcon.example.com',
          subject: `New Purchase Requisition: ${requisition.requisitionNumber}`,
          text: `A new purchase requisition (${requisition.requisitionNumber}) has been submitted by ${user.firstName} ${user.lastName} for project ${project.name}. Please review and approve.`,
          html: `
            <h1>New Purchase Requisition</h1>
            <p>A new purchase requisition has been submitted with the following details:</p>
            <ul>
              <li><strong>Requisition Number:</strong> ${requisition.requisitionNumber}</li>
              <li><strong>Project:</strong> ${project.name} (${project.contractNumber})</li>
              <li><strong>Supplier:</strong> ${supplier.name}</li>
              <li><strong>Requested By:</strong> ${user.firstName} ${user.lastName}</li>
              <li><strong>Amount:</strong> $${requisition.totalAmount}</li>
            </ul>
            <p>Please review and approve this requisition.</p>
          `,
          attachments: [
            {
              filename: `${requisition.requisitionNumber}.pdf`,
              content: pdfBuffer
            }
          ]
        });
      }
      
      res.status(201).json(requisition);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating requisition:", error);
      res.status(500).json({ message: "Failed to create requisition" });
    }
  });

  app.put('/api/requisitions/:id/status', isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid requisition ID" });
      }
      
      const { status } = req.body;
      if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const requisition = await storage.getRequisition(id);
      if (!requisition) {
        return res.status(404).json({ message: "Requisition not found" });
      }
      
      // Update requisition status
      const updatedRequisition = await storage.updateRequisition(id, { status });
      
      // If approved, create a purchase order
      if (status === 'approved') {
        // Get user ID properly
        const userId = req.user.id;
        console.log('Approving requisition with user:', userId);
        const user = await storage.getUser(userId);
        
        // Generate purchase order only if it doesn't exist already
        const existingPO = await storage.getPurchaseOrderByRequisition(id);
        if (!existingPO) {
          // Create purchase order
          const purchaseOrderData = {
            requisitionId: id,
            approvedById: userId,
            issueDate: new Date().toISOString().split('T')[0],
            status: 'issued',
            totalAmount: requisition.totalAmount,
          };
          
          const purchaseOrder = await storage.createPurchaseOrder(purchaseOrderData);
          
          // Send email to supplier and requester if purchase order was created
          const project = await storage.getProject(requisition.projectId);
          const supplier = await storage.getSupplier(requisition.supplierId);
          const requester = await storage.getUser(requisition.requestedById);
          const items = await storage.getRequisitionItems(requisition.id);
          
          if (project && supplier && requester && user) {
            // Generate PDF
            const pdfBuffer = await generatePDF('purchaseOrder', {
              purchaseOrder,
              requisition,
              items,
              project,
              supplier,
              approver: user
            });
            
            // Send email to supplier
            await sendEmail({
              to: supplier.email,
              subject: `Purchase Order: ${purchaseOrder.poNumber}`,
              text: `A new purchase order (${purchaseOrder.poNumber}) has been issued for ${project.name}. Please see attached PDF for details.`,
              html: `
                <h1>Purchase Order: ${purchaseOrder.poNumber}</h1>
                <p>Dear ${supplier.name},</p>
                <p>We are pleased to issue the attached purchase order for the following:</p>
                <ul>
                  <li><strong>Purchase Order Number:</strong> ${purchaseOrder.poNumber}</li>
                  <li><strong>Project:</strong> ${project.name} (${project.contractNumber})</li>
                  <li><strong>Total Amount:</strong> $${purchaseOrder.totalAmount}</li>
                </ul>
                <p>Please review the attached purchase order for complete details.</p>
                <p>Regards,<br>Civcon Office</p>
              `,
              attachments: [
                {
                  filename: `${purchaseOrder.poNumber}.pdf`,
                  content: pdfBuffer
                }
              ]
            });
            
            // Send email to requester
            await sendEmail({
              to: requester.email || 'requester@example.com',
              subject: `Your Requisition ${requisition.requisitionNumber} has been approved`,
              text: `Your purchase requisition (${requisition.requisitionNumber}) has been approved and Purchase Order ${purchaseOrder.poNumber} has been issued.`,
              html: `
                <h1>Requisition Approved</h1>
                <p>Dear ${requester.firstName || 'User'},</p>
                <p>We are pleased to inform you that your purchase requisition has been approved:</p>
                <ul>
                  <li><strong>Requisition Number:</strong> ${requisition.requisitionNumber}</li>
                  <li><strong>Purchase Order Number:</strong> ${purchaseOrder.poNumber}</li>
                  <li><strong>Project:</strong> ${project.name}</li>
                  <li><strong>Supplier:</strong> ${supplier.name}</li>
                  <li><strong>Total Amount:</strong> $${purchaseOrder.totalAmount}</li>
                </ul>
                <p>A purchase order has been generated and sent to the supplier.</p>
                <p>Regards,<br>Civcon Office</p>
              `,
              attachments: [
                {
                  filename: `${purchaseOrder.poNumber}.pdf`,
                  content: pdfBuffer
                }
              ]
            });
          }
          
          // Return both the updated requisition and the new purchase order
          return res.json({ 
            requisition: updatedRequisition, 
            purchaseOrder 
          });
        }
      } else if (status === 'rejected') {
        // Send email notification about rejection
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        const requester = await storage.getUser(requisition.requestedById);
        const project = await storage.getProject(requisition.projectId);
        
        if (requester && project && user) {
          // Send rejection email to requester
          await sendEmail({
            to: requester.email || 'requester@example.com',
            subject: `Your Requisition ${requisition.requisitionNumber} has been rejected`,
            text: `Your purchase requisition (${requisition.requisitionNumber}) has been rejected.`,
            html: `
              <h1>Requisition Rejected</h1>
              <p>Dear ${requester.firstName || 'User'},</p>
              <p>We regret to inform you that your purchase requisition has been rejected:</p>
              <ul>
                <li><strong>Requisition Number:</strong> ${requisition.requisitionNumber}</li>
                <li><strong>Project:</strong> ${project.name}</li>
                <li><strong>Total Amount:</strong> $${requisition.totalAmount}</li>
              </ul>
              <p>Please contact the finance department if you need more information.</p>
              <p>Regards,<br>Civcon Office</p>
            `
          });
        }
      }
      
      res.json(updatedRequisition);
    } catch (error) {
      console.error("Error updating requisition status:", error);
      res.status(500).json({ message: "Failed to update requisition status" });
    }
  });

  // Purchase Order routes
  app.get('/api/purchase-orders', isAuthenticated, async (_req, res) => {
    try {
      const purchaseOrders = await storage.getPurchaseOrders();
      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get('/api/purchase-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase order ID" });
      }
      
      const purchaseOrder = await storage.getPurchaseOrder(id);
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      const requisition = await storage.getRequisition(purchaseOrder.requisitionId);
      const items = await storage.getRequisitionItems(purchaseOrder.requisitionId);
      
      res.json({ ...purchaseOrder, requisition, items });
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.post('/api/purchase-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user is in finance team
      if (user?.role !== 'finance') {
        return res.status(403).json({ message: "Only finance team members can create purchase orders" });
      }
      
      const purchaseOrderData = insertPurchaseOrderSchema.parse({
        ...req.body,
        approvedById: userId
      });
      
      // Check if requisition exists
      const requisition = await storage.getRequisition(purchaseOrderData.requisitionId);
      if (!requisition) {
        return res.status(404).json({ message: "Requisition not found" });
      }
      
      // Check if requisition already has a purchase order
      const existingPO = await storage.getPurchaseOrderByRequisition(purchaseOrderData.requisitionId);
      if (existingPO) {
        return res.status(400).json({ message: "This requisition already has a purchase order" });
      }
      
      // Create the purchase order
      const purchaseOrder = await storage.createPurchaseOrder(purchaseOrderData);
      
      // Send email to supplier and requester
      const project = await storage.getProject(requisition.projectId);
      const supplier = await storage.getSupplier(requisition.supplierId);
      const requester = await storage.getUser(requisition.requestedById);
      const items = await storage.getRequisitionItems(requisition.id);
      
      if (project && supplier && requester) {
        // Generate PDF
        const pdfBuffer = await generatePDF('purchaseOrder', {
          purchaseOrder,
          requisition,
          items,
          project,
          supplier,
          approver: user
        });
        
        // Send email to supplier
        await sendEmail({
          to: supplier.email,
          subject: `Purchase Order: ${purchaseOrder.poNumber}`,
          text: `A new purchase order (${purchaseOrder.poNumber}) has been issued for ${project.name}. Please see attached PDF for details.`,
          html: `
            <h1>Purchase Order: ${purchaseOrder.poNumber}</h1>
            <p>Dear ${supplier.name},</p>
            <p>We are pleased to issue the attached purchase order for the following:</p>
            <ul>
              <li><strong>Purchase Order Number:</strong> ${purchaseOrder.poNumber}</li>
              <li><strong>Project:</strong> ${project.name} (${project.contractNumber})</li>
              <li><strong>Total Amount:</strong> $${purchaseOrder.totalAmount}</li>
            </ul>
            <p>Please review the attached purchase order for complete details.</p>
            <p>Regards,<br>Civcon Office</p>
          `,
          attachments: [
            {
              filename: `${purchaseOrder.poNumber}.pdf`,
              content: pdfBuffer
            }
          ]
        });
        
        // Send email to requester
        await sendEmail({
          to: requester.email || 'requester@example.com',
          subject: `Your Requisition ${requisition.requisitionNumber} has been approved`,
          text: `Your purchase requisition (${requisition.requisitionNumber}) has been approved and Purchase Order ${purchaseOrder.poNumber} has been issued.`,
          html: `
            <h1>Requisition Approved</h1>
            <p>Your purchase requisition (${requisition.requisitionNumber}) has been approved.</p>
            <p>Purchase Order ${purchaseOrder.poNumber} has been issued to ${supplier.name}.</p>
            <p>Please see the attached purchase order for details.</p>
          `,
          attachments: [
            {
              filename: `${purchaseOrder.poNumber}.pdf`,
              content: pdfBuffer
            }
          ]
        });
      }
      
      res.status(201).json(purchaseOrder);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  // Reports routes
  app.get('/api/reports/project-expenditures', isAuthenticated, async (_req, res) => {
    try {
      const data = await storage.getProjectExpenditures();
      res.json(data);
    } catch (error) {
      console.error("Error fetching project expenditures:", error);
      res.status(500).json({ message: "Failed to fetch project expenditures" });
    }
  });

  app.get('/api/reports/requisition-status', isAuthenticated, async (_req, res) => {
    try {
      const data = await storage.getRequisitionsByStatus();
      res.json(data);
    } catch (error) {
      console.error("Error fetching requisition status data:", error);
      res.status(500).json({ message: "Failed to fetch requisition status data" });
    }
  });

  app.get('/api/reports/top-suppliers', isAuthenticated, async (_req, res) => {
    try {
      const data = await storage.getTopSuppliers(5);
      res.json(data);
    } catch (error) {
      console.error("Error fetching top suppliers:", error);
      res.status(500).json({ message: "Failed to fetch top suppliers" });
    }
  });

  app.get('/api/reports/monthly-trend', isAuthenticated, async (_req, res) => {
    try {
      const data = await storage.getMonthlyPurchaseTrend();
      res.json(data);
    } catch (error) {
      console.error("Error fetching monthly trend:", error);
      res.status(500).json({ message: "Failed to fetch monthly trend" });
    }
  });

  // Password reset route
  app.post('/api/reset-password', async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      
      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email and new password are required" });
      }
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security reasons, don't reveal if email exists or not
        return res.status(200).json({ message: "If your email is registered, a password reset link will be sent." });
      }
      
      // In a real app, we might send an email with a token here
      // But for this implementation, we'll directly update the password
      
      // Hash the password before storing it
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the password using storage's method
      const updatedUser = await storage.updateUserPassword(user.id, hashedPassword);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "An error occurred while resetting the password" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
