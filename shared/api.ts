/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// Civic issue domain types
export type IssueCategory =
  | "Garbage"
  | "Broken Pipeline"
  | "Street Light"
  | "Pothole"
  | "Encroachment"
  | "Other";

export type IssueStatus = "Pending" | "In Progress" | "Completed";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  imageDataUrl?: string; // citizen photo
  proofImageUrl?: string; // staff proof
  location?: GeoPoint;
  address?: string;
  status: IssueStatus;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  assignedToWorkerId?: string;
  dueAt: number; // epoch ms (24h from creation)
  createdBy?: string; // optional citizen identifier
}

export type WorkerRole = "Sanitation" | "Plumber" | "Electrician" | "General";

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  location: GeoPoint;
  phone?: string;
  email?: string;
  active: boolean;
}
