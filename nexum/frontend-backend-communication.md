# Frontend-Backend Communication Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Frontend                          │
│  Port: 4200                                                 │
│  Environment: http://localhost:3001 (API URL)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API Calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   NestJS Backend                            │
│  Port: 3001                                                 │
│  Database: PostgreSQL (nexum_db)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ TypeORM Queries
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 PostgreSQL Database                         │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
Login Component → AuthService.login() → POST /auth/login → AuthService.login() → User Entity (PostgreSQL)
      │                    │                      │                   │
      ▼                    ▼                      ▼                   ▼
   User Input         HTTP Request          NestJS Controller    Database Query
   Email/Password      {email, password}      AuthController      User.findOne()
      │                    │                      │                   │
      └──────────────────┼──────────────────────┼───────────────────┘
                           │                      │
                           ▼                      ▼
                     JWT Token Response    User + Token
                           │                      │
                           └──────────────────────┘
```

## Service-to-Entity Mapping

| Frontend Service | Backend Controller | Backend Service | Database Entity |
|------------------|-------------------|-----------------|----------------|
| AuthService | AuthController | AuthService | User |
| CompanyService | CompaniesController | CompaniesService | Company |
| InventoryService | InventoryController | InventoryService | Inventory |
| WarehouseService | WarehousesController | WarehousesService | Warehouse |
| PurchasesService | PurchasesController | PurchasesService | Purchase, PurchaseProduct |
| MovementsService | MovementsController | MovementsService | Movement |
| ReportsService | ReportsController | ReportsService | ReceptionReport, DeliveryReport |
| InvoicesService | InvoicesController | InvoicesService | Invoice, InvoiceItem |
| FixedAssetsService | FixedAssetsController | FixedAssetsService | FixedAsset |

## API Endpoint Verification

### ✅ Working Endpoints

| Method | Path | Frontend Service | Response Format | Status |
|--------|------|------------------|------------------|---------|
| POST | `/auth/login` | AuthService | `{user, token}` | ✅ |
| GET | `/companies` | CompanyService | `Company[]` | ✅ |
| GET | `/companies/:id` | CompanyService | `Company` | ✅ |
| GET | `/inventory` | InventoryService | `{inventory: InventoryItem[]}` | ✅ |
| GET | `/companies/:companyId/warehouses` | WarehouseService | `Warehouse[]` | ✅ |
| GET | `/warehouses` | WarehouseService | `Warehouse[]` | ✅ |
| GET | `/purchases` | PurchasesService | `Purchase[]` | ✅ |
| GET | `/movements` | MovementsService | `MovementItem[]` | ✅ |
| GET | `/reports/reception` | ReportsService | `ReceptionReport[]` | ✅ |
| GET | `/reports/delivery` | ReportsService | `DeliveryReport[]` | ✅ |
| GET | `/invoices` | InvoicesService | `{invoices: Invoice[]}` | ✅ |
| GET | `/fixed-assets` | FixedAssetsService | `{assets: FixedAsset[]}` | ✅ |

### Data Flow Examples

#### 1. Inventory List
```
InventoryTableComponent
    ↓
InventoryService.getInventory(filters, companyId)
    ↓
GET /inventory?companyId=1&product=Laptop
    ↓
InventoryController.getInventory()
    ↓
InventoryService.getInventory(companyId, filters)
    ↓
TypeORM Query Builder → Inventory Entity
    ↓
{inventory: InventoryItem[]} → Frontend
```

#### 2. Company CRUD
```
WarehousesComponent
    ↓
CompanyService.getCompanies()
    ↓
GET /companies
    ↓
CompaniesController.findAll()
    ↓
CompaniesService.findAll()
    ↓
Company.find() → Database
    ↓
Company[] → Frontend
```

#### 3. Authentication
```
LoginComponent
    ↓
AuthService.login(email, password)
    ↓
POST /auth/login {email, password}
    ↓
AuthController.login()
    ↓
AuthService.login()
    ↓
User.findOne() → Database
    ↓
{user, token} → Frontend → localStorage
```

## Multi-Tenant Data Isolation

All entities include `companyId` for multi-tenant isolation:

```
Request Flow:
Frontend (companyId=1) → Backend → TypeORM Query → WHERE company_id = 1
```

Example query (Inventory):
```typescript
qb.where('inv.company_id = :companyId', { companyId });
```

## Error Handling

### Frontend
- HTTP errors caught in service observables
- User-friendly messages via NotificationService
- Loading states and error states in components

### Backend
- NestJS HTTP Exceptions (400, 404, 500)
- Validation with DTOs
- Database errors wrapped in appropriate HTTP responses

## Response Format Standards

### Collections
```typescript
// Standard collection response
{
  inventory: InventoryItem[],
  invoices: Invoice[],
  assets: FixedAsset[]
}

// Direct array response (companies, warehouses)
Company[]
Warehouse[]
```

### Single Item
```typescript
// Wrapped single item
{ invoice: Invoice }
{ asset: FixedAsset }

// Direct entity
Company
Warehouse
```

## Development Notes

- Frontend runs on port 4200 (Angular CLI)
- Backend runs on port 3001 (NestJS)
- Database: PostgreSQL with TypeORM
- All services migrated from mock data to TypeORM repositories
- Seed data available via `npx ts-node src/seed.ts`
- Multi-tenant architecture with companyId isolation

## Verified Communication

✅ **Authentication**: Login works with admin@nexum.com/1234
✅ **Data Loading**: All major modules load data from PostgreSQL
✅ **CRUD Operations**: Create, Read, Update, Delete operations functional
✅ **Multi-tenant**: Data properly isolated by companyId
✅ **Error Handling**: Frontend gracefully handles API errors
✅ **Real-time Updates**: Components refresh data after operations
