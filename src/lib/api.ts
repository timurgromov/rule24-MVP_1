import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export type ApiErrorPayload = {
  detail?: string | { msg?: string }[] | Record<string, unknown>;
};

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  subscription_status: string | null;
  subscription_until: string | null;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type ClientDto = {
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionStatus = "scheduled" | "completed" | "cancelled";
export type SessionOutcomeType = "completed" | "late_cancellation" | "no_show";

export type SessionDto = {
  id: number;
  user_id: number;
  client_id: number;
  start_time: string;
  duration_minutes: number;
  price: string;
  status: SessionStatus;
  outcome_confirmed: boolean;
  outcome_type: SessionOutcomeType | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionCancelResponse = {
  session: SessionDto;
  cancellation_window_hours: number;
  hours_before_start: number;
  is_late_cancellation: boolean;
  charge_amount: string | null;
  penalty_transaction: TransactionDto | null;
  penalty_error: string | null;
};

export type CancellationRuleDto = {
  id: number;
  user_id: number;
  hours_before: number;
  penalty_amount: string | null;
  created_at: string;
  updated_at: string;
};

export type CardAttachmentInitOut = {
  payment_id: string;
  confirmation_url: string | null;
};

export type PublicClientLinkDto = {
  id: number;
  public_token: string;
  status: "created" | "opened" | "completed" | "expired";
  session_id: number;
  client_id: number;
  client_name: string;
  session_start_time: string;
  session_duration_minutes: number;
  session_price: string;
  session_notes: string | null;
  created_at: string;
  opened_at: string | null;
  completed_at: string | null;
  expired_at: string | null;
};

export type ClientPaymentLinkDto = {
  id: number;
  session_id: number;
  client_id: number;
  public_token: string;
  status: "created" | "opened" | "completed" | "expired";
  client_url_path: string;
  client_url: string;
  created_at: string;
  opened_at: string | null;
  completed_at: string | null;
  expired_at: string | null;
};

export type PenaltyChargeOut = {
  transaction_id: number;
  session_id: number;
  amount: string;
  status: string;
  yookassa_payment_id: string | null;
  created_at: string;
};

export type TransactionDto = {
  id: number;
  client_id: number;
  session_id: number;
  amount: string;
  status: string;
  yookassa_payment_id: string | null;
  created_at: string;
  updated_at: string;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

function normalizeErrorDetail(payload: ApiErrorPayload | null, fallback: string): string {
  if (!payload?.detail) return fallback;
  if (typeof payload.detail === "string") return payload.detail;
  if (Array.isArray(payload.detail)) {
    return payload.detail.map((item) => item.msg ?? "Validation error").join("; ");
  }
  return fallback;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const maybeJson = (await response.text()) || "";
  let parsed: unknown = null;
  if (maybeJson) {
    try {
      parsed = JSON.parse(maybeJson);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
    }
    const detail = normalizeErrorDetail(parsed as ApiErrorPayload | null, "Request failed");
    throw new ApiError(response.status, detail);
  }

  return (parsed ?? ({} as unknown)) as T;
}

export const api = {
  baseUrl: API_BASE_URL,
  register: async (payload: { email: string; password: string; name: string }) => {
    const result = await request<AuthResponse>("/auth/register", {
      method: "POST",
      auth: false,
      body: payload,
    });
    setAccessToken(result.access_token);
    return result;
  },
  login: async (payload: { email: string; password: string }) => {
    const result = await request<AuthResponse>("/auth/login", {
      method: "POST",
      auth: false,
      body: payload,
    });
    setAccessToken(result.access_token);
    return result;
  },
  me: () => request<AuthUser>("/auth/me"),

  listClients: () => request<ClientDto[]>("/clients"),
  createClient: (payload: {
    name: string;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
  }) => request<ClientDto>("/clients", { method: "POST", body: payload }),
  updateClient: (
    clientId: number,
    payload: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
    },
  ) => request<ClientDto>(`/clients/${clientId}`, { method: "PUT", body: payload }),
  deleteClient: (clientId: number) =>
    request<void>(`/clients/${clientId}`, { method: "DELETE" }),

  listSessions: () => request<SessionDto[]>("/sessions"),
  createSession: (payload: {
    client_id: number;
    start_time: string;
    duration_minutes: number;
    price: string;
    status?: SessionStatus;
    notes?: string | null;
  }) => request<SessionDto>("/sessions", { method: "POST", body: payload }),
  updateSession: (
    sessionId: number,
    payload: {
      client_id?: number;
      start_time?: string;
      duration_minutes?: number;
      price?: string;
      status?: SessionStatus;
      notes?: string | null;
    },
  ) => request<SessionDto>(`/sessions/${sessionId}`, { method: "PUT", body: payload }),
  getSession: (sessionId: number) => request<SessionDto>(`/sessions/${sessionId}`),
  listSessionsRequiresAttention: () => request<SessionDto[]>("/sessions/requires-attention"),
  confirmSessionOutcome: (sessionId: number, payload: { outcome_type: SessionOutcomeType }) =>
    request<SessionDto>(`/sessions/${sessionId}/confirm-outcome`, {
      method: "POST",
      body: payload,
    }),
  cancelSession: (sessionId: number) =>
    request<SessionCancelResponse>(`/sessions/${sessionId}/cancel`, { method: "POST" }),

  getCancellationRule: () => request<CancellationRuleDto>("/cancellation-rules"),
  updateCancellationRule: (payload: { hours_before: number; penalty_amount?: string | null }) =>
    request<CancellationRuleDto>("/cancellation-rules", { method: "PUT", body: payload }),

  initCardAttachment: (clientId: number) =>
    request<CardAttachmentInitOut>(`/payments/clients/${clientId}/attach-card`, {
      method: "POST",
    }),
  createClientLink: (sessionId: number) =>
    request<ClientPaymentLinkDto>(`/client-links/sessions/${sessionId}`, {
      method: "POST",
    }),
  getLatestClientLink: (sessionId: number) =>
    request<ClientPaymentLinkDto>(`/client-links/sessions/${sessionId}/latest`),
  getPublicClientLink: (publicToken: string) =>
    request<PublicClientLinkDto>(`/public/client-links/${publicToken}`, {
      auth: false,
    }),
  initCardAttachmentByPublicLink: (publicToken: string) =>
    request<CardAttachmentInitOut>(`/public/client-links/${publicToken}/attach-card`, {
      method: "POST",
      auth: false,
    }),
  requestPenaltyCharge: (sessionId: number) =>
    request<PenaltyChargeOut>(`/payments/sessions/${sessionId}/penalty-charge`, {
      method: "POST",
    }),
  listTransactions: () => request<TransactionDto[]>("/payments/transactions"),
};
