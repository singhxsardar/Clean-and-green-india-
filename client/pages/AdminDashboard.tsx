import { useEffect, useMemo, useState } from "react";
import MapView from "@/components/MapView";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Issue, IssueStatus, Worker } from "@shared/api";
import {
  exportIssuesToCSV,
  loadIssues,
  loadWorkers,
  saveWorkers,
  updateIssue,
  updateIssueStatus,
} from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [issues, setIssues] = useState<Issue[]>(loadIssues());
  const [workers, setWorkers] = useState<Worker[]>(loadWorkers());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<IssueStatus | "All">("All");

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key?.includes("cleancity.issues")) setIssues(loadIssues());
      if (e.key?.includes("cleancity.workers")) setWorkers(loadWorkers());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (statusFilter !== "All" && i.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    });
  }, [issues, search, statusFilter]);

  const markers = filtered
    .filter((i) => i.location)
    .map((i) => ({
      id: i.id,
      lat: i.location!.lat,
      lng: i.location!.lng,
      title: `${i.category}: ${i.title}`,
      color: colorForStatus(i.status),
    }));

  const center =
    markers.length > 0
      ? { lat: markers[0].lat, lng: markers[0].lng }
      : { lat: 28.6139, lng: 77.209 };

  const exportCSV = () => {
    const csv = exportIssuesToCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleancity-issues-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleancity-issues-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Map of reported issues, assignment, and 24h SLA tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportJSON}>
            Export JSON
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Map View</CardTitle>
            <CardDescription>
              All reported issues with color-coded pins
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues..."
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as any)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <MapView center={center} markers={markers} height={420} />
          <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />{" "}
              Pending
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />{" "}
              In Progress
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />{" "}
              Completed
            </span>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No issues match the filters.
              </CardContent>
            </Card>
          ) : (
            filtered.map((i) => (
              <IssueRow
                key={i.id}
                issue={i}
                workers={workers}
                onChange={(upd) =>
                  setIssues((prev) =>
                    prev.map((x) => (x.id === upd.id ? upd : x)),
                  )
                }
              />
            ))
          )}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teams & Workers</CardTitle>
              <CardDescription>
                Active staff for auto-assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {workers.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {w.name.split(" ")[0][0]}
                      </span>
                      <span>{w.name}</span>
                      <Badge variant="secondary">{w.role}</Badge>
                    </div>
                    <label className="text-xs flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={w.active}
                        onChange={(e) => {
                          const next = workers.map((x) =>
                            x.id === w.id
                              ? { ...x, active: e.target.checked }
                              : x,
                          );
                          setWorkers(next);
                          saveWorkers(next);
                        }}
                      />{" "}
                      Active
                    </label>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SLA Policy</CardTitle>
              <CardDescription>
                Automatic escalation after 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Issues not marked Completed within 24 hours are flagged as
                overdue and should be escalated to the senior officer.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function colorForStatus(s: IssueStatus) {
  switch (s) {
    case "Pending":
      return "#f59e0b";
    case "In Progress":
      return "#0ea5e9";
    case "Completed":
      return "#059669";
  }
}

function IssueRow({
  issue,
  workers,
  onChange,
}: {
  issue: Issue;
  workers: Worker[];
  onChange: (i: Issue) => void;
}) {
  const { toast } = useToast();
  const [proof, setProof] = useState<string | undefined>();

  const assigned = workers.find((w) => w.id === issue.assignedToWorkerId);
  const overdue = issue.dueAt < Date.now() && issue.status !== "Completed";
  const hoursLeft = Math.max(
    0,
    Math.floor((issue.dueAt - Date.now()) / 3_600_000),
  );

  const uploadProof = (file?: File) => {
    if (!file) return setProof(undefined);
    const reader = new FileReader();
    reader.onload = () => setProof(reader.result as string);
    reader.readAsDataURL(file);
  };

  const markStatus = (s: IssueStatus) => {
    const upd = updateIssue(issue.id, {
      status: s,
      proofImageUrl: s === "Completed" ? proof : issue.proofImageUrl,
    });
    if (upd) {
      onChange(upd);
      toast({
        title: `Status updated to ${s}`,
        description: s === "Completed" ? "Completion proof saved" : undefined,
      });
    }
  };

  const reassign = (workerId: string) => {
    const upd = updateIssue(issue.id, { assignedToWorkerId: workerId });
    if (upd) {
      onChange(upd);
      const w = workers.find((x) => x.id === workerId);
      toast({
        title: "Issue reassigned",
        description: w ? `Assigned to ${w.name}` : undefined,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{issue.title}</CardTitle>
            <CardDescription>
              {issue.category} • Filed{" "}
              {new Date(issue.createdAt).toLocaleString()} •{" "}
              {issue.address ??
                (issue.location
                  ? `${issue.location.lat.toFixed(3)}, ${issue.location.lng.toFixed(3)}`
                  : "No location")}
            </CardDescription>
          </div>
          <div className="text-right">
            <Badge
              className={
                overdue && issue.status !== "Completed" ? "bg-destructive" : ""
              }
            >
              {issue.status}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {overdue ? "Overdue" : `Due in ~${hoursLeft}h`}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{issue.description}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Assigned To</label>
            <Select
              value={issue.assignedToWorkerId ?? ""}
              onValueChange={(v) => reassign(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Update Status</label>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={issue.status === "Pending" ? "default" : "outline"}
                onClick={() => markStatus("Pending")}
              >
                Pending
              </Button>
              <Button
                size="sm"
                variant={issue.status === "In Progress" ? "default" : "outline"}
                onClick={() => markStatus("In Progress")}
              >
                In Progress
              </Button>
              <Button
                size="sm"
                variant={issue.status === "Completed" ? "default" : "outline"}
                onClick={() => markStatus("Completed")}
                disabled={!proof && !issue.proofImageUrl}
              >
                Completed
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">
              Completion Proof Photo
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => uploadProof(e.target.files?.[0])}
            />
            {(proof || issue.proofImageUrl) && (
              <img
                src={proof || issue.proofImageUrl}
                alt="Proof"
                className="h-24 w-full object-cover rounded-md border"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
