import { Link } from "wouter"

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="border-b border-border/40 py-4 px-6 md:px-12 flex justify-between items-center">
        <Link href="/" className="font-mono font-semibold tracking-tight text-sm uppercase">
          NU Results
        </Link>
        <nav className="flex gap-4">
          <Link href="/" className="text-xs font-mono uppercase text-muted-foreground hover:text-foreground transition-colors">
            Lookup
          </Link>
          <Link href="/design" className="text-xs font-mono uppercase text-muted-foreground hover:text-foreground transition-colors">
            Design
          </Link>
        </nav>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
