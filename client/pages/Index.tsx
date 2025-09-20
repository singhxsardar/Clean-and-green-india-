import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import MapView from "@/components/MapView";
import type { Issue, IssueCategory } from "@shared/api";
import { addIssue, assignIssueToNearest, loadIssues } from "@/lib/store";

function useDeviceId() {
  const [id] = useState(() => {
    const k = "cleancity.deviceId";
    const existing = localStorage.getItem(k);
    if (existing) return existing;
    const v = crypto.randomUUID();
    localStorage.setItem(k, v);
    return v;
  });
  return id;
}

export default function Index() {
  const deviceId = useDeviceId();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<IssueCategory>("Garbage");
  const [description, setDescription] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [location, setLocation] = useState<
    { lat: number; lng: number } | undefined
  >();
  const [address, setAddress] = useState<string | undefined>();
  const [detecting, setDetecting] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    setIssues(
      loadIssues().filter((i) => i.createdBy === deviceId || !i.createdBy),
    );
    const handler = (e: StorageEvent) => {
      if (e.key?.includes("cleancity.issues")) {
        setIssues(
          loadIssues().filter((i) => i.createdBy === deviceId || !i.createdBy),
        );
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [deviceId]);

  const previewMarkers = useMemo(() => {
    return location
      ? [
          {
            id: "me",
            lat: location.lat,
            lng: location.lng,
            title: "Selected Location",
            color: "#0ea5e9",
          },
        ]
      : [];
  }, [location]);

  const onPickImage = (file?: File) => {
    if (!file) return setImageDataUrl(undefined);
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Please enter address manually",
      });
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        toast({
          title: "Location detected",
          description: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        });
        setDetecting(false);
      },
      (err) => {
        const code = (err && (err as any).code) || 0;
        const map: Record<number, string> = {
          1: "Permission denied. Please allow location access.",
          2: "Position unavailable. Try again or enter address manually.",
          3: "Request timed out. Move to an open area or try again.",
        };
        const msg =
          map[code] ||
          (err && (err as any).message) ||
          "Unable to get location.";
        console.warn("Geolocation error:", msg);
        toast({ title: "Unable to get location", description: msg });
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !category) {
      toast({
        title: "Fill required fields",
        description: "Category and description are required",
      });
      return;
    }
    const issue = addIssue({
      title: title || `${category} issue`,
      description,
      category,
      imageDataUrl,
      location,
      address,
      createdBy: deviceId,
    });
    const { assigned } = assignIssueToNearest(issue.id);
    setTitle("");
    setDescription("");
    setImageDataUrl(undefined);
    toast({
      title: "Complaint registered",
      description: assigned
        ? `Assigned to ${assigned.name}. Due in 24 hours.`
        : "Assignment pending. Admin will review shortly.",
    });
    setIssues(
      loadIssues().filter((i) => i.createdBy === deviceId || !i.createdBy),
    );
  };

  return (
    <div className="container mx-auto py-10">
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            Report a Civic Issue
          </h1>
          <p className="text-muted-foreground mb-6">
            Simple OTP/Aadhaar login is not required for this demo. Upload a
            photo, auto-capture your location, and track progress.
          </p>
          <Card>
            <CardHeader>
              <CardTitle>New Complaint</CardTitle>
              <CardDescription>
                Upload photo, select category, add details, and submit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={category}
                      onValueChange={(v) => setCategory(v as IssueCategory)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Garbage">Garbage</SelectItem>
                        <SelectItem value="Broken Pipeline">
                          Broken Pipeline
                        </SelectItem>
                        <SelectItem value="Street Light">
                          Street Light
                        </SelectItem>
                        <SelectItem value="Pothole">Pothole</SelectItem>
                        <SelectItem value="Encroachment">
                          Encroachment
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Title (optional)
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Short title"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Upload Photo</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onPickImage(e.target.files?.[0])}
                    />
                    {imageDataUrl && (
                      <img
                        src={imageDataUrl}
                        alt="Preview"
                        className="mt-2 h-40 w-full object-cover rounded-md border"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={detectLocation}
                        disabled={detecting}
                      >
                        {detecting ? "Detecting..." : "Use current location"}
                      </Button>
                      <Input
                        value={address ?? ""}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Address (optional)"
                      />
                    </div>
                    <div className="rounded-md overflow-hidden border">
                      <MapView
                        center={location}
                        markers={previewMarkers}
                        height={200}
                        interactive={false}
                      />
                    </div>
                    {location && (
                      <p className="text-xs text-muted-foreground">
                        Lat {location.lat.toFixed(5)}, Lng{" "}
                        {location.lng.toFixed(5)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Button className="w-full md:w-auto">Submit Complaint</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>
                24-hour resolution with auto-assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <Badge>1</Badge> Submit complaint with photo + location
                </li>
                <li className="flex gap-3">
                  <Badge>2</Badge> Auto-assigned to nearest staff
                </li>
                <li className="flex gap-3">
                  <Badge>3</Badge> Track status: Pending → In Progress →
                  Completed
                </li>
                <li className="flex gap-3">
                  <Badge>4</Badge> Get notified on updates
                </li>
              </ol>
              <div className="mt-6 rounded-lg border bg-secondary p-4">
                <p className="text-sm text-muted-foreground">
                  For production: integrate Firebase/Flask backend, SMS/Email
                  via Twilio/Fast2SMS/SES, and FCM push notifications.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="text-2xl font-bold mb-4">My Reports</h2>
        {issues.length === 0 ? (
          <p className="text-muted-foreground">No reports yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {issues.map((i) => (
              <IssueCard key={i.id} issue={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const dueInMs = issue.dueAt - Date.now();
  const hoursLeft = Math.max(0, Math.floor(dueInMs / 3_600_000));
  const overdue = dueInMs < 0 && issue.status !== "Completed";
  return (
    <Card className="overflow-hidden">
      {issue.imageDataUrl && (
        <img
          src={issue.imageDataUrl}
          alt={issue.title}
          className="h-40 w-full object-cover"
        />
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{issue.title}</CardTitle>
            <CardDescription>
              Filed {new Date(issue.createdAt).toLocaleString()}
            </CardDescription>
          </div>
          <Badge className="shrink-0">{issue.category}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {issue.description}
        </p>
        <div className="flex items-center gap-2">
          <StatusPill
            status="Pending"
            active={
              issue.status === "Pending" ||
              issue.status === "In Progress" ||
              issue.status === "Completed"
            }
          />
          <div className="h-0.5 w-6 bg-border" />
          <StatusPill
            status="In Progress"
            active={
              issue.status === "In Progress" || issue.status === "Completed"
            }
          />
          <div className="h-0.5 w-6 bg-border" />
          <StatusPill
            status="Completed"
            active={issue.status === "Completed"}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {issue.status === "Completed" ? (
            <span>
              Completed on {new Date(issue.updatedAt).toLocaleString()}
            </span>
          ) : (
            <span>
              {overdue ? (
                <span className="text-destructive font-medium">
                  Overdue - escalated
                </span>
              ) : (
                <>Due in ~{hoursLeft}h</>
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({
  status,
  active,
}: {
  status: "Pending" | "In Progress" | "Completed";
  active: boolean;
}) {
  return (
    <div
      className={
        "text-xs px-2 py-1 rounded-full border " +
        (active
          ? "bg-primary/10 text-primary border-primary/20"
          : "text-muted-foreground bg-muted")
      }
    >
      {status}
    </div>
  );
}
