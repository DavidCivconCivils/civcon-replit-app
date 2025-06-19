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

  // User management routes (admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      const users = await storage.getUsers();
      // Don't send passwords back to client
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(req.body.password);
      
      // Create the user
      const userData = {
        ...req.body,
        password: hashedPassword,
      };
      
      const newUser = await storage.createUser(userData);
      
      // Don't send password back to client
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      const userId = req.params.id;
      
      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let userData = { ...req.body };
      
      // If password is provided and not empty, hash it
      if (userData.password && userData.password.trim() !== '') {
        console.log(`Updating password for user ${userId}`);
        userData.password = await hashPassword(userData.password);
        console.log('Password hashed successfully');
      } else {
        // Remove password field if it's empty or undefined
        console.log(`No password update for user ${userId} - removing password field`);
        delete userData.password;
      }
      
      // Remove confirmPassword field as it's not in the database
      delete userData.confirmPassword;
      
      // Update the user
      console.log('Updating user with data:', { ...userData, password: userData.password ? '[REDACTED]' : undefined });
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        console.error('Failed to update user - no user returned from storage');
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      console.log('User updated successfully:', updatedUser.id);
      
      // Don't send password back to client
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      const userId = req.params.id;
      
      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow deleting yourself
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Delete the user
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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
      // Projects should not be tied to users, just create them in the system
      const projectData = insertProjectSchema.parse(req.body);
      
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
      // Suppliers should not be tied to users, just create them in the system
      const supplierData = insertSupplierSchema.parse(req.body);
      
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
  
  // Supplier Items routes
  app.get('/api/suppliers/:id/items', isAuthenticated, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      if (isNaN(supplierId)) {
        return res.status(400).json({ message: "Invalid supplier ID" });
      }
      
      const items = await storage.getSupplierItems(supplierId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching supplier items:", error);
      res.status(500).json({ message: "Failed to fetch supplier items" });
    }
  });
  
  app.post('/api/suppliers/:id/items', isAuthenticated, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      if (isNaN(supplierId)) {
        return res.status(400).json({ message: "Invalid supplier ID" });
      }
      
      const itemData = {
        ...req.body,
        supplierId
      };
      
      const newItem = await storage.createSupplierItem(itemData);
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating supplier item:", error);
      res.status(500).json({ message: "Failed to create supplier item" });
    }
  });
  
  app.put('/api/supplier-items/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      
      const updatedItem = await storage.updateSupplierItem(id, req.body);
      if (!updatedItem) {
        return res.status(404).json({ message: "Supplier item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating supplier item:", error);
      res.status(500).json({ message: "Failed to update supplier item" });
    }
  });
  
  app.delete('/api/supplier-items/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      
      const success = await storage.deleteSupplierItem(id);
      if (!success) {
        return res.status(404).json({ message: "Supplier item not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting supplier item:", error);
      res.status(500).json({ message: "Failed to delete supplier item" });
    }
  });

  // Requisition routes
  app.get('/api/requisitions', isAuthenticated, async (req: any, res) => {
    try {
      // Get all requisitions
      const requisitions = await storage.getRequisitions();
      
      // Filter requisitions based on user role
      let filteredRequisitions;
      
      if (req.user.role === 'admin' || req.user.role === 'finance') {
        // Admin and finance see all requisitions
        filteredRequisitions = requisitions;
      } else {
        // Regular users only see their own requisitions
        filteredRequisitions = requisitions.filter(requisition => requisition.requestedById === req.user.id);
      }
      
      res.json(filteredRequisitions);
    } catch (error) {
      console.error("Error fetching requisitions:", error);
      res.status(500).json({ message: "Failed to fetch requisitions" });
    }
  });
  
  // Get requisition by ID with all related data
  app.get('/api/requisitions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid requisition ID" });
      }
      
      // Get the requisition
      const requisition = await storage.getRequisition(id);
      if (!requisition) {
        return res.status(404).json({ message: "Requisition not found" });
      }
      
      // Check user permission (admin/finance see all, others only see their own)
      if (req.user.role !== 'admin' && req.user.role !== 'finance' && requisition.requestedById !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to view this requisition" });
      }
      
      // Get related data
      const project = await storage.getProject(requisition.projectId);
      const supplier = await storage.getSupplier(requisition.supplierId);
      const requestedBy = await storage.getUser(requisition.requestedById);
      const items = await storage.getRequisitionItems(requisition.id);
      
      // Remove sensitive info from user
      const { password, ...userWithoutPassword } = requestedBy || {};
      
      // Construct the complete requisition object with all related data
      const requisitionWithDetails = {
        ...requisition,
        project,
        supplier,
        user: userWithoutPassword,
        items
      };
      
      res.json(requisitionWithDetails);
    } catch (error) {
      console.error("Error fetching requisition details:", error);
      res.status(500).json({ message: "Failed to fetch requisition details" });
    }
  });
  
  // PDF Generation endpoint
  app.get('/api/requisitions/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid requisition ID" });
      }
      
      // Get all required data
      const requisition = await storage.getRequisition(id);
      if (!requisition) {
        return res.status(404).json({ message: "Requisition not found" });
      }
      
      const project = await storage.getProject(requisition.projectId);
      const supplier = await storage.getSupplier(requisition.supplierId);
      const user = await storage.getUser(requisition.requestedById);
      const items = await storage.getRequisitionItems(requisition.id);
      
      if (!project || !supplier || !user || !items.length) {
        return res.status(400).json({ 
          message: "Missing required data to generate PDF",
          details: {
            hasProject: !!project,
            hasSupplier: !!supplier,
            hasUser: !!user,
            itemCount: items.length
          }
        });
      }
      
      // Generate the PDF
      const pdfBuffer = await generatePDF('requisition', {
        requisition,
        items,
        project,
        supplier,
        user
      });
      
      // Set the response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="requisition-${requisition.requisitionNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send the PDF
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF", error: String(error) });
    }
  });

  // Email a requisition to finance
  app.post('/api/requisitions/:id/email', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid requisition ID" });
      }
      
      // Get all required data
      const requisition = await storage.getRequisition(id);
      if (!requisition) {
        return res.status(404).json({ message: "Requisition not found" });
      }
      
      const project = await storage.getProject(requisition.projectId);
      const supplier = await storage.getSupplier(requisition.supplierId);
      const user = await storage.getUser(requisition.requestedById);
      const items = await storage.getRequisitionItems(requisition.id);
      
      if (!project || !supplier || !user || !items.length) {
        return res.status(400).json({ 
          message: "Missing required data to email requisition",
          details: {
            hasProject: !!project,
            hasSupplier: !!supplier,
            hasUser: !!user,
            itemCount: items.length
          }
        });
      }
      
      // Generate PDF
      const pdfBuffer = await generatePDF('requisition', {
        requisition,
        items,
        project,
        supplier,
        user
      });
      
      // Send email to procurement and CC requester
      const procurementEmail = 'procurement@civconcivils.co.uk';
      const requesterEmail = user.email;
      
      console.log(`Sending requisition email to: ${procurementEmail}, CC: ${requesterEmail}`);
      
      const emailResult = await sendEmail({
        to: procurementEmail,
        cc: requesterEmail,
        subject: `New Purchase Requisition: ${requisition.requisitionNumber}`,
        text: `A new purchase requisition (${requisition.requisitionNumber}) has been submitted by ${user.firstName || ''} ${user.lastName || ''} for project ${project.name}. Please review for procurement processing.`,
        html: `
          <h1>New Purchase Requisition</h1>
          <p>A new purchase requisition has been submitted with the following details:</p>
          <ul>
            <li><strong>Requisition Number:</strong> ${requisition.requisitionNumber}</li>
            <li><strong>Project:</strong> ${project.name} (${project.contractNumber || 'No contract number'})</li>
            <li><strong>Supplier:</strong> ${supplier.name}</li>
            <li><strong>Requested By:</strong> ${user.firstName || ''} ${user.lastName || ''} (${user.email})</li>
            <li><strong>Amount:</strong> £${requisition.totalAmount}</li>
          </ul>
          <p>Please review this requisition for procurement processing.</p>
          <p>For any questions, please contact Civcon Office.</p>
        `,
        attachments: [
          {
            filename: `${requisition.requisitionNumber}.pdf`,
            content: pdfBuffer
          }
        ]
      });
      
      if (emailResult.success) {
        res.json({ 
          success: true, 
          message: "Requisition emailed successfully to procurement and requester",
          recipients: [procurementEmail, requesterEmail].filter(Boolean)
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send requisition email", 
          error: emailResult.error 
        });
      }
    } catch (error) {
      console.error("Error sending requisition email:", error);
      res.status(500).json({ success: false, message: "Failed to send email", error: String(error) });
    }
  });

  app.get('/api/requisitions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid requisition ID" });
      }
      
      console.log(`Fetching requisition details for ID: ${id}`);
      
      // Get the requisition
      const requisition = await storage.getRequisition(id);
      if (!requisition) {
        return res.status(404).json({ message: "Requisition not found" });
      }
      
      // Check user permission (admin/finance see all, others only see their own)
      if (req.user.role !== 'admin' && req.user.role !== 'finance' && requisition.requestedById !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to view this requisition" });
      }
      
      // Fetch related data
      console.log(`Fetching related data for requisition ${requisition.requisitionNumber}`);
      const items = await storage.getRequisitionItems(requisition.id);
      const project = requisition.projectId ? await storage.getProject(requisition.projectId) : null;
      const supplier = requisition.supplierId ? await storage.getSupplier(requisition.supplierId) : null;
      const user = requisition.requestedById ? await storage.getUser(requisition.requestedById) : null;
      
      // Remove sensitive info from user data
      let userData = null;
      if (user) {
        const { password, ...userWithoutPassword } = user;
        userData = userWithoutPassword;
      }
      
      // Construct response object
      const responseData = {
        ...requisition,
        items: items || [],
        project: project || {},
        supplier: supplier || {},
        user: userData
      };
      
      console.log(`Sending response data for requisition ${requisition.requisitionNumber}`);
      console.log(`Response has project: ${!!responseData.project}, supplier: ${!!responseData.supplier}, items: ${responseData.items.length}`);
      
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching requisition:", error);
      res.status(500).json({ message: "Failed to fetch requisition" });
    }
  });

  app.post('/api/requisitions', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID properly (session-based auth doesn't have claims.sub)
      const userId = req.user.id;
      
      // Validate requisition data
      const requisitionSchema = insertRequisitionSchema.extend({
        items: z.array(insertRequisitionItemSchema.extend({
          // Parse quantity as a number explicitly
          quantity: z.coerce.number().int().positive()
        }))
      });
      
      const { items, ...requisitionData } = requisitionSchema.parse({
        ...req.body,
        requestedById: userId
      });
      
      // Create the requisition
      const requisition = await storage.createRequisition(requisitionData, items);
      
      // Return response immediately
      res.status(201).json(requisition);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error creating requisition:", fromZodError(error).message);
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating requisition:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace available');
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(500).json({ 
        message: "Failed to create requisition", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update requisition (full update for finance/admin)
  app.put('/api/requisitions/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid requisition ID" });
      }

      // Check if user has permission to edit requisitions
      const userRole = req.user.role;
      if (userRole !== 'admin' && userRole !== 'finance') {
        return res.status(403).json({ message: "Insufficient permissions to edit requisitions" });
      }

      // Validate requisition data
      const requisitionSchema = insertRequisitionSchema.extend({
        items: z.array(insertRequisitionItemSchema.extend({
          quantity: z.coerce.number().int().positive()
        }))
      });

      const { items, ...requisitionData } = requisitionSchema.parse(req.body);

      // Check if requisition exists
      const existingRequisition = await storage.getRequisition(id);
      if (!existingRequisition) {
        return res.status(404).json({ message: "Requisition not found" });
      }

      // Update the requisition
      const updatedRequisition = await storage.updateRequisition(id, requisitionData);
      if (!updatedRequisition) {
        return res.status(404).json({ message: "Failed to update requisition" });
      }

      // Delete existing items and insert new ones
      await storage.deleteRequisitionItems(id);
      if (items.length > 0) {
        await storage.createRequisitionItems(id, items);
      }

      // Return updated requisition
      res.json(updatedRequisition);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating requisition:", error);
      res.status(500).json({ message: "Failed to update requisition" });
    }
  });

  app.put('/api/requisitions/:id/status', isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid requisition ID" });
      }
      
      const { status, poNumber, rejectionReason } = req.body;
      if (!status || !['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      // If approving, require a PO number
      if (status === 'approved' && !poNumber) {
        return res.status(400).json({ message: "Purchase Order number is required for approval" });
      }
      
      // If rejecting, require a reason
      if (status === 'rejected' && !rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      const requisition = await storage.getRequisition(id);
      if (!requisition) {
        return res.status(404).json({ message: "Requisition not found" });
      }
      
      // Check if the current user is the one who created the requisition
      const isRequester = requisition.requestedById === req.user.id;
      const isFinanceOrAdmin = ['finance', 'admin'].includes(req.user.role);
      
      // Only allow approval/rejection by the requisition creator or finance/admin users
      if (!isRequester && !isFinanceOrAdmin) {
        return res.status(403).json({ message: "You don't have permission to update this requisition" });
      }
      
      // Update requisition status (and rejection reason if applicable)
      const updateData: any = { status };
      if (status === 'rejected' && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
      
      const updatedRequisition = await storage.updateRequisition(id, updateData);
      
      // If approved, create a purchase order
      if (status === 'approved') {
        // Get user ID properly
        const userId = req.user.id;
        console.log('Approving requisition with user:', userId);
        const user = await storage.getUser(userId);
        
        // Generate purchase order only if it doesn't exist already
        const existingPO = await storage.getPurchaseOrderByRequisition(id);
        if (!existingPO) {
          // Create purchase order with the provided PO number
          const purchaseOrderData = {
            requisitionId: id,
            approvedById: userId,
            issueDate: new Date().toISOString().split('T')[0],
            status: 'issued',
            totalAmount: requisition.totalAmount,
            poNumber // Use the provided PO number instead of generating one
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
        // Handle both standard auth and claims-based auth
        const userId = req.user.id || req.user.claims?.sub;
        const user = await storage.getUser(userId);
        const requester = await storage.getUser(requisition.requestedById);
        const project = await storage.getProject(requisition.projectId);
        
        if (requester && project && user) {
          // Send rejection email to requester with reason
          await sendEmail({
            to: requester.email || 'requester@example.com',
            subject: `Your Requisition ${requisition.requisitionNumber} has been rejected`,
            text: `Your purchase requisition (${requisition.requisitionNumber}) has been rejected. Reason: ${rejectionReason}`,
            html: `
              <h1>Requisition Rejected</h1>
              <p>Dear ${requester.firstName || 'User'},</p>
              <p>We regret to inform you that your purchase requisition has been rejected:</p>
              <ul>
                <li><strong>Requisition Number:</strong> ${requisition.requisitionNumber}</li>
                <li><strong>Project:</strong> ${project.name}</li>
                <li><strong>Total Amount:</strong> $${requisition.totalAmount}</li>
              </ul>
              <p><strong>Reason for rejection:</strong> ${rejectionReason}</p>
              <p>If you need any clarification, please contact the finance department.</p>
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

  app.get('/api/purchase-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase order ID" });
      }
      
      // Get the purchase order
      const purchaseOrder = await storage.getPurchaseOrder(id);
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Get the related requisition
      const requisition = await storage.getRequisition(purchaseOrder.requisitionId);
      if (!requisition) {
        return res.status(404).json({ message: "Related requisition not found" });
      }
      
      // Check user permission (admin/finance see all, others only see their own)
      if (req.user.role !== 'admin' && req.user.role !== 'finance' && requisition.requestedById !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to view this purchase order" });
      }
      
      // Get all related data
      const project = await storage.getProject(requisition.projectId);
      const supplier = await storage.getSupplier(requisition.supplierId);
      const approver = await storage.getUser(purchaseOrder.approvedById);
      const requestedBy = await storage.getUser(requisition.requestedById);
      const items = await storage.getRequisitionItems(requisition.id);
      
      // Remove sensitive info from users
      let approverData = null;
      if (approver) {
        const { password, ...approverWithoutPassword } = approver;
        approverData = approverWithoutPassword;
      }
      
      let requesterData = null;
      if (requestedBy) {
        const { password, ...requesterWithoutPassword } = requestedBy;
        requesterData = requesterWithoutPassword;
      }
      
      // Construct the complete purchase order object with all related data
      const purchaseOrderWithDetails = {
        ...purchaseOrder,
        requisition,
        project,
        supplier,
        items,
        user: approverData,
        requestedBy: requesterData
      };
      
      res.json(purchaseOrderWithDetails);
    } catch (error) {
      console.error("Error fetching purchase order details:", error);
      res.status(500).json({ message: "Failed to fetch purchase order details" });
    }
  });
  
  // Generate PDF for purchase order
  app.get('/api/purchase-orders/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase order ID" });
      }
      
      // Get the purchase order
      const purchaseOrder = await storage.getPurchaseOrder(id);
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Get the related requisition
      const requisition = await storage.getRequisition(purchaseOrder.requisitionId);
      if (!requisition) {
        return res.status(404).json({ message: "Related requisition not found" });
      }
      
      // Get all related data
      const project = await storage.getProject(requisition.projectId);
      const supplier = await storage.getSupplier(requisition.supplierId);
      const approver = await storage.getUser(purchaseOrder.approvedById);
      const items = await storage.getRequisitionItems(requisition.id);
      
      if (!project || !supplier || !approver || !items.length) {
        return res.status(400).json({ 
          message: "Missing required data to generate PDF",
          details: {
            hasProject: !!project,
            hasSupplier: !!supplier,
            hasApprover: !!approver,
            itemCount: items.length
          }
        });
      }
      
      // Generate the PDF
      const pdfBuffer = await generatePDF('purchaseOrder', {
        purchaseOrder,
        requisition,
        items,
        project,
        supplier,
        approver
      });
      
      // Set the response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="purchase-order-${purchaseOrder.poNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send the PDF
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF", error: String(error) });
    }
  });
  
  // Email a purchase order to supplier
  app.post('/api/purchase-orders/:id/email', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase order ID" });
      }
      
      const purchaseOrder = await storage.getPurchaseOrder(id);
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Get all required data
      const requisition = await storage.getRequisition(purchaseOrder.requisitionId);
      const project = await storage.getProject(requisition.projectId);
      const supplier = await storage.getSupplier(requisition.supplierId);
      const user = await storage.getUser(req.user.id || req.user.claims?.sub);
      const items = await storage.getRequisitionItems(requisition.id);
      
      if (!project || !supplier || !user || !items.length) {
        return res.status(400).json({ 
          message: "Missing required data to email purchase order",
          details: {
            hasProject: !!project,
            hasSupplier: !!supplier,
            hasUser: !!user,
            itemCount: items.length
          }
        });
      }
      
      // Generate PDF
      const pdfBuffer = await generatePDF('purchaseOrder', {
        purchaseOrder,
        requisition,
        items,
        project,
        supplier,
        approver: user
      });
      
      // Get the requester (person who raised the requisition)
      const requester = await storage.getUser(requisition.requestedById);
      if (!requester) {
        return res.status(400).json({ message: "Requester not found" });
      }
      
      // Define recipients
      const procurementEmail = 'procurement@civconcivils.co.uk';
      const requesterEmail = requester.email;
      
      console.log(`Sending purchase order email to: ${supplier.email}, ${procurementEmail}, ${requesterEmail}`);
      
      // Send email to supplier, procurement team, and requester
      const emailResult = await sendEmail({
        to: supplier.email,
        // Add CC for procurement team and requester
        cc: [procurementEmail, requesterEmail].filter(Boolean).join(','),
        subject: `Purchase Order: ${purchaseOrder.poNumber}`,
        text: `A purchase order (${purchaseOrder.poNumber}) has been issued for ${project.name}. Please see attached PDF for details.`,
        html: `
          <h1>Purchase Order: ${purchaseOrder.poNumber}</h1>
          <p>Dear ${supplier.name},</p>
          <p>We are pleased to issue the attached purchase order for the following:</p>
          <ul>
            <li><strong>Purchase Order Number:</strong> ${purchaseOrder.poNumber}</li>
            <li><strong>Project:</strong> ${project.name} (${project.contractNumber || 'No contract number'})</li>
            <li><strong>Total Amount:</strong> £${purchaseOrder.totalAmount}</li>
          </ul>
          <p>Please review the attached purchase order for complete details.</p>
          <p>For any questions, please contact us at ${procurementEmail}.</p>
          <p>Regards,<br>Civcon Office</p>
        `,
        attachments: [
          {
            filename: `${purchaseOrder.poNumber}.pdf`,
            content: pdfBuffer
          }
        ]
      });
      
      if (emailResult.success) {
        res.json({ 
          message: "Purchase order emailed successfully to supplier, procurement team, and requester",
          recipients: [supplier.email, procurementEmail, requesterEmail].filter(Boolean)
        });
      } else {
        res.status(500).json({ 
          message: "Failed to email purchase order", 
          error: emailResult.error
        });
      }
    } catch (error) {
      console.error("Error emailing purchase order:", error);
      res.status(500).json({ message: "Failed to email purchase order" });
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

  // Update purchase order
  app.put('/api/purchase-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase order ID" });
      }

      // Check if user is finance or admin
      if (req.user.role !== 'admin' && req.user.role !== 'finance') {
        return res.status(403).json({ message: "Only admin and finance users can update purchase orders" });
      }

      // Validate the request body
      const updateSchema = z.object({
        poNumber: z.string().min(1).optional(),
        issueDate: z.string().optional(),
        status: z.enum(["draft", "issued", "received", "cancelled"]).optional(),
        totalAmount: z.string().optional(),
        items: z.array(z.object({
          id: z.number().optional(),
          description: z.string().min(1),
          quantity: z.coerce.number().int().positive(),
          unit: z.string().min(1),
          unitPrice: z.coerce.number().positive(),
        })).optional(),
      });

      const validatedData = updateSchema.parse(req.body);

      // Get existing purchase order
      const existingOrder = await storage.getPurchaseOrder(id);
      if (!existingOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      // If items are being updated, handle requisition items update
      if (validatedData.items) {
        // Get the purchase order to find related requisition
        const purchaseOrder = await storage.getPurchaseOrder(id);
        if (!purchaseOrder) {
          return res.status(404).json({ message: "Purchase order not found" });
        }

        // Update requisition items
        await storage.deleteRequisitionItems(purchaseOrder.requisitionId);
        await storage.createRequisitionItems(purchaseOrder.requisitionId, validatedData.items);

        // Calculate total from items if not provided
        if (!validatedData.totalAmount && validatedData.items.length > 0) {
          const total = validatedData.items.reduce((sum, item) => {
            return sum + (item.quantity * item.unitPrice);
          }, 0);
          validatedData.totalAmount = total.toFixed(2);
        }

        // Also update the related requisition's total
        await storage.updateRequisition(purchaseOrder.requisitionId, {
          totalAmount: validatedData.totalAmount
        });
      }

      // Update the purchase order (excluding items from the data)
      const { items, ...purchaseOrderData } = validatedData;
      const updatedOrder = await storage.updatePurchaseOrder(id, purchaseOrderData);
      if (!updatedOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      res.json(updatedOrder);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating purchase order:", error);
      res.status(500).json({ message: "Failed to update purchase order" });
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
  
  app.get('/api/reports/user-expenditures', isAuthenticated, async (_req, res) => {
    try {
      const data = await storage.getUserExpenditures();
      res.json(data);
    } catch (error) {
      console.error("Error fetching user expenditures:", error);
      res.status(500).json({ message: "Failed to fetch user expenditures" });
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
