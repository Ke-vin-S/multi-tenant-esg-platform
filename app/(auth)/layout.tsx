export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-50 via-white to-brand-50 p-4 dark:from-ink-950 dark:via-ink-900 dark:to-brand-900/30">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
