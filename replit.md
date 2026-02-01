# Noviq Proposal Management System

## Overview

This is a full-stack proposal management application for Noviq, a development services company. The system allows administrators to create, edit, and manage client service agreements and project proposals. Clients can view proposals via public links and sign them digitally.

**Core functionality:**
- Admin dashboard for managing proposals (CRUD operations)
- Interactive proposal document with payment calculations
- Digital signature capture for both parties (Noviq and client)
- Public proposal viewing and signing for clients
- Three payment structure options: Milestone, Installment, and Custom

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens (CSS variables)
- **Build Tool**: Vite with HMR support

**Key design decisions:**
- Custom font families: Playfair Display (display), DM Sans (body), Dancing Script (signatures)
- Premium slate & gold color palette with HSL-based CSS variables
- Signature capture using react-signature-canvas library

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with Zod validation
- **Session Management**: express-session with PostgreSQL store (connect-pg-simple)

**Route structure:**
- `/api/proposals/*` - Protected CRUD endpoints for proposal management
- `/api/public/proposals/:id` - Public proposal viewing
- `/api/auth/*` - Authentication endpoints

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit with `db:push` command

**Main tables:**
- `proposals` - Core proposal data including financials, payment terms, signatures
- `proposal_items` - Line items/deliverables for each proposal
- `users` - User accounts (required for Replit Auth)
- `sessions` - Session storage (required for Replit Auth)

### Authentication
- **Provider**: Replit OpenID Connect (OIDC)
- **Implementation**: Passport.js with openid-client strategy
- **Session Storage**: PostgreSQL-backed sessions
- **Protected Routes**: Admin routes require authentication via `isAuthenticated` middleware

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect authentication via Replit's identity provider
- **PostgreSQL**: Database provisioned through Replit (requires DATABASE_URL environment variable)

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `@tanstack/react-query` - Server state management
- `react-signature-canvas` - Digital signature capture
- `date-fns` - Date formatting
- `zod` - Runtime type validation
- `passport` / `openid-client` - Authentication
- `connect-pg-simple` - PostgreSQL session store

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `ISSUER_URL` - Replit OIDC issuer (defaults to https://replit.com/oidc)
- `REPL_ID` - Replit environment identifier (auto-set by Replit)