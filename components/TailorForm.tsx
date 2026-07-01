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
    <div className="flex flex-col gap-3">
      {PROGRESS_STEPS.map((step, i) => {
        const done = i < currentStep
        const inProgress = i === currentStep
        return (
          <div key={step} className="flex items-center gap-3">
            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              {done ? (
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : inProgress ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
              )}
            </div>
            <span className={`text-sm ${done ? 'text-gray-400 line-through' : inProgress ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
              {step}
            </span>
          </div>
        )
      })}
    </div>
  )
}

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
      // fallback to txt
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
      {/* Input panel */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">

          {/* Job description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Job description
            </label>

            {/* URL input */}
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={jobUrl}
                onChange={e => { setJobUrl(e.target.value); setUrlError('') }}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleFetchUrl())}
                placeholder="Paste job URL to auto-fill..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={fetchingUrl || !jobUrl.trim()}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {fetchingUrl ? 'Fetching...' : 'Fetch'}
              </button>
            </div>

            {urlError && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-2">
                {urlError}
              </p>
            )}

            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="...or paste the full job description here"
              rows={10}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* CV upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your CV
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="mb-3 cursor-pointer rounded-lg border-2 border-dashed border-gray-200 px-4 py-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              {parsing ? (
                <p className="text-sm text-blue-600">Parsing file...</p>
              ) : cvFileName ? (
                <p className="text-sm text-green-600 font-medium">✓ {cvFileName}</p>
              ) : (
                <p className="text-sm text-gray-500">
                  Upload CV <span className="text-gray-400">(PDF, Word, or TXT)</span>
                  <span className="block text-xs text-gray-400 mt-0.5">or paste below</span>
                </p>
              )}
            </div>

            <textarea
              value={cvText}
              onChange={e => { setCvText(e.target.value); setCvFileName('') }}
              placeholder="...or paste your CV text here"
              rows={8}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* TOV selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tone of voice
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['professional', 'balanced', 'conversational'] as TOV[]).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTov(option)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    tov === option
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* English variant toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              English spelling
            </label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
              {(['uk', 'us'] as EnglishVariant[]).map(variant => (
                <button
                  key={variant}
                  type="button"
                  onClick={() => setEnglishVariant(variant)}
                  className={`px-5 py-2 text-xs font-semibold uppercase transition-colors ${
                    englishVariant === variant
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {variant}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || parsing || !jobDescription.trim() || !cvText.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Generating...' : 'Tailor my application →'}
          </button>
        </div>
      </form>

      {/* Output panel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        {result ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {(['cv', 'cover-letter'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'cv' ? 'Tailored CV' : 'Cover Letter'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-5">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {activeTab === 'cv' ? result.cv : result.coverLetter}
              </pre>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 px-5 py-3 flex gap-2 bg-gray-50">
              <button
                onClick={() => handleCopy(activeTab)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {copied === activeTab ? '✓ Copied' : 'Copy text'}
              </button>
              <button
                onClick={() => handleDownloadDocx(activeTab)}
                disabled={downloadingDocx}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {downloadingDocx ? 'Preparing...' : 'Download .docx'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            {loading ? (
              <div className="w-full max-w-xs text-left">
                <p className="text-sm font-medium text-gray-700 mb-5">Tailoring your application...</p>
                <ProgressChecklist active={loading} />
                <p className="text-xs text-gray-400 mt-5">This takes about 15–30 seconds</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-2xl">📄</div>
                <p className="text-sm font-medium text-gray-500">Your tailored CV and cover letter will appear here</p>
                <p className="text-xs mt-1">Fill in the form and click generate</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
