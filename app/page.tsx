import TailorForm from "@/components/TailorForm";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">CV Tailor</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Beta</span>
          </div>
          <p className="text-sm text-gray-500 hidden sm:block">
            Paste a job, upload your CV, get a tailored application.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        <TailorForm />
      </main>

      <footer className="border-t border-gray-200 bg-white px-6 py-4 text-center text-xs text-gray-400">
        CV Tailor — built with Claude
      </footer>
    </div>
  );
}
