export type DocumentType =
  | "ITP"
  | "RCA"
  | "Revizie Tehnica"
  | "Carnet Prometeu"
  | "Certificat Echilibru"
  | "Asigurare Marfa"
  | "Certificat Geumatic"
  | "Alte Documente";

export type AlertStatus = "EXPIRED" | "URGENT" | "ALERT" | "WARNING" | "NORMAL";

export type VehicleType =
  | "SEMIREMORCA_FURGON"
  | "SEMIREMORCA_CISTERNA"
  | "SEMIREMORCA_PLATFORMA"
  | "REMORCA_PLATFORMA"
  | "CAMION"
  | "CAP_CAMION";

export interface Document {
  id: string;
  trailerId: string;
  type: DocumentType;
  number: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
  uploadedAt: string;
  status: AlertStatus;
}

export interface Trailer {
  id: string;
  registrationNumber: string;
  type: string;
  manufacturer: string;
  year: number;
  manufacturedAtUtc?: string;
  documents: Document[];
  urgencyScore: number; // 0-100, higher = more urgent
}

export interface CreateVehiclePayload {
  series: string;
  manufacturer: string;
  vehicleType: VehicleType;
  manufacturedAtUtc: string;
  fleetId?: string;
}

export interface VehicleResponse {
  id?: string;
  series: string;
  manufacturer: string;
  vehicleType: VehicleType;
  manufacturedAtUtc: string;
  fleetId?: string | null;
}

export interface AppState {
  isAuthenticated: boolean;
  trailers: Trailer[];
  alerts: AlertLog[];
}

export interface AlertLog {
  id: string;
  documentId: string;
  trailerId: string;
  message: string;
  sentAt: string;
  type: "EMAIL" | "IN_APP";
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
