# Civcon Office - Procurement Management System

## Overview

This is a full-stack procurement management application built for construction companies to manage projects, suppliers, requisitions, and purchase orders. The system features a React frontend with TypeScript, Express.js backend, PostgreSQL database with Drizzle ORM, and comprehensive authentication and authorization mechanisms.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and session management
- **File Processing**: PDF generation with jsPDF
- **Email Service**: Nodemailer with Office 365 SMTP support

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Management**: Type-safe schema definitions with automatic migrations
- **Session Storage**: Database-backed sessions for authentication persistence
- **Relationships**: Foreign key constraints for data integrity

## Key Components

### Authentication System
- **Session-based authentication** using Passport.js Local Strategy
- **Password hashing** with Node.js crypto scrypt function
- **Role-based access control** (admin, finance, requester roles)
- **Secure session management** with database storage
- **CSRF protection** through cookie settings

### User Management
- **Multi-role system**: Admin, Finance, and Requester roles
- **User registration and management** by administrators
- **Profile management** with optional profile images
- **Email-based user identification**

### Project Management
- **Project tracking** with contract numbers and dates
- **Status management** (active, completed, on-hold)
- **Budget tracking** and expenditure monitoring
- **Project-specific requisition filtering**

### Supplier Management
- **Supplier database** with contact information
- **Supplier item catalogs** with pricing
- **Supplier performance tracking**
- **Integration with requisition system**

### Requisition System
- **Multi-item requisitions** with detailed specifications
- **Approval workflow** with status tracking
- **PDF generation** for requisition documents
- **Email notifications** to relevant parties
- **Edit and cancellation capabilities**

### Purchase Order Management
- **Purchase order creation** from approved requisitions
- **PDF generation** for official documents
- **Order tracking** and status management
- **Integration with supplier and project data**

## Data Flow

1. **User Authentication**: Users log in through the authentication system
2. **Role-based Access**: Different interfaces based on user roles
3. **Requisition Creation**: Requesters create requisitions for projects
4. **Approval Process**: Finance/Admin users review and approve requisitions
5. **Purchase Order Generation**: Approved requisitions become purchase orders
6. **Document Management**: PDFs generated and emailed to stakeholders
7. **Reporting**: Various reports generated from transaction data

## External Dependencies

### Production Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Email Service**: Office 365 SMTP for email notifications
- **Authentication**: Session-based with database storage
- **PDF Generation**: Client-side PDF creation with jsPDF

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESLint/Prettier**: Code quality and formatting
- **Vite**: Fast development server and build tool
- **Drizzle Kit**: Database schema management and migrations

## Deployment Strategy

### Development Environment
- **Local Development**: npm run dev starts both frontend and backend
- **Hot Reload**: Vite provides instant feedback for frontend changes
- **Database**: PostgreSQL connection via environment variables
- **Port Configuration**: Application runs on port 5000

### Production Build
- **Frontend Build**: Vite builds optimized static assets
- **Backend Bundle**: ESBuild creates production Node.js bundle
- **Asset Serving**: Express serves static files in production
- **Environment Variables**: Database URL and session secrets required

### Replit Configuration
- **Modules**: Node.js 20, Web, and PostgreSQL 16
- **Auto-scaling**: Configured for autoscale deployment
- **Build Process**: npm run build for production assets
- **Start Command**: npm run start for production server

## Changelog

```
Changelog:
- June 24, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```