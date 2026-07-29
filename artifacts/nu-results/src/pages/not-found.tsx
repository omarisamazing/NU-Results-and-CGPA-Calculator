export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <h1 className="font-mono text-6xl md:text-8xl font-bold">404</h1>
      <p className="font-mono uppercase tracking-widest text-muted-foreground text-sm">Resource not found</p>
    </div>
  );
}
