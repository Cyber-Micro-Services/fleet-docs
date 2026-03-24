"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Trailer,
  Document,
  AuthUser,
  RegisterPayload,
  LoginPayload,
  AuthResponse,
} from "./types";
import {
  generateMockTrailers,
  calculateDocumentStatus,
  calculateUrgencyScore,
} from "./mock-data";

interface AppContextType {
  isAuthenticated: boolean;
  authUser: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  getAuthHeaders: () => HeadersInit;
  authFetch: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
  trailers: Trailer[];
  addTrailer: (payload: {
    registrationNumber: string;
    type: string;
    manufacturer: string;
    manufactureDate: string;
  }) => void;
  addDocument: (trailerId: string, document: Document) => void;
  updateDocument: (
    trailerId: string,
    documentId: string,
    updates: Partial<Document>,
  ) => void;
  deleteDocument: (trailerId: string, documentId: string) => void;
  getTrailersSorted: () => Trailer[];
  getTrailerById: (id: string) => Trailer | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_BASE_URL = "/api/auth";
const AUTH_TOKEN_KEY = "auth_access_token";
const AUTH_REFRESH_TOKEN_KEY = "auth_refresh_token";
const AUTH_USER_KEY = "auth_user";
const TEST_USERNAME = "admin";
const TEST_PASSWORD = "admin";

interface RefreshPayload {
  refreshToken: string;
}

type AuthEndpoint = "login" | "register" | "refresh" | "logout";

function normalizeErrorMessage(
  errorPayload: unknown,
  fallback: string,
): string {
  if (!errorPayload || typeof errorPayload !== "object") {
    return fallback;
  }

  const maybeMessage = (errorPayload as { message?: string | string[] })
    .message;
  if (Array.isArray(maybeMessage)) {
    return maybeMessage[0] ?? fallback;
  }

  if (typeof maybeMessage === "string") {
    return maybeMessage;
  }

  return fallback;
}

async function requestAuth(
  endpoint: AuthEndpoint,
  body: LoginPayload | RegisterPayload | RefreshPayload,
  headers?: HeadersInit,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Nu ma pot conecta la serviciul de autentificare. Verifica daca backend-ul este pornit.",
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const fallbackMessage =
      endpoint === "login"
        ? "Login failed"
        : endpoint === "register"
          ? "Registration failed"
          : endpoint === "refresh"
            ? "Token refresh failed"
            : "Logout failed";
    throw new Error(normalizeErrorMessage(payload, fallbackMessage));
  }

  return payload;
}

