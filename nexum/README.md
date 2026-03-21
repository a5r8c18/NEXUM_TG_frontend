# NEXUM — Frontend

Frontend web del sistema ERP **NEXUM**, construido con Angular 21 e integrado con el backend NestJS.

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| Angular | 21 | Framework principal (standalone components, signals) |
| TypeScript | 5.9 | Tipado estático |
| Tailwind CSS | 4 | Estilos utilitarios |
| Lucide Angular | 0.577 | Iconografía |
| Angular HttpClient | — | Comunicación REST con el backend NestJS |

---

## Requisitos previos

- Node.js ≥ 20
- Angular CLI ≥ 21

```bash
npm install -g @angular/cli
```

---

## Instalación y arranque

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:4200)
ng serve

# Build de producción
ng build
```

> El backend NestJS debe estar corriendo en `http://localhost:3001`.  
> Puedes cambiar la URL en `src/environments/environment.ts`.

---

## Estructura del proyecto

```text
src/
├── app/
│   ├── core/                        # Servicios singleton, guards y modelos centrales
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   ├── tenant-selected.guard.ts       # Verifica tenant activo
│   │   │   ├── company-selected.guard.ts      # Verifica compañía activa
│   │   │   └── permissions.guard.ts           # Permisos por rol/compañía
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── sidebar.service.ts
│   │   │   ├── context.service.ts             # Maneja tenant/company/warehouse actual
│   │   │   ├── inventory.service.ts
│   │   │   ├── movements.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── tenant.service.ts              # API para tenants
│   │   │   ├── company.service.ts             # API para compañías
│   │   │   └── warehouse.service.ts           # API para almacenes
│   │   ├── interceptors/
│   │   │   └── context.interceptor.ts         # Agrega headers X-Tenant-ID, X-Company-ID
│   │   └── models/
│   │       ├── tenant.model.ts
│   │       ├── company.model.ts
│   │       ├── warehouse.model.ts
│   │       └── inventory.models.ts
│   │
│   ├── shared/                      # Componentes reutilizables
│   │   ├── components/
│   │   │   ├── filter/              # DateFilterComponent
│   │   │   ├── pagination/          # PaginationComponent
│   │   │   ├── export/              # ExportComponentComponent
│   │   │   ├── modal/               # ModalComponent
│   │   │   └── context-selector/    # Selectores de contexto
│   │   │       ├── company-selector/
│   │   │       │   ├── company-selector.component.ts
│   │   │       │   └── company-selector.component.html
│   │   │       └── warehouse-selector/
│   │   │           ├── warehouse-selector.component.ts
│   │   │           └── warehouse-selector.component.html
│   │   └── pipes/
│   │
│   ├── layout/                      # Shell de la aplicación
│   │   ├── components/
│   │   │   ├── header/
│   │   │   │   ├── header.component.ts        # Incluye selectores de contexto
│   │   │   │   └── header.component.html
│   │   │   ├── sidebar/
│   │   │   └── footer/
│   │   └── main-layout.component.*
│   │
│   ├── auth/                        # Páginas de autenticación
│   │   ├── login/
│   │   └── sign-up/
│   │
│   ├── dashboard/
│   │
│   ├── modules/                     # Módulos del ERP
│   │   ├── inventory/
│   │   │   ├── inventory-routing.module.ts
│   │   │   ├── inventory.module.ts
│   │   │   ├── components/
│   │   │   │   ├── inventory-table/
│   │   │   │   └── ...
│   │   │   ├── pages/
│   │   │   │   ├── movements/
│   │   │   │   ├── delivery-report/
│   │   │   │   └── reception-report/
│   │   │   └── services/
│   │   │       └── inventory.service.ts
│   │   ├── accounting/
│   │   ├── fixed-assets/
│   │   ├── hr/
│   │   └── sales/
│   │
│   ├── admin/                       # Gestión de tenants y compañías (solo superadmin)
│   │   ├── admin-routing.module.ts
│   │   ├── admin.module.ts
│   │   ├── tenants/
│   │   │   ├── tenant-list/
│   │   │   ├── tenant-form/
│   │   │   └── tenant-detail/
│   │   └── companies/               # Gestión de compañías dentro de un tenant
│   │       ├── company-list/
│   │       ├── company-form/
│   │       └── company-detail/
│   │
│   ├── settings/                    # Configuración por compañía
│   │   ├── settings-routing.module.ts
│   │   ├── settings.module.ts
│   │   ├── general/
│   │   ├── users/
│   │   └── warehouses/              # Gestión de almacenes de la compañía actual
│   │       ├── warehouse-list/
│   │       └── warehouse-form/
│   │
│   ├── app.routes.ts                # Configuración de rutas con guards
│   ├── app.config.ts                 # Proveedores de Angular (incluye interceptor)
│   └── app.component.ts
│
├── environments/
│   ├── environment.ts               # Desarrollo (localhost:3001)
│   └── environment.prod.ts          # Producción
└── styles.css
```

