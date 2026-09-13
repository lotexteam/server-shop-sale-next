"use client";

import * as React from "react";
import type { BonusTransaction } from "@/lib/bonuses";
import {
  apiCreateAddress,
  apiCreateLegalEntity,
  apiDeleteAddress,
  apiDeleteLegalEntity,
  apiFetchBonusBalance,
  apiFetchBonusHistory,
  apiUpdateAddress,
  apiUpdateLegalEntity,
  fetchAddresses,
  fetchAuthMe,
  fetchLegalEntities,
  getAuthToken,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  resendRegistrationCode,
  setAuthToken,
  updateCustomerProfile,
  verifyRegistrationEmail,
  type ApiAddress,
  type ApiAuthUser,
  type ApiLegalEntity,
} from "@/lib/api";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** Saved delivery address (account book): всё одним адресом, без квартиры/офиса */
export interface UserAddress {
  id: string;
  label: string;
  city: string;
  street: string;
  zip?: string;
  isDefault: boolean;
  /** recipient if different from profile */
  recipient?: string;
  phone?: string;
}

/** Legal entity / company for B2B invoices */
export interface LegalEntity {
  id: string;
  name: string;
  inn: string;
  kpp?: string;
  ogrn?: string;
  legalAddress: string;
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  corrAccount?: string;
  isDefault: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  /** Bearer token present (API session) */
  apiToken: string | null;
  bonusBalance: number;
  bonusHistory: BonusTransaction[];
  addresses: UserAddress[];
  legalEntities: LegalEntity[];
  login: (email: string, password: string) => Promise<void>;
  /** Storefront register → аккаунт создан, ждёт код из письма (pendingEmail). */
  register: (data: {
    name: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    phone?: string;
  }) => Promise<void>;
  /** Email регистрации, ожидающей подтверждения кодом. */
  pendingEmail: string | null;
  /** Подтвердить email кодом из письма — активирует аккаунт и логинит. */
  verifyEmailCode: (code: string) => Promise<void>;
  /** Отправить код повторно. */
  resendEmailCode: () => Promise<void>;
  /** Сбросить ожидание подтверждения (пользователь отменил). */
  clearPendingEmail: () => void;
  logout: () => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  addAddress: (a: Omit<UserAddress, "id">) => Promise<UserAddress>;
  updateAddress: (id: string, patch: Partial<UserAddress>) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  addLegalEntity: (e: Omit<LegalEntity, "id">) => Promise<LegalEntity>;
  updateLegalEntity: (id: string, patch: Partial<LegalEntity>) => Promise<void>;
  removeLegalEntity: (id: string) => Promise<void>;
  setDefaultLegalEntity: (id: string) => Promise<void>;
  /** Обновить бонусный баланс и историю с сервера (источник правды). */
  refreshBonusBalance: () => Promise<void>;
}

const STORAGE_KEY = "server-price-auth-v2";

type Persisted = {
  isAuthenticated: boolean;
  user: UserProfile | null;
  bonusBalance: number;
  bonusHistory: BonusTransaction[];
  // NOTE: addresses and legal entities live on the backend
  // (/account/addresses, /account/legal-entities) — never persisted locally.
};

function mapApiUser(u: ApiAuthUser): UserProfile {
  const parts = (u.name || "").trim().split(/\s+/);
  const first =
    u.profile?.first_name || parts[0] || "Покупатель";
  const last =
    u.profile?.last_name || (parts.length > 1 ? parts.slice(1).join(" ") : "");
  return {
    id: u.id,
    firstName: first,
    lastName: last,
    email: u.email,
    phone: u.phone || "",
  };
}

/* ── Mappers: API (snake_case) ↔ store (camelCase) ──────── */

function legalEntityFromApi(r: ApiLegalEntity): LegalEntity {
  return {
    id: r.id,
    name: r.company_name || r.title || "",
    inn: r.inn || "",
    kpp: r.kpp || "",
    ogrn: r.ogrn || "",
    legalAddress: r.legal_address || "",
    bankName: r.bank_name || "",
    bik: r.bik || "",
    checkingAccount: r.checking_account || "",
    corrAccount: r.correspondent_account || "",
    isDefault: Boolean(r.is_default),
  };
}

function legalEntityToApi(e: Omit<LegalEntity, "id">): Record<string, unknown> {
  return {
    title: e.name || null,
    company_name: e.name || null,
    inn: e.inn || null,
    kpp: e.kpp || null,
    ogrn: e.ogrn || null,
    legal_address: e.legalAddress || null,
    bank_name: e.bankName || null,
    bik: e.bik || null,
    checking_account: e.checkingAccount || null,
    correspondent_account: e.corrAccount || null,
    is_default: Boolean(e.isDefault),
  };
}

function addressFromApi(r: ApiAddress): UserAddress {
  return {
    id: r.id,
    label: r.label || "",
    city: r.city || "",
    street: [r.street, r.house, r.apartment].filter(Boolean).join(", ") || "",
    zip: r.postal_code || undefined,
    isDefault: Boolean(r.is_default),
    recipient: r.full_name || undefined,
    phone: r.phone || undefined,
  };
}

