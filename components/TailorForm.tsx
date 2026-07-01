'use client'

import { useState, useRef, useEffect } from 'react'

type Screen = 'input' | 'loading' | 'output'
type Tab = 'cv' | 'cover-letter'
type TOV = 'professional' | 'balanced' | 'conversational'
type EnglishVariant = 'uk' | 'us'
type SummaryLength = 'brief' | 'normal'

interface CVPreferences {
  includeSummary: boolean
  summaryLength: SummaryLength
  includeSkills: boolean
  maxSkills: number
}

interface GenerateResult {
  cv: string
  coverLetter: string
}

const PROGRESS_STEPS = [
  'Reading your CV',
  'Analysing job description',
  'Tailoring your CV',
  'Writing cover letter',
]

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow'

// ── Progress screen ────────────────────────────────────────────────
function LoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    setCurrentStep(0)
    const timings = [0, 3000, 8000, 16000]
    const timers = timings.map((delay, i) =>
      setTimeout(() => setCurrentStep(i), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm">
        <p className="text-xl font-bold text-slate-900 mb-8">Tailoring your application…</p>
        <div className="flex flex-col gap-5">
          {PROGRESS_STEPS.map((step, i) => {
            const done = i < currentStep
            const inProgress = i === currentStep
            return (
              <div key={step} className="flex items-center gap-4">
                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                  {done ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : inProgress ? (
                    <div className="w-7 h-7 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-slate-200" />
                  )}
                </div>
                <span className={`text-base font-medium ${
                  done ? 'text-slate-400 line-through' :
                  inProgress ? 'text-slate-900' :
                  'text-slate-400'
                }`}>
                  {step}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-400 mt-10">This usually takes 15–30 seconds</p>
      </div>
    </div>
  )
}

// ── Output screen ──────────────────────────────────────────────────
function OutputScreen({
  result,
  cvName,
  onStartOver,
}: {
  result: GenerateResult
  cvName: string
  onStartOver: () => void
}) {
  const [activeTab, setActiveTab] = useState<Tab>('cv')
  const [copied, setCopied] = useState(false)
  const [downloadingDocx, setDownloadingDocx] = useState(false)

  const activeText = activeTab === 'cv' ? result.cv : result.coverLetter

  const baseFilename = cvName.trim()
    ? cvName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : activeTab === 'cv' ? 'tailored-cv' : 'cover-letter'

  const filename = activeTab === 'cv' ? `${baseFilename}-cv` : `${baseFilename}-cover-letter`

  async function handleCopy() {
    await navigator.clipboard.writeText(activeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownloadDocx() {
    setDownloadingDocx(true)
    try {
      const res = await fetch('/api/download-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: activeText, filename }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      const blob = new Blob([activeText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingDocx(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <button
        onClick={onStartOver}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        New application
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          {(['cv', 'cover-letter'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'cv' ? 'Tailored CV' : 'Cover Letter'}
            </button>
          ))}
        </div>

        <div className="p-8">
          <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
            {activeText}
          </pre>
        </div>

        <div className="border-t border-slate-100 px-8 py-4 flex gap-3 bg-slate-50/60">
          <button
            onClick={handleCopy}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy text'}
          </button>
          <button
            onClick={handleDownloadDocx}
            disabled={downloadingDocx}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {downloadingDocx ? 'Preparing…' : 'Download .docx'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Small toggle helper ────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  )
}

// ── Input screen ───────────────────────────────────────────────────
export default function TailorForm() {
  const [screen, setScreen] = useState<Screen>('input')
  const [result, setResult] = useState<GenerateResult | null>(null)

  const [jobUrl, setJobUrl] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [cvText, setCvText] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [cvName, setCvName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')

  // Preferences
  const [tov, setTov] = useState<TOV>('balanced')
  const [englishVariant, setEnglishVariant] = useState<EnglishVariant>('uk')
  const [includeSummary, setIncludeSummary] = useState(true)
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('normal')
  const [includeSkills, setIncludeSkills] = useState(true)
  const [maxSkills, setMaxSkills] = useState(10)

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFetchUrl() {
    const trimmed = jobUrl.trim()
    if (!trimmed) return
    setFetchingUrl(true)
    setUrlError('')
    try {
      const res = await fetch('/api/fetch-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setJobDescription(data.text)
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Could not fetch this URL. Please paste the job description instead.')
    } finally {
      setFetchingUrl(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCvFileName(file.name)
    setParsing(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-cv', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to parse CV')
      setCvText(data.text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
      setCvFileName('')
    } finally {
      setParsing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!jobDescription.trim() || !cvText.trim()) {
      setError('Please provide both a job description and your CV.')
      return
    }
    setError('')
    setScreen('loading')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          cvText,
          tov,
          englishVariant,
          cvPreferences: { includeSummary, summaryLength, includeSkills, maxSkills },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResult(data)
      setScreen('output')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setScreen('input')
    }
  }

  if (screen === 'loading') return <LoadingScreen />

  if (screen === 'output' && result) {
    return (
      <OutputScreen
        result={result}
        cvName={cvName}
        onStartOver={() => { setScreen('input'); setResult(null) }}
      />
    )
  }

  // ── 2-column input layout ──
  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

      {/* ── Left col (wider): job + CV ── */}
      <div className="lg:col-span-3 flex flex-col gap-5">

        {/* The job */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">The job</h2>

          <div className="flex gap-2">
            <input
              type="url"
              value={jobUrl}
              onChange={e => { setJobUrl(e.target.value); setUrlError('') }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleFetchUrl())}
              placeholder="Paste a job URL to auto-fill…"
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleFetchUrl}
              disabled={fetchingUrl || !jobUrl.trim()}
              className="shrink-0 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {fetchingUrl ? 'Fetching…' : 'Fetch'}
            </button>
          </div>

          {urlError && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              {urlError}
            </p>
          )}

          <textarea
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            placeholder="…or paste the full job description here"
            rows={7}
            className={inputClass + ' resize-none'}
          />
        </div>

        {/* Your CV */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your CV</h2>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 px-6 py-4 text-center hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            {parsing ? (
              <p className="text-sm text-indigo-600 font-semibold">Parsing file…</p>
            ) : cvFileName ? (
              <p className="text-sm text-emerald-600 font-semibold">✓ {cvFileName}</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-600">Upload your CV</p>
                <p className="text-xs text-slate-400 mt-0.5">PDF, Word, or TXT — or paste below</p>
              </>
            )}
          </div>

          <textarea
            value={cvText}
            onChange={e => { setCvText(e.target.value); setCvFileName('') }}
            placeholder="…or paste your CV text here"
            rows={6}
            className={inputClass + ' resize-none'}
          />
        </div>
      </div>

      {/* ── Right col (narrower): preferences + button ── */}
      <div className="lg:col-span-2 flex flex-col gap-5">

        {/* Application name */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Application name</h2>
          <input
            type="text"
            value={cvName}
            onChange={e => setCvName(e.target.value)}
            placeholder="e.g. Google — Product Manager"
            className={inputClass}
          />
          <p className="text-xs text-slate-400">Used as the filename when downloading</p>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preferences</h2>

          {/* TOV */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Tone of voice</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['professional', 'balanced', 'conversational'] as TOV[]).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTov(option)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold capitalize transition-all ${
                    tov === option
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* UK / US */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">English spelling</label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden w-fit bg-slate-50">
              {(['uk', 'us'] as EnglishVariant[]).map(variant => (
                <button
                  key={variant}
                  type="button"
                  onClick={() => setEnglishVariant(variant)}
                  className={`px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                    englishVariant === variant
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {variant}
                </button>
              ))}
            </div>
          </div>

          {/* Professional summary */}
          <div className="flex flex-col gap-2.5 pt-1 border-t border-slate-100">
            <Toggle
              checked={includeSummary}
              onChange={setIncludeSummary}
              label="Professional summary"
            />
            {includeSummary && (
              <div className="ml-11 flex gap-2">
                {(['brief', 'normal'] as SummaryLength[]).map(len => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setSummaryLength(len)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                      summaryLength === len
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {len === 'brief' ? 'Brief' : 'Full'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Key skills */}
          <div className="flex flex-col gap-2.5 pt-1 border-t border-slate-100">
            <Toggle
              checked={includeSkills}
              onChange={setIncludeSkills}
              label="Key skills section"
            />
            {includeSkills && (
              <div className="ml-11 flex items-center gap-3">
                <label className="text-xs text-slate-500 whitespace-nowrap">Max skills</label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={maxSkills}
                  onChange={e => setMaxSkills(Math.min(20, Math.max(3, parseInt(e.target.value) || 3)))}
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={parsing || !jobDescription.trim() || !cvText.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-4 text-base font-bold text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          Tailor my application →
        </button>
      </div>
    </form>
  )
}
