export interface TenantRequest {
  // Información Personal
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string; // Cargo/rol
  
  // Información de la Empresa
  companyName: string;
  industry: string; // Sector/industria
  country: string;
  website?: string;
  
  // Tipo de Tenant (Clave)
  tenantType: 'MULTI_COMPANY' | 'SINGLE_COMPANY';
  
  // Justificación
  useCase: string; // ¿Para qué lo necesita?
  message: string; // Mensaje adicional
  
  // Información Adicional
  referralSource?: string; // ¿Cómo nos conoció?
  
  // Estado y Metadatos
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  adminNotes?: string;
  rejectionReason?: string;
}

export interface TenantType {
  id: 'MULTI_COMPANY' | 'SINGLE_COMPANY';
  name: string;
  description: string;
  features: string[];
  idealFor: string[];
  canManageCompanies: boolean;
  requiresCompanySelection: boolean;
}

export const TENANT_TYPES: TenantType[] = [
  {
    id: 'MULTI_COMPANY',
    name: 'Multi-Empresa',
    description: 'Gestiona múltiples empresas desde una sola cuenta',
    features: [
      'Gestión ilimitada de empresas',
      'Cambio rápido entre empresas',
      'Reportes consolidados',
      'Administración centralizada'
    ],
    idealFor: [
      'Contadores y consultores',
      'Holdings y grupos empresariales',
      'Agencias de servicios',
      'Franquicias'
    ],
    canManageCompanies: true,
    requiresCompanySelection: true
  },
  {
    id: 'SINGLE_COMPANY',
    name: 'Empresa Individual',
    description: 'Gestiona tu propia empresa de forma simplificada',
    features: [
      'Gestión de una sola empresa',
      'Interfaz simplificada',
      'Acceso directo al dashboard',
      'Enfoque en tu negocio'
    ],
    idealFor: [
      'PYMEs y negocios locales',
      'Empresas familiares',
      'Profesionales independientes',
      'Startups individuales'
    ],
    canManageCompanies: false,
    requiresCompanySelection: false
  }
];
