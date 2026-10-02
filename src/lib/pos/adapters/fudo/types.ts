export interface FudoRawCustomerAttributes {
  name: string;
  active?: boolean;
  vatNumber?: string | null;
  fiscalNumber?: string | null;
  cuit?: string | null;
  dni?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  address?: string | null;
  [key: string]: unknown;
}

export interface FudoRawCustomer {
  id: string;
  type?: string;
  attributes?: FudoRawCustomerAttributes;
  name?: string;
  vatNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  address?: string | null;
}

export interface FudoRawSaleAttributes {
  total?: number;
  totalAmount?: number;
  amount?: number;
  closedAt?: string;
  createdAt?: string;
  saleState?: "CLOSED" | "OPEN" | "CANCELED" | string;
  status?: string;
  saleType?: "TABLE" | "COUNTER" | "DELIVERY" | "TAKEAWAY" | "PICKUP" | "MOSTRADOR" | "ENVIO" | string;
  type?: string;
  customerName?: string | null;
  anonymousCustomer?: {
    name?: string;
    phone?: string;
  };
  [key: string]: unknown;
}

export interface FudoRawSale {
  id: string;
  type?: string;
  attributes?: FudoRawSaleAttributes;
  relationships?: {
    customer?: {
      data?: {
        id: string;
        type: string;
      } | null;
    };
    [key: string]: unknown;
  };
  total?: number;
  createdAt?: string;
  status?: string;
  typeField?: string;
  customerId?: string | null;
  customer_id?: string | null;
}

export interface FudoJsonApiResponse<T = unknown> {
  data?: T;
  included?: Array<{
    id: string;
    type: string;
    attributes?: Record<string, unknown>;
  }>;
  errors?: Array<{
    status?: string;
    title?: string;
    detail?: string;
  }>;
}

export interface FudoWebhookPayload {
  event?: string;
  action?: string;
  entity?: "sale" | "order" | "customer";
  data?: FudoRawSale | FudoRawCustomer | Record<string, unknown>;
  timestamp?: string;
  [key: string]: unknown;
}
