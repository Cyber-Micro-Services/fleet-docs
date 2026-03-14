"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
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
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  getAuthHeaders: () => HeadersInit;
  trailers: Trailer[];
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
const AUTH_USER_KEY = "auth_user";
const TEST_USERNAME = "admin";
const TEST_PASSWORD = "admin";

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
  endpoint: "login" | "register",
  body: LoginPayload | RegisterPayload,
): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
      endpoint === "login" ? "Login failed" : "Registration failed";
    throw new Error(normalizeErrorMessage(payload, fallbackMessage));
  }

  return payload as AuthResponse;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [trailers, setTrailers] = useState<Trailer[]>([]);

  // Restore auth session from localStorage when available.
  useEffect(() => {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const savedUser = localStorage.getItem(AUTH_USER_KEY);

    if (!savedToken || !savedUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser) as AuthUser;
      setAccessToken(savedToken);
      setAuthUser(parsedUser);
      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && trailers.length === 0) {
      setTrailers(generateMockTrailers());
    }
  }, [isAuthenticated, trailers.length]);

  const login = useCallback(async (payload: LoginPayload): Promise<void> => {
    if (payload.email === TEST_USERNAME && payload.password === TEST_PASSWORD) {
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
      setAuthUser(testUser);
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_TOKEN_KEY, "local-admin-token");
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(testUser));
      return;
    }

    const data = await requestAuth("login", payload);
    setAccessToken(data.accessToken);
    setAuthUser(data.user);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
  }, []);

  const register = useCallback(
    async (payload: RegisterPayload): Promise<void> => {
      await requestAuth("register", payload);
    },
    [],
  );

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setAuthUser(null);
    setAccessToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }, []);

  const getAuthHeaders = useCallback((): HeadersInit => {
    if (!accessToken) {
      return {};
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }, [accessToken]);

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
        login,
        register,
        logout,
        getAuthHeaders,
        trailers,
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