---

## Rutas de la aplicación

### Flujo de Autenticación y Contexto
| Ruta | Componente | Guards | Descripción |
|---|---|---|---|
| `/login` | `LoginComponent` | — | Login de usuarios |
| `/signup` | `SignupComponent` | — | Registro de usuarios |
| `/tenant-selection` | `TenantSelectorComponent` | `authGuard` | Selección de organización |
| `/company-selection` | `CompanySelectorComponent` | `authGuard`, `tenantSelectedGuard` | Selección de compañía |

### Rutas Principales (requieren contexto completo)
| Ruta | Componente | Guards | Descripción |
|---|---|---|---|
| `/dashboard` | `DashboardComponent` | `authGuard`, `tenantSelectedGuard`, `companySelectedGuard` | Dashboard principal |
| `/inventory` | `InventoryTableComponent` | `authGuard`, `tenantSelectedGuard`, `companySelectedGuard`, `permissionsGuard` | Inventario |
| `/inventory/entry` | `EntryComponent` | `authGuard`, `tenantSelectedGuard`, `companySelectedGuard`, `permissionsGuard` | Entrada de productos |
| `/inventory/reports` | `ReportsComponent` | `authGuard`, `tenantSelectedGuard`, `companySelectedGuard`, `permissionsGuard` | Reportes |
| `/inventory/warehouses` | `WarehousesComponent` | `authGuard`, `tenantSelectedGuard`, `companySelectedGuard`, `permissionsGuard` | Gestión de almacenes |
| `/inventory/movements` | `MovementsListComponent` | `authGuard`, `tenantSelectedGuard`, `companySelectedGuard`, `permissionsGuard` | Movimientos |
| `/billing/invoices` | `InvoicesComponent` | `authGuard`, `tenantSelectedGuard`, `companySelectedGuard`, `permissionsGuard` | Facturación |
| `/billing/fixed-assets` | `FixedAssetsComponent` | `authGuard`, `tenantSelectedGuard`, `companySelectedGuard`, `permissionsGuard` | Activos fijos |

### Módulos Lazy Loaded
| Ruta | Módulo | Guards | Descripción |
|---|---|---|---|
| `/admin/*` | `AdminModule` | `authGuard`, `permissionsGuard` | Administración (solo superadmin) |
| `/settings/*` | `SettingsModule` | `authGuard`, `tenantSelectedGuard`, `companySelectedGuard`, `permissionsGuard` | Configuración por compañía |

### Guards Implementados
- **`authGuard`** - Verifica usuario autenticado
- **`tenantSelectedGuard`** - Verifica tenant seleccionado
- **`companySelectedGuard`** - Verifica compañía seleccionada  
- **`permissionsGuard`** - Verifica permisos específicos por rol/compañía

---

## Integración con el backend NestJS

Los servicios en `core/services/` consumen la API REST. La URL base se configura en `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001',
};
```

### Endpoints utilizados

#### Inventario — `InventoryService`
```
GET /inventory
  ?fromDate=YYYY-MM-DD
  ?toDate=YYYY-MM-DD
  ?product=string
  ?expirationDate=YYYY-MM-DD

Respuesta: { inventory: InventoryItem[] }
```

#### Compras / Entradas — `PurchasesService`
```
GET  /purchases
POST /purchases   { entity, warehouse, supplier, document, products: [{product_code, product_name, quantity, unit_price, unit?, expiration_date?}] }
```

#### Reportes — `ReportsService`
```
GET  /reports/reception?fromDate=&toDate=&product=&entity=&warehouse=&document=
GET  /reports/delivery?fromDate=&toDate=&product=&entity=&warehouse=&document=
```

