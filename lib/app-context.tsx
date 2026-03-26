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
  AlertStatus,
  RegisterPayload,
  LoginPayload,
  AuthResponse,
  CreateVehiclePayload,
  VehicleResponse,
  VehicleType,
  DocumentUploadResponse,
} from "./types";
import { calculateDocumentStatus, calculateUrgencyScore } from "./mock-data";

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
  trailersLoading: boolean;
  trailersError: string | null;
  createVehicle: (payload: CreateVehiclePayload) => Promise<void>;
  uploadDocument: (
    file: File,
    metadata: {
      title: string;
      type: string;
      issueDate: string;
      expiryDate: string;
    },
    vehicleId?: string,
  ) => Promise<DocumentUploadResponse>;
  getVehicleDocuments: (vehicleId: string) => Promise<DocumentUploadResponse[]>;
  refreshTrailerDocuments: (trailerId: string) => Promise<void>;
  addDocument: (trailerId: string, document: Document) => void;
  updateDocument: (
    trailerId: string,
    documentId: string,
    updates: Partial<Document>,
  ) => void;
  deleteDocument: (trailerId: string, documentId: string) => Promise<void>;
  getTrailersSorted: () => Trailer[];
  getTrailerById: (id: string) => Trailer | undefined;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearNotifications: () => void;
}

export interface AppNotification {
  id: string;
  documentId: string;
  trailerId: string;
  trailerNumber: string;
  documentType: string;
  status: AlertStatus;
  message: string;
  createdAt: string;
  read: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_BASE_URL = "/api/auth";
const AUTH_TOKEN_KEY = "auth_access_token";
const AUTH_REFRESH_TOKEN_KEY = "auth_refresh_token";
const AUTH_USER_KEY = "auth_user";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RefreshPayload {
  refreshToken: string;
}

type AuthEndpoint = "login" | "register" | "refresh" | "logout";

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  SEMIREMORCA_FURGON: "Semiremorca Furgon",
  SEMIREMORCA_CISTERNA: "Semiremorca Cisterna",
  SEMIREMORCA_PLATFORMA: "Semiremorca Platforma",
  REMORCA_PLATFORMA: "Remorca Platforma",
  CAMION: "Camion",
  CAP_CAMION: "Cap Camion",
};

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

function isVehicleResponse(payload: unknown): payload is VehicleResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<VehicleResponse>;
  return (
    typeof candidate.series === "string" &&
    typeof candidate.manufacturer === "string" &&
    typeof candidate.vehicleType === "string" &&
    typeof candidate.manufacturedAtUtc === "string"
  );
}

function mapVehicleToTrailer(vehicle: VehicleResponse): Trailer {
  const manufacturedAtUtc = vehicle.manufacturedAtUtc;

  return {
    id: vehicle.id ?? `trailer-${crypto.randomUUID()}`,
    registrationNumber: vehicle.series,
    manufacturer: vehicle.manufacturer,
    type: VEHICLE_TYPE_LABELS[vehicle.vehicleType],
    year: new Date(manufacturedAtUtc).getUTCFullYear(),
    manufacturedAtUtc,
    documents: [],
    urgencyScore: 0,
  };
}

function parseDocumentType(type: string): Document["type"] {
  const supportedTypes: Document["type"][] = [
    "ITP",
    "RCA",
    "Revizie Tehnica",
    "Carnet Prometeu",
    "Certificat Echilibru",
    "Asigurare Marfa",
    "Certificat Geumatic",
    "Alte Documente",
  ];

  return supportedTypes.includes(type as Document["type"])
    ? (type as Document["type"])
    : "Alte Documente";
}

