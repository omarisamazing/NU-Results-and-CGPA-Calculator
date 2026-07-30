import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="border-b border-border/40 py-4 px-6 md:px-12 flex justify-between items-center">
        <Link href="/" className="font-mono font-semibold tracking-tight text-sm uppercase">
          NU Results
        </Link>
        <nav className="flex gap-6">
          <Link
            href="/"
            className={cn(
              "text-xs font-mono uppercase tracking-wider transition-colors",
              location === "/" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Lookup
          </Link>
          <Link
            href="/calculator"
            className={cn(
              "text-xs font-mono uppercase tracking-wider transition-colors",
              location.startsWith("/calculator") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Calculator
          </Link>
        </nav>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
