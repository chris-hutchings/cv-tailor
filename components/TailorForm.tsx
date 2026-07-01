'use client'

import { useState, useRef, useEffect } from 'react'

type Tab = 'cv' | 'cover-letter'
type TOV = 'professional' | 'balanced' | 'conversational'
type EnglishVariant = 'uk' | 'us'

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

function ProgressChecklist({ active }: { active: boolean }) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!active) {
      setCurrentStep(0)
      return
    }
    setCurrentStep(0)
    const timings = [0, 3000, 8000, 16000]
    const timers = timings.map((delay, i) =>
      setTimeout(() => setCurrentStep(i), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [active])

  return (
    <div className="flex flex-col gap-4">
      {PROGRESS_STEPS.map((step, i) => {
        const done = i < currentStep
        const inProgress = i === currentStep
        return (
          <div key={step} className="flex items-center gap-3">
            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
              {done ? (
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : inProgress ? (
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-slate-200" />
              )}
            </div>
            <span className={`text-sm font-medium ${
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
  )
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"

export default function TailorForm() {
  const [jobUrl, setJobUrl] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [cvText, setCvText] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('cv')
  const [copied, setCopied] = useState<Tab | null>(null)
  const [tov, setTov] = useState<TOV>('balanced')
  const [englishVariant, setEnglishVariant] = useState<EnglishVariant>('uk')
  const [downloadingDocx, setDownloadingDocx] = useState(false)
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
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, cvText, tov, englishVariant }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResult(data)
      setActiveTab('cv')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(tab: Tab) {
    const text = tab === 'cv' ? result?.cv : result?.coverLetter
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(tab)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleDownloadDocx(tab: Tab) {
    const text = tab === 'cv' ? result?.cv : result?.coverLetter
    if (!text) return
    const filename = tab === 'cv' ? 'tailored-cv' : 'cover-letter'
    setDownloadingDocx(true)
    try {
      const res = await fetch('/api/download-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename }),
      })
      if (!res.ok) throw new Error('Failed to generate document')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      const blob = new Blob([text], { type: 'text/plain' })
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── Input panel ── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-5">

          {/* Job description */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Job description</label>

            {/* URL row */}
            <div className="flex gap-2">
              <input
                type="url"
                value={jobUrl}
                onChange={e => { setJobUrl(e.target.value); setUrlError('') }}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleFetchUrl())}
                placeholder="Paste a job URL to auto-fill..."
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
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {urlError}
              </p>
            )}

            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="…or paste the full job description here"
              rows={9}
              className={inputClass + ' resize-none'}
            />
          </div>

          {/* CV upload */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Your CV</label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 px-4 py-4 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              {parsing ? (
                <p className="text-sm text-indigo-600 font-medium">Parsing file…</p>
              ) : cvFileName ? (
                <p className="text-sm text-emerald-600 font-semibold">✓ {cvFileName}</p>
              ) : (
                <>
                  <p className="text-sm text-slate-500 font-medium">Upload CV</p>
                  <p className="text-xs text-slate-400 mt-0.5">PDF, Word, or TXT — or paste below</p>
                </>
              )}
            </div>

            <textarea
              value={cvText}
              onChange={e => { setCvText(e.target.value); setCvFileName('') }}
              placeholder="…or paste your CV text here"
              rows={7}
              className={inputClass + ' resize-none'}
            />
          </div>

          {/* TOV selector */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Tone of voice</label>
            <div className="grid grid-cols-3 gap-2">
              {(['professional', 'balanced', 'conversational'] as TOV[]).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTov(option)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold capitalize transition-all ${
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

          {/* UK / US toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">English spelling</label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden w-fit bg-slate-100/60">
              {(['uk', 'us'] as EnglishVariant[]).map(variant => (
                <button
                  key={variant}
                  type="button"
                  onClick={() => setEnglishVariant(variant)}
                  className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                    englishVariant === variant
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {variant}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || parsing || !jobDescription.trim() || !cvText.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {loading ? 'Generating…' : 'Tailor my application →'}
          </button>
        </div>
      </form>

      {/* ── Output panel ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        {result ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {(['cv', 'cover-letter'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-3.5 text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab === 'cv' ? 'Tailored CV' : 'Cover Letter'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                {activeTab === 'cv' ? result.cv : result.coverLetter}
              </pre>
            </div>

            {/* Action bar */}
            <div className="border-t border-slate-100 px-6 py-3.5 flex gap-3 bg-slate-50/60">
              <button
                onClick={() => handleCopy(activeTab)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                {copied === activeTab ? '✓ Copied' : 'Copy text'}
              </button>
              <button
                onClick={() => handleDownloadDocx(activeTab)}
                disabled={downloadingDocx}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-xs font-bold text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm"
              >
                {downloadingDocx ? 'Preparing…' : 'Download .docx'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            {loading ? (
              <div className="w-full max-w-xs text-left">
                <p className="text-sm font-bold text-slate-800 mb-6">Tailoring your application…</p>
                <ProgressChecklist active={loading} />
                <p className="text-xs text-slate-400 mt-6">This takes about 15–30 seconds</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-4 text-3xl">
                  📄
                </div>
                <p className="text-sm font-semibold text-slate-600">Your tailored CV and cover letter will appear here</p>
                <p className="text-xs text-slate-400 mt-1.5">Fill in the form on the left and hit generate</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
