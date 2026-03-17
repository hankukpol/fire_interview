export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-white">
      <div className="w-full max-w-none mx-auto md:max-w-[768px] md:mx-auto">
        {children}
      </div>
    </main>
  )
}