function addressToApi(e: Omit<UserAddress, "id">): Record<string, unknown> {
  return {
    label: e.label || null,
    city: e.city || null,
    street: e.street || null,
    postal_code: e.zip || null,
    full_name: e.recipient || null,
    phone: e.phone || null,
    is_default: Boolean(e.isDefault),
  };
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("server-price-auth-v1");
    if (!raw) {
      // Not auto-logged-in — need API token for orders
      return {
        isAuthenticated: false,
        user: null,
        bonusBalance: 0,
        bonusHistory: [],
      };
    }
    const data = JSON.parse(raw) as Partial<Persisted>;
    const hasToken = Boolean(getAuthToken());
    return {
      isAuthenticated: hasToken && (data.isAuthenticated ?? false),
      user: hasToken ? data.user ?? null : null,
      bonusBalance: typeof data.bonusBalance === "number" ? data.bonusBalance : 0,
      bonusHistory: Array.isArray(data.bonusHistory) ? data.bonusHistory : [],
    };
  } catch {
    return {
      isAuthenticated: false,
      user: null,
      bonusBalance: 0,
      bonusHistory: [],
    };
  }
}

const Ctx = React.createContext<AuthState | null>(null);

export function useAuth() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within <AuthProvider>");
  return c;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // SSR/гидрация (урок миграции sp-next): первый рендер — детерминированно
  // «гость» (сервер не знает localStorage; чтение в инициализаторе давало
  // hydration mismatch). Сессия восстанавливается effect'ом ниже.
  const [isAuthenticated, setAuth] = React.useState(false);
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [apiToken, setApiTokenState] = React.useState<string | null>(null);
  const [bonusBalance, setBalance] = React.useState(0);
  const [bonusHistory, setHistory] = React.useState<BonusTransaction[]>([]);
  const [addresses, setAddresses] = React.useState<UserAddress[]>([]);
  /** Email регистрации, ожидающей подтверждения кодом (не персистится). */
  const [pendingEmail, setPendingEmail] = React.useState<string | null>(null);
  const [legalEntities, setLegalEntities] = React.useState<LegalEntity[]>([]);

  /** Server truth for the address/legal-entity books (after auth). */
  const reloadBooks = React.useCallback(async () => {
    const [addrs, legals] = await Promise.all([fetchAddresses(), fetchLegalEntities()]);
    setAddresses(addrs.map(addressFromApi));
    setLegalEntities(legals.map(legalEntityFromApi));
  }, []);

  /** Server truth for the bonus balance + history (after auth). */
  const reloadBonuses = React.useCallback(async () => {
    try {
      const [balance, history] = await Promise.all([
        apiFetchBonusBalance(),
        apiFetchBonusHistory({ per_page: 50 }),
      ]);
      setBalance(Number(balance.balance ?? 0));
      setHistory(
        history.items.map((row) => {
          const rec = row as Record<string, unknown>;
          const amount = Number(rec.signed_amount ?? rec.amount ?? 0);
          const type = String(rec.type ?? "earn");
          return {
            id: String(rec.id ?? `${rec.created_at ?? Date.now()}`),
            type: (type === "redeem" || type === "expire" || type === "adjust" ? type : "earn") as BonusTransaction["type"],
            amount,
            balanceAfter: Number(rec.balance_after ?? 0),
            title: String(rec.description ?? rec.type ?? "Операция"),
            orderId: rec.order_id ? String(rec.order_id) : undefined,
            date: String(rec.created_at ?? new Date().toISOString()),
          } satisfies BonusTransaction;
        }),
      );
    } catch {
      /* keep local bonus state on failure */
    }
  }, []);

  // Restore session from API token
  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    let cancelled = false;
    void fetchAuthMe().then((me) => {
      if (cancelled) return;
      if (!me) {
        setAuth(false);
        setUser(null);
        setApiTokenState(null);
        return;
      }
      setAuth(true);
      setApiTokenState(token);
      setUser(mapApiUser(me));
      if (typeof me.bonus_balance === "number") setBalance(me.bonus_balance);
      void reloadBooks().catch(() => {
        /* keep books empty on failure */
      });
      void reloadBonuses();
    });
    return () => {
      cancelled = true;
    };
  }, [reloadBooks, reloadBonuses]);

  // Юрлица, адреса и бонусы — только с API; localStorage для книг не используется.
  const loadRemoteAccount = React.useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      await reloadBooks();
    } catch {
      /* API недоступен — книги остаются пустыми */
    }
    void reloadBonuses();
  }, [reloadBooks, reloadBonuses]);

  React.useEffect(() => {
    if (!apiToken) return;
    void loadRemoteAccount();
  }, [apiToken, loadRemoteAccount]);

  const persistMountedRef = React.useRef(false);
  React.useEffect(() => {
    if (!persistMountedRef.current) {
      persistMountedRef.current = true;
      return;
    }
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isAuthenticated,
          user,
          bonusBalance,
          bonusHistory,
        } satisfies Persisted),
      );
    } catch {
      /* ignore */
    }
  }, [isAuthenticated, user, bonusBalance, bonusHistory]);

  const login = async (email: string, password: string) => {
    const loginId = email.trim();
    if (!loginId || !password) {
      throw new Error("Введите email и пароль");
    }
    const { token, user: apiUser } = await loginCustomer(loginId, password);
    setAuthToken(token);
    setApiTokenState(token);
    setAuth(true);
    setUser(mapApiUser(apiUser));
    if (typeof apiUser.bonus_balance === "number") setBalance(apiUser.bonus_balance);
    void loadRemoteAccount();
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    phone?: string;
  }) => {
    const res = await registerCustomer({
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password,
      password_confirmation: data.passwordConfirmation,
      phone: data.phone?.trim() || undefined,
      type: "individual",
    });
    // Аккаунт создан, но не активирован: ждём код из письма.
    setPendingEmail(res.email);
    setAuthToken(null);
    setApiTokenState(null);
    setAuth(false);
    setUser(null);
  };

  const verifyEmailCode = async (code: string) => {
    if (!pendingEmail) throw new Error("Нет регистрации, ожидающей подтверждения");
    const { token, user: apiUser } = await verifyRegistrationEmail(pendingEmail, code);
    setAuthToken(token);
    setApiTokenState(token);
    setAuth(true);
    setUser(mapApiUser(apiUser));
    if (typeof apiUser.bonus_balance === "number") setBalance(apiUser.bonus_balance);
    setAddresses([]);
    setLegalEntities([]);
    setPendingEmail(null);
  };

  const resendEmailCode = async () => {
    if (!pendingEmail) throw new Error("Нет регистрации, ожидающей подтверждения");
    await resendRegistrationCode(pendingEmail);
  };

  const clearPendingEmail = () => setPendingEmail(null);
  const logout = () => {
    void logoutCustomer();
    setAuthToken(null);
    setApiTokenState(null);
    setAuth(false);
    setUser(null);
  };

  const updateProfile = async (patch: Partial<UserProfile>) => {
    const next = { ...(user ?? { id: "", firstName: "", lastName: "", email: "", phone: "" }), ...patch };
    const name = [next.firstName, next.lastName].filter(Boolean).join(" ").trim();
    const apiUser = await updateCustomerProfile({
      name: name || undefined,
      email: next.email || undefined,
      phone: next.phone || null,
      profile: {
        first_name: next.firstName || null,
        last_name: next.lastName || null,
      },
    });
    setUser(mapApiUser(apiUser));
  };

  const addAddress = async (a: Omit<UserAddress, "id">) => {
    const created = await apiCreateAddress(addressToApi(a));
    await reloadBooks();
    if (!created?.id) throw new Error("Не удалось сохранить адрес");
    return addressFromApi(created);
  };

  const updateAddress = async (id: string, patch: Partial<UserAddress>) => {
    const current = addresses.find((x) => x.id === id);
    if (!current) return;
    await apiUpdateAddress(id, addressToApi({ ...current, ...patch }));
    await reloadBooks();
  };

  const removeAddress = async (id: string) => {
    await apiDeleteAddress(id);
    await reloadBooks();
  };

  const setDefaultAddress = async (id: string) => {
    await apiUpdateAddress(id, { is_default: true });
    await reloadBooks();
  };

  const addLegalEntity = async (e: Omit<LegalEntity, "id">) => {
    const created = await apiCreateLegalEntity(legalEntityToApi(e));
    await reloadBooks();
    if (!created?.id) throw new Error("Не удалось сохранить юрлицо");
    return legalEntityFromApi(created);
  };

  const updateLegalEntity = async (id: string, patch: Partial<LegalEntity>) => {
    const current = legalEntities.find((x) => x.id === id);
    if (!current) return;
    await apiUpdateLegalEntity(id, legalEntityToApi({ ...current, ...patch }));
    await reloadBooks();
  };

  const removeLegalEntity = async (id: string) => {
    await apiDeleteLegalEntity(id);
    await reloadBooks();
  };

  const setDefaultLegalEntity = async (id: string) => {
    await apiUpdateLegalEntity(id, { is_default: true });
    await reloadBooks();
  };

  const refreshBonusBalance = React.useCallback(async () => {
    await reloadBonuses();
  }, [reloadBonuses]);

  return (
    <Ctx.Provider
      value={{
        isAuthenticated,
        user: isAuthenticated ? user : null,
        apiToken: isAuthenticated ? apiToken : null,
        bonusBalance,
        bonusHistory,
        addresses: isAuthenticated ? addresses : [],
        legalEntities: isAuthenticated ? legalEntities : [],
        login,
        register,
        pendingEmail,
        verifyEmailCode,
        resendEmailCode,
        clearPendingEmail,
        logout,
        updateProfile,
        addAddress,
        updateAddress,
        removeAddress,
        setDefaultAddress,
        addLegalEntity,
        updateLegalEntity,
        removeLegalEntity,
        setDefaultLegalEntity,
        refreshBonusBalance,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
