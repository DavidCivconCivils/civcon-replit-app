import { 
  users, 
  projects, 
  suppliers, 
  requisitions, 
  requisitionItems, 
  purchaseOrders,
  supplierItems,
  type User, 
  type UpsertUser,
  type Project,
  type InsertProject,
  type Supplier,
  type InsertSupplier,
  type Requisition,
  type InsertRequisition,
  type RequisitionItem,
  type InsertRequisitionItem,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type SupplierItem,
  type InsertSupplierItem,
  type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { format } from "date-fns";
import * as crypto from "crypto";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Project operations
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Supplier operations
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;
  
  // Supplier Items operations
  getSupplierItems(supplierId: number): Promise<SupplierItem[]>;
  getSupplierItem(id: number): Promise<SupplierItem | undefined>;
  createSupplierItem(item: InsertSupplierItem): Promise<SupplierItem>;
  updateSupplierItem(id: number, item: Partial<InsertSupplierItem>): Promise<SupplierItem | undefined>;
  deleteSupplierItem(id: number): Promise<boolean>;
  
  // Requisition operations
  getRequisitions(): Promise<Requisition[]>;
  getRequisition(id: number): Promise<Requisition | undefined>;
  getRequisitionByNumber(number: string): Promise<Requisition | undefined>;
  getRequisitionsByUser(userId: string): Promise<Requisition[]>;
  createRequisition(requisition: InsertRequisition, items: InsertRequisitionItem[]): Promise<Requisition>;
  updateRequisition(id: number, requisition: Partial<InsertRequisition>): Promise<Requisition | undefined>;
  getRequisitionItems(requisitionId: number): Promise<RequisitionItem[]>;
  
  // Purchase Order operations
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(purchaseOrder: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getPurchaseOrderByRequisition(requisitionId: number): Promise<PurchaseOrder | undefined>;
  
  // Report operations
  getProjectExpenditures(): Promise<{ projectId: number, projectName: string, totalAmount: string }[]>;
  getRequisitionsByStatus(): Promise<{ status: string, count: number }[]>;
  getTopSuppliers(limit: number): Promise<{ supplierId: number, supplierName: string, orderCount: number, totalAmount: string }[]>;
  getMonthlyPurchaseTrend(): Promise<{ month: string, totalAmount: string, orderCount: number }[]>;
  getUserExpenditures(): Promise<{ userId: string, userName: string, totalAmount: string, requisitionCount: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async createUser(userData: UpsertUser): Promise<User> {
    // Generate a random ID if one is not provided
    if (!userData.id) {
      userData.id = crypto.randomUUID();
    }
    
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  
  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        ...userData,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  async deleteUser(id: string): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }
  
  async updateUserPassword(userId: string, newPassword: string): Promise<User | undefined> {
    console.log(`Updating password for user ID: ${userId}`);
    const [updatedUser] = await db
      .update(users)
      .set({ 
        password: newPassword,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    console.log("Password update result:", updatedUser ? "Success" : "Failed");
    return updatedUser;
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  // Supplier operations
  async getSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updatedSupplier] = await db
      .update(suppliers)
      .set({ ...supplier, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id));
    return result.rowCount > 0;
  }
  
  // Supplier Items operations
  async getSupplierItems(supplierId: number): Promise<SupplierItem[]> {
    return db.select().from(supplierItems).where(eq(supplierItems.supplierId, supplierId));
  }

  async getSupplierItem(id: number): Promise<SupplierItem | undefined> {
    const [item] = await db.select().from(supplierItems).where(eq(supplierItems.id, id));
    return item;
  }

  async createSupplierItem(item: InsertSupplierItem): Promise<SupplierItem> {
    const [newItem] = await db.insert(supplierItems).values(item).returning();
    return newItem;
  }

  async updateSupplierItem(id: number, itemData: Partial<InsertSupplierItem>): Promise<SupplierItem | undefined> {
    const [updatedItem] = await db
      .update(supplierItems)
      .set({
        ...itemData,
        updatedAt: new Date()
      })
      .where(eq(supplierItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteSupplierItem(id: number): Promise<boolean> {
    const result = await db.delete(supplierItems).where(eq(supplierItems.id, id));
    return result.rowCount > 0;
  }

  // Requisition operations
  // Get requisitions by user
  async getRequisitionsByUser(userId: string): Promise<Requisition[]> {
    return db.select().from(requisitions)
      .where(eq(requisitions.requestedById, userId))
      .orderBy(desc(requisitions.createdAt));
  }

  async getRequisitions(): Promise<Requisition[]> {
    return db.select().from(requisitions).orderBy(desc(requisitions.createdAt));
  }

  async getRequisition(id: number): Promise<Requisition | undefined> {
    const [requisition] = await db.select().from(requisitions).where(eq(requisitions.id, id));
    return requisition;
  }

  async getRequisitionByNumber(number: string): Promise<Requisition | undefined> {
    const [requisition] = await db.select().from(requisitions).where(eq(requisitions.requisitionNumber, number));
    return requisition;
  }

  async createRequisition(requisitionData: InsertRequisition, items: InsertRequisitionItem[]): Promise<Requisition> {
    // Generate requisition number: REQ-YYYY-XXXX
    const year = new Date().getFullYear();
    const [{ max }] = await db.select({
      max: sql<string>`MAX(SUBSTRING(${requisitions.requisitionNumber} FROM '[0-9]+$')::integer)`
    }).from(requisitions).where(sql`${requisitions.requisitionNumber} LIKE ${'REQ-' + year + '-%'}`);
    
    const sequence = max ? parseInt(max) + 1 : 1;
    const requisitionNumber = `REQ-${year}-${sequence.toString().padStart(4, '0')}`;
    
    // Insert requisition (no transaction support in neon-http)
    const [newRequisition] = await db
      .insert(requisitions)
      .values({
        ...requisitionData,
        requisitionNumber
      })
      .returning();
    
    // Insert requisition items
    if (items.length > 0) {
      await db
        .insert(requisitionItems)
        .values(
          items.map(item => ({
            ...item,
            requisitionId: newRequisition.id
          }))
        );
    }
    
    return newRequisition;
  }

  async updateRequisition(id: number, requisitionData: Partial<InsertRequisition>): Promise<Requisition | undefined> {
    const [updatedRequisition] = await db
      .update(requisitions)
      .set({ ...requisitionData, updatedAt: new Date() })
      .where(eq(requisitions.id, id))
      .returning();
    return updatedRequisition;
  }

  async getRequisitionItems(requisitionId: number): Promise<RequisitionItem[]> {
    return db
      .select()
      .from(requisitionItems)
      .where(eq(requisitionItems.requisitionId, requisitionId))
      .orderBy(requisitionItems.id);
  }

  // Purchase Order operations
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined> {
    const [purchaseOrder] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return purchaseOrder;
  }

  async createPurchaseOrder(purchaseOrderData: InsertPurchaseOrder): Promise<PurchaseOrder> {
    let poNumber = purchaseOrderData.poNumber;
    
    // If no PO number provided, generate one automatically
    if (!poNumber) {
      // Generate PO number: PO-YYYY-XXXXX
      const year = new Date().getFullYear();
      const [{ max }] = await db.select({
        max: sql<string>`MAX(SUBSTRING(${purchaseOrders.poNumber} FROM '[0-9]+$')::integer)`
      }).from(purchaseOrders).where(sql`${purchaseOrders.poNumber} LIKE ${'PO-' + year + '-%'}`);
      
      const sequence = max ? parseInt(max) + 1 : 1;
      poNumber = `PO-${year}-${sequence.toString().padStart(5, '0')}`;
    }
    
    const [newPurchaseOrder] = await db
      .insert(purchaseOrders)
      .values({
        ...purchaseOrderData,
        poNumber,
      })
      .returning();
      
    // Update the requisition status to approved
    await db
      .update(requisitions)
      .set({ 
        status: 'approved',
        updatedAt: new Date()
      })
      .where(eq(requisitions.id, purchaseOrderData.requisitionId));
      
    return newPurchaseOrder;
  }

  async getPurchaseOrderByRequisition(requisitionId: number): Promise<PurchaseOrder | undefined> {
    const [purchaseOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.requisitionId, requisitionId));
    return purchaseOrder;
  }

  // Report operations
  async getProjectExpenditures(): Promise<{ projectId: number, projectName: string, totalAmount: string }[]> {
    return db.select({
      projectId: projects.id,
      projectName: projects.name,
      totalAmount: sql<string>`SUM(${purchaseOrders.totalAmount})::text`
    })
    .from(purchaseOrders)
    .innerJoin(requisitions, eq(purchaseOrders.requisitionId, requisitions.id))
    .innerJoin(projects, eq(requisitions.projectId, projects.id))
    .groupBy(projects.id, projects.name)
    .orderBy(desc(sql`SUM(${purchaseOrders.totalAmount})`));
  }

  async getRequisitionsByStatus(): Promise<{ status: string, count: number }[]> {
    return db.select({
      status: requisitions.status,
      count: sql<number>`COUNT(*)`
    })
    .from(requisitions)
    .groupBy(requisitions.status);
  }

  async getTopSuppliers(limit: number): Promise<{ supplierId: number, supplierName: string, orderCount: number, totalAmount: string }[]> {
    return db.select({
      supplierId: suppliers.id,
      supplierName: suppliers.name,
      orderCount: sql<number>`COUNT(${purchaseOrders.id})`,
      totalAmount: sql<string>`SUM(${purchaseOrders.totalAmount})::text`
    })
    .from(purchaseOrders)
    .innerJoin(requisitions, eq(purchaseOrders.requisitionId, requisitions.id))
    .innerJoin(suppliers, eq(requisitions.supplierId, suppliers.id))
    .groupBy(suppliers.id, suppliers.name)
    .orderBy(desc(sql`SUM(${purchaseOrders.totalAmount})`))
    .limit(limit);
  }

  async getMonthlyPurchaseTrend(): Promise<{ month: string, totalAmount: string, orderCount: number }[]> {
    return db.select({
      month: sql<string>`TO_CHAR(${purchaseOrders.issueDate}, 'YYYY-MM')`,
      totalAmount: sql<string>`SUM(${purchaseOrders.totalAmount})::text`,
      orderCount: sql<number>`COUNT(*)`
    })
    .from(purchaseOrders)
    .groupBy(sql`TO_CHAR(${purchaseOrders.issueDate}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${purchaseOrders.issueDate}, 'YYYY-MM')`);
  }

  async getUserExpenditures(): Promise<{ userId: string, userName: string, totalAmount: string, requisitionCount: number }[]> {
    return db.select({
      userId: users.id,
      userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      totalAmount: sql<string>`SUM(${requisitions.totalAmount})::text`,
      requisitionCount: sql<number>`COUNT(${requisitions.id})`
    })
    .from(requisitions)
    .innerJoin(users, eq(requisitions.requestedById, users.id))
    .where(eq(requisitions.status, 'approved'))
    .groupBy(users.id, users.firstName, users.lastName)
    .orderBy(desc(sql`SUM(${requisitions.totalAmount})`));
  }
}

export const storage = new DatabaseStorage();
