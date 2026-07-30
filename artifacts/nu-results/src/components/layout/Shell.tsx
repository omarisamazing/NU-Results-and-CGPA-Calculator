import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import { Phone, Mail, Facebook, ExternalLink } from "lucide-react"

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="no-print border-b border-border/40 py-4 px-6 md:px-12 flex justify-between items-center">
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
      <footer className="no-print border-t border-border/30 py-4 px-6 md:px-12">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-muted-foreground">
          <span className="uppercase tracking-wider text-muted-foreground/50">Contact</span>
          <a
            href="https://www.facebook.com/omarisamazing/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Facebook className="w-3 h-3" />
            Facebook
          </a>
          <a
            href="https://www.fiverr.com/omarisamazing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Fiverr
          </a>
          <a
            href="tel:+8801856733357"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Phone className="w-3 h-3" />
            +8801856733357
          </a>
          <a
            href="mailto:omarisamazing365@gmail.com"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Mail className="w-3 h-3" />
            omarisamazing365@gmail.com
          </a>
        </div>
      </footer>
    </div>
  )
}