function isAuthResponse(payload: unknown): payload is AuthResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AuthResponse>;
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    typeof candidate.user === "object" &&
    candidate.user !== null
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  const clearSession = useCallback(() => {
    setIsAuthenticated(false);
    setAuthUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }, []);

  const persistSession = useCallback((data: AuthResponse) => {
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setAuthUser(data.user);
    setIsAuthenticated(true);
    accessTokenRef.current = data.accessToken;
    refreshTokenRef.current = data.refreshToken;
    localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
  }, []);

  // Restore auth session from localStorage when available.
  useEffect(() => {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const savedRefreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    const savedUser = localStorage.getItem(AUTH_USER_KEY);

    if (!savedToken || !savedRefreshToken || !savedUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser) as AuthUser;
      setAccessToken(savedToken);
      setRefreshToken(savedRefreshToken);
      setAuthUser(parsedUser);
      setIsAuthenticated(true);
      accessTokenRef.current = savedToken;
      refreshTokenRef.current = savedRefreshToken;
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }, []);

  const refreshAuthSession = useCallback(async (): Promise<boolean> => {
    const currentRefreshToken = refreshTokenRef.current;
    if (!currentRefreshToken) {
      return false;
    }

    try {
      const payload = await requestAuth("refresh", {
        refreshToken: currentRefreshToken,
      });

      if (!isAuthResponse(payload)) {
        throw new Error("Invalid refresh response");
      }

      persistSession(payload);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [clearSession, persistSession]);

  const authFetch = useCallback(
    async (
      input: RequestInfo | URL,
      init: RequestInit = {},
    ): Promise<Response> => {
      const headers = new Headers(init.headers ?? {});
      const currentAccessToken = accessTokenRef.current;
      if (currentAccessToken) {
        headers.set("Authorization", `Bearer ${currentAccessToken}`);
      }

      const initialResponse = await fetch(input, {
        ...init,
        headers,
      });

      if (initialResponse.status !== 401) {
        return initialResponse;
      }

      const didRefresh = await refreshAuthSession();
      if (!didRefresh) {
        return initialResponse;
      }

      const retryHeaders = new Headers(init.headers ?? {});
      const refreshedAccessToken = accessTokenRef.current;
      if (refreshedAccessToken) {
        retryHeaders.set("Authorization", `Bearer ${refreshedAccessToken}`);
      }

      return fetch(input, {
        ...init,
        headers: retryHeaders,
      });
    },
    [refreshAuthSession],
  );

  useEffect(() => {
    if (isAuthenticated && trailers.length === 0) {
      setTrailers(generateMockTrailers());
    }
  }, [isAuthenticated, trailers.length]);

  const login = useCallback(
    async (payload: LoginPayload): Promise<void> => {
      if (
        payload.email === TEST_USERNAME &&
        payload.password === TEST_PASSWORD
      ) {
        const now = new Date().toISOString();
        const testUser: AuthUser = {
          id: "local-admin",
          firstName: "Admin",
          lastName: "Test",
          email: TEST_USERNAME,
          createdAt: now,
          updatedAt: now,
        };

        setAccessToken("local-admin-token");
        setRefreshToken("local-admin-refresh-token");
        setAuthUser(testUser);
        setIsAuthenticated(true);
        accessTokenRef.current = "local-admin-token";
        refreshTokenRef.current = "local-admin-refresh-token";
        localStorage.setItem(AUTH_TOKEN_KEY, "local-admin-token");
        localStorage.setItem(
          AUTH_REFRESH_TOKEN_KEY,
          "local-admin-refresh-token",
        );
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(testUser));
        return;
      }

      const responsePayload = await requestAuth("login", payload);
      if (!isAuthResponse(responsePayload)) {
        throw new Error("Invalid login response");
      }

      persistSession(responsePayload);
    },
    [persistSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<void> => {
      const responsePayload = await requestAuth("register", payload);
      if (isAuthResponse(responsePayload)) {
        persistSession(responsePayload);
      }
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    const currentRefreshToken = refreshTokenRef.current;
    const currentAccessToken = accessTokenRef.current;

    if (currentRefreshToken) {
      try {
        const authHeaders: HeadersInit = currentAccessToken
          ? { Authorization: `Bearer ${currentAccessToken}` }
          : {};

        await requestAuth(
          "logout",
          { refreshToken: currentRefreshToken },
          authHeaders,
        );
      } catch {
        // Local cleanup should still happen even if backend logout fails.
      }
    }

    clearSession();
  }, [clearSession]);

  const getAuthHeaders = useCallback((): HeadersInit => {
    const currentAccessToken = accessTokenRef.current;
    if (!currentAccessToken) {
      return {};
    }

    return {
      Authorization: `Bearer ${currentAccessToken}`,
    };
  }, []);

  const addDocument = useCallback((trailerId: string, document: Document) => {
    setTrailers((prevTrailers) =>
      prevTrailers.map((trailer) => {
        if (trailer.id === trailerId) {
          const newDocuments = [...trailer.documents, document];
          const updatedTrailer = { ...trailer, documents: newDocuments };
          updatedTrailer.urgencyScore = calculateUrgencyScore(newDocuments);
          return updatedTrailer;
        }
        return trailer;
      }),
    );
  }, []);

  const addTrailer = useCallback(
    (payload: {
      registrationNumber: string;
      type: string;
      manufacturer: string;
      manufactureDate: string;
    }) => {
      const manufactureDateUtc = new Date(
        `${payload.manufactureDate}T00:00:00.000Z`,
      ).toISOString();

      const newTrailer: Trailer = {
        id: `trailer-${crypto.randomUUID()}`,
        registrationNumber: payload.registrationNumber.trim(),
        type: payload.type,
        manufacturer: payload.manufacturer.trim(),
        year: new Date(manufactureDateUtc).getUTCFullYear(),
        manufacturedAtUtc: manufactureDateUtc,
        documents: [],
        urgencyScore: 0,
      };

      setTrailers((prevTrailers) => [newTrailer, ...prevTrailers]);
    },
    [],
  );

  const updateDocument = useCallback(
    (trailerId: string, documentId: string, updates: Partial<Document>) => {
      setTrailers((prevTrailers) =>
        prevTrailers.map((trailer) => {
          if (trailer.id === trailerId) {
            const newDocuments = trailer.documents.map((doc) => {
              if (doc.id === documentId) {
                return { ...doc, ...updates };
              }
              return doc;
            });
            const updatedTrailer = { ...trailer, documents: newDocuments };
            updatedTrailer.urgencyScore = calculateUrgencyScore(newDocuments);
            return updatedTrailer;
          }
          return trailer;
        }),
      );
    },
    [],
  );

  const deleteDocument = useCallback(
    (trailerId: string, documentId: string) => {
      setTrailers((prevTrailers) =>
        prevTrailers.map((trailer) => {
          if (trailer.id === trailerId) {
            const newDocuments = trailer.documents.filter(
              (doc) => doc.id !== documentId,
            );
            const updatedTrailer = { ...trailer, documents: newDocuments };
            updatedTrailer.urgencyScore = calculateUrgencyScore(newDocuments);
            return updatedTrailer;
          }
          return trailer;
        }),
      );
    },
    [],
  );

  const getTrailersSorted = useCallback((): Trailer[] => {
    const sorted = [...trailers].sort(
      (a, b) => b.urgencyScore - a.urgencyScore,
    );
    return sorted;
  }, [trailers]);

  const getTrailerById = useCallback(
    (id: string): Trailer | undefined => {
      return trailers.find((t) => t.id === id);
    },
    [trailers],
  );

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        authUser,
        accessToken,
        refreshToken,
        login,
        register,
        logout,
        getAuthHeaders,
        authFetch,
        trailers,
        addTrailer,
        addDocument,
        updateDocument,
        deleteDocument,
        getTrailersSorted,
        getTrailerById,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
