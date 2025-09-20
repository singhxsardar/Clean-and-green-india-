import type {
  Issue,
  Worker,
  GeoPoint,
  IssueStatus,
  IssueCategory,
  WorkerRole,
} from "@shared/api";

const ISSUES_KEY = "cleancity.issues.v1";
const WORKERS_KEY = "cleancity.workers.v1";

export function loadIssues(): Issue[] {
  try {
    const raw = localStorage.getItem(ISSUES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Issue[];
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveIssues(issues: Issue[]) {
  localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
  window.dispatchEvent(new StorageEvent("storage", { key: ISSUES_KEY }));
}

export function addIssue(input: {
  title: string;
  description: string;
  category: IssueCategory;
  imageDataUrl?: string;
  location?: GeoPoint;
  address?: string;
  createdBy?: string;
}): Issue {
  const now = Date.now();
  const issue: Issue = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    category: input.category,
    imageDataUrl: input.imageDataUrl,
    location: input.location,
    address: input.address,
    status: "Pending",
    createdAt: now,
    updatedAt: now,
    dueAt: now + 24 * 60 * 60 * 1000,
    createdBy: input.createdBy,
  };
  const all = loadIssues();
  all.unshift(issue);
  saveIssues(all);
  return issue;
}

export function updateIssue(id: string, patch: Partial<Issue>): Issue | null {
  const all = loadIssues();
  const idx = all.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const updated: Issue = { ...all[idx], ...patch, updatedAt: Date.now() };
  all[idx] = updated;
  saveIssues(all);
  return updated;
}

export function updateIssueStatus(id: string, status: IssueStatus) {
  return updateIssue(id, { status });
}

// Workers
export function loadWorkers(): Worker[] {
  try {
    const raw = localStorage.getItem(WORKERS_KEY);
    if (!raw) return defaultWorkers();
    return JSON.parse(raw) as Worker[];
  } catch {
    return defaultWorkers();
  }
}

export function saveWorkers(workers: Worker[]) {
  localStorage.setItem(WORKERS_KEY, JSON.stringify(workers));
}

function defaultWorkers(): Worker[] {
  const base: Worker[] = [
    {
      id: "w-san-1",
      name: "Asha (Sanitation)",
      role: "Sanitation",
      location: { lat: 28.6139, lng: 77.209 },
      active: true,
      phone: "+91-900000001",
    },
    {
      id: "w-plu-1",
      name: "Ravi (Plumber)",
      role: "Plumber",
      location: { lat: 28.62, lng: 77.22 },
      active: true,
      phone: "+91-900000002",
    },
    {
      id: "w-ele-1",
      name: "Neha (Electrician)",
      role: "Electrician",
      location: { lat: 28.605, lng: 77.19 },
      active: true,
      phone: "+91-900000003",
    },
    {
      id: "w-gen-1",
      name: "Sanjay (General)",
      role: "General",
      location: { lat: 28.635, lng: 77.205 },
      active: true,
      phone: "+91-900000004",
    },
  ];
  saveWorkers(base);
  return base;
}

export function roleForCategory(cat: IssueCategory): WorkerRole {
  switch (cat) {
    case "Garbage":
      return "Sanitation";
    case "Broken Pipeline":
      return "Plumber";
    case "Street Light":
      return "Electrician";
    default:
      return "General";
  }
}

export function haversine(a: GeoPoint, b: GeoPoint) {
  const R = 6371e3; // metres
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c; // in metres
}

export function nearestWorker(issue: Issue): Worker | null {
  const workers = loadWorkers().filter((w) => w.active);
  if (!issue.location || workers.length === 0) return null;
  const role = roleForCategory(issue.category);
  const candidates = workers.filter(
    (w) => w.role === role || w.role === "General",
  );
  if (candidates.length === 0) return null;
  let best: Worker | null = null;
  let bestDist = Infinity;
  for (const w of candidates) {
    const d = haversine(issue.location!, w.location);
    if (d < bestDist) {
      best = w;
      bestDist = d;
    }
  }
  return best;
}

export function assignIssueToNearest(issueId: string): {
  assigned: Worker | null;
} {
  const issues = loadIssues();
  const issue = issues.find((i) => i.id === issueId);
  if (!issue) return { assigned: null };
  const worker = nearestWorker(issue);
  if (worker) {
    updateIssue(issueId, { assignedToWorkerId: worker.id });
  }
  return { assigned: worker ?? null };
}

export function exportIssuesToCSV(issues: Issue[]): string {
  const headers = [
    "id",
    "title",
    "category",
    "status",
    "assignedTo",
    "createdAt",
    "dueAt",
    "lat",
    "lng",
    "address",
  ];
  const rows = issues.map((i) =>
    [
      i.id,
      safe(i.title),
      i.category,
      i.status,
      i.assignedToWorkerId ?? "",
      new Date(i.createdAt).toISOString(),
      new Date(i.dueAt).toISOString(),
      i.location?.lat ?? "",
      i.location?.lng ?? "",
      safe(i.address ?? ""),
    ].join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

function safe(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}