function mapApiDocumentToLocal(
  apiDocument: DocumentUploadResponse,
  trailerId: string,
): Document {
  return {
    id: apiDocument.id,
    trailerId,
    type: parseDocumentType(apiDocument.type),
    number: apiDocument.title,
    issueDate: apiDocument.issueDate,
    expiryDate: apiDocument.expiryDate,
    fileUrl:
      apiDocument.filePath ??
      `/public/uploads/documents/${apiDocument.fileName ?? ""}`,
    uploadedAt: apiDocument.createdAt.split("T")[0],
    status: calculateDocumentStatus(apiDocument.expiryDate),
  };
}

function removeDocumentFromTrailer(
  trailers: Trailer[],
  trailerId: string,
  documentId: string,
): Trailer[] {
  return trailers.map((trailer) => {
    if (trailer.id !== trailerId) {
      return trailer;
    }

    const newDocuments = trailer.documents.filter(
      (doc) => doc.id !== documentId,
    );
    const updatedTrailer = { ...trailer, documents: newDocuments };
    updatedTrailer.urgencyScore = calculateUrgencyScore(newDocuments);
    return updatedTrailer;
  });
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [trailersLoading, setTrailersLoading] = useState(false);
  const [trailersError, setTrailersError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  const clearSession = useCallback(() => {
    setIsAuthenticated(false);
    setAuthUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setNotifications([]);
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

  const getVehicles = useCallback(async (): Promise<VehicleResponse[]> => {
    let response: Response;

    try {
      response = await authFetch("/api/vehicles", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch {
      throw new Error(
        "Nu ma pot conecta la serviciul de vehicule. Verifica daca backend-ul este pornit.",
      );
    }

    let responsePayload: unknown = null;
    try {
      responsePayload = await response.json();
    } catch {
      responsePayload = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Sesiunea a expirat sau token-ul este invalid. Autentifica-te din nou.",
        );
      }

      throw new Error(
        normalizeErrorMessage(
          responsePayload,
          "Nu am putut incarca vehiculele.",
        ),
      );
    }

    if (!Array.isArray(responsePayload)) {
      return [];
    }

    return responsePayload.filter(isVehicleResponse);
  }, [authFetch]);

  const login = useCallback(
    async (payload: LoginPayload): Promise<void> => {
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

  const uploadDocument = useCallback(
    async (
      file: File,
      metadata: {
        title: string;
        type: string;
        issueDate: string;
        expiryDate: string;
      },
      vehicleId?: string,
    ): Promise<DocumentUploadResponse> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", metadata.title.trim());
      formData.append("type", metadata.type);
      formData.append("issueDate", metadata.issueDate);
      formData.append("expiryDate", metadata.expiryDate);
      if (vehicleId) {
        formData.append("vehicleId", vehicleId);
      }

      let response: Response;
      try {
        response = await authFetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
      } catch {
        throw new Error(
          "Nu ma pot conecta la serviciul de documente. Verifica daca backend-ul este pornit.",
        );
      }

      let responsePayload: unknown = null;
      try {
        responsePayload = await response.json();
      } catch {
        responsePayload = null;
      }

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(
            normalizeErrorMessage(
              responsePayload,
              "Date invalide. Verifica tipul fisierului (PDF/PNG/JPG), dimensiunea maxima 10MB si campurile obligatorii.",
            ),
          );
        }
        if (response.status === 401) {
          throw new Error("Sesiunea a expirat. Autentifica-te din nou.");
        }
        if (response.status === 404) {
          throw new Error("Vehiculul nu exista sau nu iti apartine.");
        }
        throw new Error(
          normalizeErrorMessage(
            responsePayload,
            "Nu am putut incarca documentul.",
          ),
        );
      }

      return responsePayload as DocumentUploadResponse;
    },
    [authFetch],
  );

  const getVehicleDocuments = useCallback(
    async (vehicleId: string): Promise<DocumentUploadResponse[]> => {
      let response: Response;

      try {
        response = await authFetch(`/api/documents/vehicle/${vehicleId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch {
        throw new Error(
          "Nu ma pot conecta la serviciul de documente. Verifica daca backend-ul este pornit.",
        );
      }

      let responsePayload: unknown = null;
      try {
        responsePayload = await response.json();
      } catch {
        responsePayload = null;
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sesiunea a expirat. Autentifica-te din nou.");
        }
        if (response.status === 404) {
          throw new Error("Vehiculul nu exista sau nu iti apartine.");
        }
        throw new Error(
          normalizeErrorMessage(
            responsePayload,
            "Nu am putut incarca lista de documente pentru vehicul.",
          ),
        );
      }

      if (!Array.isArray(responsePayload)) {
        return [];
      }

      return responsePayload as DocumentUploadResponse[];
    },
    [authFetch],
  );

  const refreshTrailerDocuments = useCallback(
    async (trailerId: string): Promise<void> => {
      if (!UUID_REGEX.test(trailerId)) {
        return;
      }

      const apiDocuments = await getVehicleDocuments(trailerId);
      const mappedDocuments = apiDocuments.map((doc) =>
        mapApiDocumentToLocal(doc, trailerId),
      );

      setTrailers((prevTrailers) =>
        prevTrailers.map((trailer) => {
          if (trailer.id !== trailerId) {
            return trailer;
          }

          const updatedTrailer = {
            ...trailer,
            documents: mappedDocuments,
          };
          updatedTrailer.urgencyScore = calculateUrgencyScore(mappedDocuments);
          return updatedTrailer;
        }),
      );
    },
    [getVehicleDocuments],
  );

  const refreshTrailers = useCallback(async (): Promise<void> => {
    setTrailersLoading(true);
    setTrailersError(null);

    try {
      const vehicles = await getVehicles();
      const trailersWithDocuments = await Promise.all(
        vehicles.map(async (vehicle) => {
          const trailer = mapVehicleToTrailer(vehicle);

          if (!trailer.id || !UUID_REGEX.test(trailer.id)) {
            return trailer;
          }

          try {
            const apiDocuments = await getVehicleDocuments(trailer.id);
            const mappedDocuments = apiDocuments.map((doc) =>
              mapApiDocumentToLocal(doc, trailer.id!),
            );

            return {
              ...trailer,
              documents: mappedDocuments,
              urgencyScore: calculateUrgencyScore(mappedDocuments),
            };
          } catch {
            return trailer;
          }
        }),
      );

      setTrailers(trailersWithDocuments);
    } catch (error) {
      setTrailers([]);
      setTrailersError(
        error instanceof Error
          ? error.message
          : "Nu am putut incarca vehiculele.",
      );
    } finally {
      setTrailersLoading(false);
    }
  }, [getVehicleDocuments, getVehicles]);

  useEffect(() => {
    if (!isAuthenticated) {
      setTrailers([]);
      setNotifications([]);
      setTrailersError(null);
      setTrailersLoading(false);
      return;
    }

    void refreshTrailers();
  }, [isAuthenticated, refreshTrailers]);

  useEffect(() => {
    setNotifications((prevNotifications) => {
      const previousByDocumentId = new Map(
        prevNotifications.map((notification) => [
          notification.documentId,
          notification,
        ]),
      );

      const nextNotifications: AppNotification[] = [];

      trailers.forEach((trailer) => {
        trailer.documents.forEach((doc) => {
          if (
            doc.status !== "URGENT" &&
            doc.status !== "EXPIRED" &&
            doc.status !== "ALERT"
          ) {
            return;
          }

          const existing = previousByDocumentId.get(doc.id);
          let message = "";

          if (doc.status === "EXPIRED") {
            message = `Document expirat: ${doc.type} pentru remorca ${trailer.registrationNumber}`;
          } else if (doc.status === "URGENT") {
            message = `Urgent! ${doc.type} expiră curând pentru remorca ${trailer.registrationNumber}`;
          } else {
            message = `Atenție! ${doc.type} va expira în curând pentru remorca ${trailer.registrationNumber}`;
          }

          nextNotifications.push({
            id: existing?.id ?? `notif-${doc.id}`,
            documentId: doc.id,
            trailerId: trailer.id,
            trailerNumber: trailer.registrationNumber,
            documentType: doc.type,
            status: doc.status,
            message,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
            read: existing?.read ?? false,
          });
        });
      });

      nextNotifications.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      return nextNotifications;
    });
  }, [trailers]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification,
      ),
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    );
  }, []);

  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications((prevNotifications) =>
      prevNotifications.filter(
        (notification) => notification.id !== notificationId,
      ),
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadNotificationsCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

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

  const createVehicle = useCallback(
    async (payload: CreateVehiclePayload): Promise<void> => {
      let response: Response;

      try {
        response = await authFetch("/api/vehicles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } catch {
        throw new Error(
          "Nu ma pot conecta la serviciul de vehicule. Verifica daca backend-ul este pornit.",
        );
      }

      let responsePayload: unknown = null;
      try {
        responsePayload = await response.json();
      } catch {
        responsePayload = null;
      }

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(
            normalizeErrorMessage(
              responsePayload,
              "Date invalide. Verifica seria, tipul vehiculului si data de fabricatie in format UTC.",
            ),
          );
        }

        if (response.status === 401) {
          throw new Error(
            "Sesiunea a expirat sau token-ul este invalid. Autentifica-te din nou.",
          );
        }

        if (response.status === 409) {
          throw new Error(
            normalizeErrorMessage(
              responsePayload,
              "Exista deja un vehicul cu aceasta serie in flota selectata.",
            ),
          );
        }

        throw new Error(
          normalizeErrorMessage(
            responsePayload,
            "Nu am putut adauga vehiculul.",
          ),
        );
      }

      const vehicle = isVehicleResponse(responsePayload)
        ? responsePayload
        : {
            series: payload.series,
            manufacturer: payload.manufacturer,
            vehicleType: payload.vehicleType,
            manufacturedAtUtc: payload.manufacturedAtUtc,
            fleetId: payload.fleetId ?? null,
          };

      setTrailers((prevTrailers) => [
        mapVehicleToTrailer(vehicle),
        ...prevTrailers,
      ]);
    },
    [authFetch],
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
    async (trailerId: string, documentId: string): Promise<void> => {
      // Keep local behavior for mock documents with non-UUID ids.
      if (!UUID_REGEX.test(documentId)) {
        setTrailers((prevTrailers) =>
          removeDocumentFromTrailer(prevTrailers, trailerId, documentId),
        );
        return;
      }

      let response: Response;

      try {
        response = await authFetch(`/api/documents/${documentId}`, {
          method: "DELETE",
        });
      } catch {
        throw new Error(
          "Nu ma pot conecta la serviciul de documente. Verifica daca backend-ul este pornit.",
        );
      }

      if (!response.ok) {
        let responsePayload: unknown = null;
        try {
          responsePayload = await response.json();
        } catch {
          responsePayload = null;
        }

        if (response.status === 400) {
          throw new Error(
            normalizeErrorMessage(
              responsePayload,
              "ID-ul documentului este invalid.",
            ),
          );
        }

        if (response.status === 401) {
          throw new Error("Sesiunea a expirat. Autentifica-te din nou.");
        }

        if (response.status === 404) {
          throw new Error("Documentul nu exista sau nu iti apartine.");
        }

        throw new Error(
          normalizeErrorMessage(
            responsePayload,
            "Nu am putut sterge documentul.",
          ),
        );
      }

      setTrailers((prevTrailers) =>
        removeDocumentFromTrailer(prevTrailers, trailerId, documentId),
      );
    },
    [authFetch],
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
        trailersLoading,
        trailersError,
        createVehicle,
        uploadDocument,
        getVehicleDocuments,
        refreshTrailerDocuments,
        addDocument,
        updateDocument,
        deleteDocument,
        getTrailersSorted,
        getTrailerById,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearNotifications,
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