#### Empresas / Almacenes — `CompanyService`
```
GET  /companies
POST /companies   { name, tax_id?, address?, phone?, email?, logo_path? }
PUT  /companies/:id
DELETE /companies/:id
```

#### Tenants — `TenantService` (Nuevo)
```
GET  /tenants
POST /tenants   { name, domain?, settings: { maxCompanies, maxUsers, features } }
PUT  /tenants/:id
DELETE /tenants/:id
PATCH /tenants/:id/activate
PATCH /tenants/:id/deactivate
```

#### Almacenes — `WarehouseService` (Nuevo)
```
GET  /warehouses
GET  /companies/:companyId/warehouses
POST /warehouses   { name, code, address?, companyId }
PUT  /warehouses/:id
DELETE /warehouses/:id
PATCH /warehouses/:id/activate
PATCH /warehouses/:id/deactivate
```

#### Facturación — `InvoicesService`
```
GET  /invoices?customerName=&status=&startDate=&endDate=&page=&limit=
GET  /invoices/:id
POST /invoices   { customerName, customerId?, customerAddress?, customerPhone?, date?, taxRate?, discount?, notes?, createdByName?, items:[{productCode?, description, quantity, unitPrice}] }
PUT  /invoices/:id
DELETE /invoices/:id
PUT  /invoices/:id/status   { status }
GET  /invoices/statistics
GET  /invoices/:id/pdf   (Blob)
GET  /invoices/:id/excel  (Blob)
```

#### Activos Fijos — `FixedAssetsService`
```
GET  /fixed-assets?status=&group_number=&search=
GET  /fixed-assets/:id
POST /fixed-assets   { asset_code, name, description?, group_number, subgroup, subgroup_detail?, acquisition_value, acquisition_date, location?, responsible_person? }
PUT  /fixed-assets/:id   { name?, description?, location?, responsible_person?, status? }
DELETE /fixed-assets/:id
GET  /fixed-assets/depreciation-catalog
GET  /fixed-assets/export/excel  (Blob)
GET  /fixed-assets/export/pdf    (Blob)
GET  /fixed-assets/statistics
```

#### Movimientos — `MovementsService`
```
GET  /movements?start_date=&end_date=&product_name=&relations=true
POST /movements/direct-entry   { productCode, productName, quantity, label? }
POST /movements/exit           { product_code, quantity, reason?, entity?, warehouse? }
POST /movements/return         { purchase_id, reason }
```

---

## Convenciones del proyecto

- **Componentes standalone** - sin NgModules, con imports explícitos.
- **Signals** - estado reactivo con `signal()` / `computed()` / `inject()`.
- **Lazy loading** - todas las rutas usan `loadComponent` o `loadChildren`.
- **Nombres de carpetas** - kebab-case (`sign-up/`, `fixed-assets/`, `hr/`).
- **`core/`** - servicios singleton, guards, interceptores y modelos centrales.
- **`shared/components/`** - componentes reutilizables sin lógica de negocio.
- **`models/`** - interfaces TypeScript centralizadas, sin lógica.
- **Multi-tenant Architecture** - Contexto gestionado por `ContextService` con guards específicos.

### Flujo de Contexto Multi-Tenant

1. **Autenticación** → Login → `authGuard`
2. **Selección de Tenant** → `/tenant-selection` → `tenantSelectedGuard` 
3. **Selección de Company** → `/company-selection` → `companySelectedGuard`
4. **Acceso a Módulos** → Rutas principales → `permissionsGuard`

### Headers Automáticos

El `contextInterceptor` agrega automáticamente a todas las peticiones HTTP:
- `X-Tenant-ID` - ID del tenant actual
- `X-Company-ID` - ID de la compañía actual  
- `X-Warehouse-ID` - ID del almacén actual (si está seleccionado)

### Signals vs BehaviorSubjects

- **Signals** - Para estado reactivo en componentes (nuevo enfoque)
- **BehaviorSubjects** - Para compatibilidad con código existente
- **ContextService** - Provee ambos enfoques para migración gradual

---

## Comandos útiles

```bash
# Generar un nuevo componente standalone
ng generate component modules/mi-modulo/mi-componente --standalone

# Generar un nuevo servicio
ng generate service core/services/mi-servicio

# Ejecutar tests
ng test

# Verificar build de producción
ng build --configuration production
```
