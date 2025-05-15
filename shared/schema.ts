import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  serial,
  boolean,
  numeric,
  date,
  foreignKey,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 50 }).default("requester").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contractNumber: varchar("contract_number", { length: 50 }).notNull().unique(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Requisitions table
export const requisitions = pgTable("requisitions", {
  id: serial("id").primaryKey(),
  requisitionNumber: varchar("requisition_number", { length: 50 }).notNull().unique(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  requestedById: varchar("requested_by_id").references(() => users.id).notNull(),
  requestDate: date("request_date").notNull(),
  deliveryDate: date("delivery_date").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryInstructions: text("delivery_instructions"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Requisition items table
export const requisitionItems = pgTable("requisition_items", {
  id: serial("id").primaryKey(),
  requisitionId: integer("requisition_id").references(() => requisitions.id).notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  vatType: varchar("vat_type", { length: 50 }).default("VAT 20%"),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Orders table
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: varchar("po_number", { length: 50 }).notNull().unique(),
  requisitionId: integer("requisition_id").references(() => requisitions.id).notNull(),
  approvedById: varchar("approved_by_id").references(() => users.id).notNull(),
  issueDate: date("issue_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("issued"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Types and Schemas

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Invalid email format")
});

export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  phone: z.string().optional(),
});
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export const insertRequisitionItemSchema = createInsertSchema(requisitionItems).omit({
  id: true,
  requisitionId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRequisitionItem = z.infer<typeof insertRequisitionItemSchema>;
export type RequisitionItem = typeof requisitionItems.$inferSelect;

export const insertRequisitionSchema = createInsertSchema(requisitions).omit({
  id: true,
  requisitionNumber: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRequisition = z.infer<typeof insertRequisitionSchema>;
export type Requisition = typeof requisitions.$inferSelect;

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
