import TailorForm from "@/components/TailorForm";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Bold dark header */}
      <header className="relative bg-slate-950 px-6 py-5 overflow-hidden">
        {/* Ambient glow blobs */}
        <div className="absolute -top-20 left-1/4 w-96 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-20 right-1/4 w-72 h-64 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <span className="text-2xl font-black text-white tracking-tight">CV</span>
              <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Tailor</span>
            </div>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-500/30 tracking-wide">
              BETA
            </span>
          </div>
          <p className="text-sm text-slate-400 hidden sm:block">
            AI-powered CVs that get you to interview.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        <TailorForm />
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-400">
        CV Tailor — built with Claude
      </footer>
    </div>
  );
}
