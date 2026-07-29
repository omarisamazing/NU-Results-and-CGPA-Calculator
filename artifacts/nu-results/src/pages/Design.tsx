import { Shell } from "@/components/layout/Shell"

export default function Design() {
  const colors = [
    { name: "Background", var: "var(--background)" },
    { name: "Foreground", var: "var(--foreground)" },
    { name: "Primary", var: "var(--primary)" },
    { name: "Primary Fore", var: "var(--primary-foreground)" },
    { name: "Secondary", var: "var(--secondary)" },
    { name: "Secondary Fore", var: "var(--secondary-foreground)" },
    { name: "Muted", var: "var(--muted)" },
    { name: "Muted Fore", var: "var(--muted-foreground)" },
    { name: "Accent", var: "var(--accent)" },
    { name: "Accent Fore", var: "var(--accent-foreground)" },
    { name: "Destructive", var: "var(--destructive)" },
    { name: "Destructive Fore", var: "var(--destructive-foreground)" },
    { name: "Border", var: "var(--border)" },
    { name: "Input", var: "var(--input)" },
    { name: "Ring", var: "var(--ring)" },
    { name: "Card", var: "var(--card)" },
    { name: "Card Fore", var: "var(--card-foreground)" },
  ]

  const typeScale = [
    { label: "text-9xl", size: "text-9xl" },
    { label: "text-8xl", size: "text-8xl" },
    { label: "text-7xl", size: "text-7xl" },
    { label: "text-6xl", size: "text-6xl" },
    { label: "text-5xl", size: "text-5xl" },
    { label: "text-4xl", size: "text-4xl" },
    { label: "text-3xl", size: "text-3xl" },
    { label: "text-2xl", size: "text-2xl" },
    { label: "text-xl", size: "text-xl" },
    { label: "text-lg", size: "text-lg" },
    { label: "text-base", size: "text-base" },
    { label: "text-sm", size: "text-sm" },
    { label: "text-xs", size: "text-xs" },
  ]

  const spacing = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16]
  
  const shadows = [
    "shadow-2xs", "shadow-xs", "shadow-sm", "shadow", "shadow-md", "shadow-lg", "shadow-xl", "shadow-2xl"
  ]

  return (
    <div className="p-8 md:p-16 max-w-7xl mx-auto w-full space-y-32">
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tighter">Design System.</h1>
        <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Typography, Color & Scale Instrument</p>
      </div>

      <section className="space-y-12">
        <h2 className="font-mono text-xs uppercase tracking-widest border-b border-border pb-4">01. Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {colors.map((c) => (
            <div key={c.name} className="space-y-3">
              <div 
                className="h-24 w-full rounded-md border border-border shadow-sm" 
                style={{ backgroundColor: `hsl(${c.var})` }} 
              />
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{c.var}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-12">
        <h2 className="font-mono text-xs uppercase tracking-widest border-b border-border pb-4">02. Typography / Sans</h2>
        <div className="space-y-12 overflow-hidden">
          {typeScale.map((t) => (
            <div key={t.label + "-sans"} className="flex flex-col md:flex-row md:items-baseline gap-4">
              <div className="w-32 shrink-0 font-mono text-xs text-muted-foreground">{t.label}</div>
              <div className={`${t.size} font-sans font-semibold tracking-tight truncate`}>The quick brown fox</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-12">
        <h2 className="font-mono text-xs uppercase tracking-widest border-b border-border pb-4">03. Typography / Mono</h2>
        <div className="space-y-12 overflow-hidden">
          {typeScale.map((t) => (
            <div key={t.label + "-mono"} className="flex flex-col md:flex-row md:items-baseline gap-4">
              <div className="w-32 shrink-0 font-mono text-xs text-muted-foreground">{t.label}</div>
              <div className={`${t.size} font-mono truncate`}>The quick brown fox</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-12">
        <h2 className="font-mono text-xs uppercase tracking-widest border-b border-border pb-4">04. Spacing Scale</h2>
        <div className="space-y-4">
          {spacing.map((s) => (
            <div key={s} className="flex items-center gap-6">
              <div className="w-16 font-mono text-xs text-muted-foreground text-right">{s}</div>
              <div className="h-6 bg-primary" style={{ width: `${s * 0.25}rem` }} />
              <div className="font-mono text-xs text-muted-foreground">{s * 0.25}rem</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-12 pb-24">
        <h2 className="font-mono text-xs uppercase tracking-widest border-b border-border pb-4">05. Shadows</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {shadows.map((s) => (
            <div key={s} className="space-y-4">
              <div className={`h-32 w-full bg-card border border-border rounded-lg flex items-center justify-center ${s}`}>
              </div>
              <div className="text-center font-mono text-xs text-muted-foreground">{s}</div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
