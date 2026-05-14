export default function MaintenancePage() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Our Site';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        <p className="text-xs font-medium tracking-[0.3em] uppercase opacity-50">
          Coming Soon
        </p>

        <h1 className="text-4xl font-semibold tracking-tight leading-tight">
          {siteName}
        </h1>

        <p className="text-sm opacity-60 leading-relaxed">
          We&apos;re working on something. We&apos;ll be back shortly.
        </p>
      </div>
    </main>
  );
}
