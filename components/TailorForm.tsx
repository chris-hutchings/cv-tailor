'use client'

import { useState, useRef } from 'react'

type Tab = 'cv' | 'cover-letter'

interface GenerateResult {
  cv: string
  coverLetter: string
}

export default function TailorForm() {
  const [jobDescription, setJobDescription] = useState('')
  const [cvText, setCvText] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('cv')
  const [copied, setCopied] = useState<Tab | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        body: JSON.stringify({ jobDescription, cvText }),
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

  function handleDownload(tab: Tab) {
    const text = tab === 'cv' ? result?.cv : result?.coverLetter
    if (!text) return
    const filename = tab === 'cv' ? 'tailored-cv.txt' : 'cover-letter.txt'
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input panel */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Job description
            </label>
            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={10}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your CV
            </label>

            {/* File upload */}
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
                onClick={() => handleDownload(activeTab)}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Download .txt
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            {loading ? (
              <>
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-gray-500">Tailoring your application...</p>
                <p className="text-xs text-gray-400 mt-1">This takes about 15–30 seconds</p>
              </>
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
