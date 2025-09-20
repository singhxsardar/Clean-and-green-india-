import { Link, useLocation } from "react-router-dom";
import { PropsWithChildren, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: PropsWithChildren) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  const navItems = useMemo(
    () => [
      { to: "/", label: "Report Issue" },
      { to: "/admin", label: "Admin Dashboard" },
    ],
    [],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              CC
            </span>
            <span className="text-lg font-semibold tracking-tight">
              CleanCity
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={location.pathname === item.to ? "default" : "ghost"}
                  className={cn(
                    "rounded-full",
                    location.pathname === item.to && "shadow-sm",
                  )}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main
        className={cn(
          "flex-1",
          isAdmin ? "bg-white" : "bg-gradient-to-b from-secondary to-white",
        )}
      >
        {children}
      </main>
      <footer className="border-t">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-6 text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} CleanCity · Empowering citizen-led
            civic upkeep
          </p>
          <div className="flex items-center gap-4">
            <a className="hover:text-foreground" href="#" aria-disabled>
              Privacy
            </a>
            <a className="hover:text-foreground" href="#" aria-disabled>
              Terms
            </a>
            <a className="hover:text-foreground" href="#" aria-disabled>
              Help
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
