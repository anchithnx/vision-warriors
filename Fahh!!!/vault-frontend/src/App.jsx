import { useState, useRef, useCallback, useEffect } from 'react'

const API_BASE = 'http://localhost:5000'

const SCAN_STAGES = [
  { label: 'Reading document structure…',  pct: 15 },
  { label: 'Extracting text with OCR…',    pct: 35 },
  { label: 'Running PII detection engine…',pct: 60 },
  { label: 'Matching Indian ID patterns…', pct: 78 },
  { label: 'Applying redaction masks…',    pct: 92 },
  { label: 'Packaging safe document…',     pct: 100},
]

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

export default function App() {
  const [phase, setPhase]       = useState('upload')   // upload | scanning | result
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile]         = useState(null)
  const [stageIdx, setStageIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)
  const [riskAnimated, setRiskAnimated] = useState(false)
  const fileInputRef = useRef()
  const stageTimer   = useRef()

  // Animate scanning stages while fetch runs
  const startStageAnimation = () => {
    setStageIdx(0)
    setProgress(0)
    let idx = 0
    const step = () => {
      if (idx >= SCAN_STAGES.length - 1) return
      idx++
      setStageIdx(idx)
      setProgress(SCAN_STAGES[idx].pct)
      stageTimer.current = setTimeout(step, 1800 + Math.random() * 400)
    }
    stageTimer.current = setTimeout(step, 1000)
  }

  const stopStageAnimation = () => clearTimeout(stageTimer.current)

  const handleFile = useCallback(async (f) => {
    if (!f) return
    setFile(f)
    setError(null)
    setPhase('scanning')
    startStageAnimation()

    const form = new FormData()
    form.append('file', f)

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        body: form,
      })
      stopStageAnimation()
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Server error')
      }
      const data = await res.json()
      setProgress(100)
      setStageIdx(SCAN_STAGES.length - 1)
      await new Promise(r => setTimeout(r, 600))
      setResult(data)
      setPhase('result')
      setTimeout(() => setRiskAnimated(true), 400)
    } catch (e) {
      stopStageAnimation()
      setError(e.message)
      setPhase('upload')
    }
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const onInputChange = (e) => {
    const f = e.target.files[0]
    if (f) handleFile(f)
  }

  const reset = () => {
    setPhase('upload')
    setFile(null)
    setResult(null)
    setError(null)
    setRiskAnimated(false)
    setProgress(0)
    setStageIdx(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadFile = () => {
    if (!result?.redacted_b64) return
    const ext = result.redacted_ext || 'bin'
    const mime = ext === 'pdf' ? 'application/pdf'
               : ext === 'png' ? 'image/png'
               : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
               : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
               : 'application/octet-stream'
    const blob = base64ToBlob(result.redacted_b64, mime)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `vault_redacted_${file?.name || 'document'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <Header onLogoClick={phase !== 'upload' ? reset : undefined} />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {phase === 'upload'  && <UploadPhase dragOver={dragOver} setDragOver={setDragOver} onDrop={onDrop} fileInputRef={fileInputRef} onInputChange={onInputChange} error={error} />}
        {phase === 'scanning'&& <ScanningPhase file={file} stageIdx={stageIdx} progress={progress} />}
        {phase === 'result'  && <ResultPhase result={result} file={file} onDownload={downloadFile} onReset={reset} riskAnimated={riskAnimated} />}
      </main>

      <Footer />
    </div>
  )
}

/* ─── Header ───────────────────────────────────────────────────────────── */
function Header({ onLogoClick }) {
  return (
    <header className="w-full border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-3 group"
        >
          <div className="w-8 h-8 bg-crimson-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-crimson-700 transition-colors">
            <ShieldIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-700 text-xl tracking-tight text-gray-900">
            Vault
          </span>
        </button>
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
          backend connected
        </div>
      </div>
    </header>
  )
}

/* ─── Upload Phase ──────────────────────────────────────────────────────── */
function UploadPhase({ dragOver, setDragOver, onDrop, fileInputRef, onInputChange, error }) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Hero text */}
      <div className="text-center mb-10 animate-slide-up">
        <div className="inline-flex items-center gap-2 bg-crimson-50 border border-crimson-100 rounded-full px-4 py-1.5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-crimson-500" />
          <span className="text-xs font-body font-500 text-crimson-700 tracking-wide uppercase">Personal Data Privacy Analyzer</span>
        </div>
        <h1 className="font-display font-800 text-5xl text-gray-900 leading-tight mb-4">
          Share documents.<br />
          <span className="text-crimson-600">Not your identity.</span>
        </h1>
        <p className="text-gray-500 font-body text-lg max-w-md mx-auto leading-relaxed">
          Upload any document. We detect and redact Aadhaar, PAN, phone numbers, and 14 other PII types before you share.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer
          ${dragOver ? 'border-crimson-500 bg-crimson-50 scale-[1.01]' : 'border-gray-200 bg-white hover:border-crimson-300 hover:bg-gray-50'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.txt"
          onChange={onInputChange}
        />

        {/* Upload icon */}
        <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors
          ${dragOver ? 'bg-crimson-100' : 'bg-gray-100'}`}>
          <UploadIcon className={`w-8 h-8 transition-colors ${dragOver ? 'text-crimson-600' : 'text-gray-400'}`} />
        </div>

        <p className="font-display font-700 text-lg text-gray-800 mb-1">
          {dragOver ? 'Drop it here' : 'Drop your file here'}
        </p>
        <p className="text-sm text-gray-400 font-body mb-5">or click to browse from your device</p>

        <div className="flex flex-wrap justify-center gap-2">
          {['PDF', 'PNG', 'JPG', 'DOCX', 'XLSX', 'TXT'].map(t => (
            <span key={t} className="px-2.5 py-1 bg-gray-100 rounded-md text-xs font-mono text-gray-500">{t}</span>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-crimson-50 border border-crimson-200 rounded-xl text-crimson-700 text-sm font-body flex items-center gap-3">
          <AlertIcon className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Feature pills */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { icon: '🔒', label: '100% Local', sub: 'Processed on your server' },
          { icon: '⚡', label: '14 PII Types', sub: 'Aadhaar, PAN, IFSC & more' },
          { icon: '📄', label: '6 Formats', sub: 'PDF, DOCX, XLSX, images' },
        ].map(({ icon, label, sub }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="font-display font-700 text-sm text-gray-800">{label}</div>
            <div className="text-xs text-gray-400 font-body mt-0.5">{sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Scanning Phase ────────────────────────────────────────────────────── */
function ScanningPhase({ file, stageIdx, progress }) {
  const stage = SCAN_STAGES[stageIdx]

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      {/* Document visual with scanner */}
      <div className="relative mx-auto w-48 h-64 mb-10 animate-float">
        {/* Document shadow */}
        <div className="absolute -bottom-3 left-4 right-4 h-4 bg-gray-200 rounded-full blur-md" />
        
        {/* Document card */}
        <div className="relative w-full h-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Fake content lines */}
          <div className="p-5 space-y-3 mt-6">
            <div className="h-2 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-200 rounded w-full" />
            <div className="h-2 bg-gray-200 rounded w-5/6" />
            <div className="h-2 bg-gray-100 rounded w-1/2 mt-4" />
            <div className="h-2 bg-gray-200 rounded w-full" />
            <div className="h-2 bg-gray-200 rounded w-4/5" />
            {/* "detected" bars */}
            <div className="h-2.5 bg-crimson-200 rounded w-3/5 mt-2" />
            <div className="h-2 bg-gray-200 rounded w-full" />
            <div className="h-2.5 bg-amber-200 rounded w-2/3" />
            <div className="h-2 bg-gray-200 rounded w-4/5" />
            <div className="h-2.5 bg-crimson-100 rounded w-1/2" />
          </div>
          {/* Scanner beam */}
          <div className="scanner-line" />
          {/* Crimson corner fold */}
          <div className="absolute top-0 right-0 w-10 h-10 bg-crimson-600" style={{
            clipPath: 'polygon(100% 0, 0 0, 100% 100%)'
          }} />
        </div>
      </div>

      {/* Stage label */}
      <div className="mb-3 h-6">
        <p className="text-sm font-mono text-crimson-600 animate-fade-in" key={stageIdx}>
          {stage?.label}
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-crimson-600 to-crimson-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
          style={{ backgroundSize: '200% 100%' }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400 font-mono">
        <span>{file?.name?.length > 30 ? file.name.slice(0, 28) + '…' : file?.name}</span>
        <span>{progress}%</span>
      </div>

      {/* Stage dots */}
      <div className="flex justify-center gap-2 mt-8">
        {SCAN_STAGES.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i < stageIdx   ? 'w-2 h-2 bg-crimson-500' :
              i === stageIdx ? 'w-4 h-2 bg-crimson-600' :
                               'w-2 h-2 bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Result Phase ──────────────────────────────────────────────────────── */
function ResultPhase({ result, file, onDownload, onReset, riskAnimated }) {
  const { summary, findings, redacted_b64, redacted_ext, file_type } = result
  const risk = summary?.risk_score ?? 0
  const totalFindings = summary?.total_findings ?? 0

  // Group findings by type, deduplicated by value
  const grouped = {}
  for (const f of findings) {
    if (!grouped[f.type]) grouped[f.type] = { ...f, values: new Set() }
    grouped[f.type].values.add(f.value)
  }
  const groups = Object.values(grouped).sort(
    (a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)
  )

  // Compute SVG arc for risk score (r=40, circumference=251.2)
  const arcOffset = 251.2 - (riskAnimated ? (risk / 100) * 251.2 : 0)
  const riskColor  = risk >= 75 ? '#dc2626' : risk >= 40 ? '#f59e0b' : '#22c55e'
  const riskLabel  = risk >= 75 ? 'Critical Risk' : risk >= 40 ? 'Moderate Risk' : 'Low Risk'

  const isImage = ['png','jpg','jpeg','webp','bmp'].includes(redacted_ext)

  return (
    <div className="w-full max-w-5xl mx-auto animate-slide-up">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckIcon className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="text-sm font-body font-500 text-emerald-700">Scan complete</span>
          </div>
          <h2 className="font-display font-700 text-2xl text-gray-900">
            {file?.name}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-body text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
          >
            Scan another
          </button>
          <button
            onClick={onDownload}
            className="px-5 py-2 bg-crimson-600 hover:bg-crimson-700 text-white font-body font-500 text-sm rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Download safe file
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left column: Risk gauge + stats */}
        <div className="col-span-1 flex flex-col gap-5">
          {/* Risk score card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm text-center">
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-4">Risk Score</p>
            <div className="relative inline-flex items-center justify-center">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="40"
                  fill="none"
                  stroke={riskColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="251.2"
                  strokeDashoffset={arcOffset}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display font-800 text-2xl" style={{ color: riskColor }}>{risk}</span>
                <span className="text-xs text-gray-400">/100</span>
              </div>
            </div>
            <p className="font-body font-500 text-sm mt-3" style={{ color: riskColor }}>{riskLabel}</p>
          </div>

          {/* Stat cards */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <StatRow label="Total findings" value={totalFindings} color="crimson" />
            <StatRow label="Unique values"  value={summary?.unique_values ?? 0} color="amber" />
            <StatRow label="Critical"  value={summary?.severity_counts?.critical ?? 0} color="red" />
            <StatRow label="High"      value={summary?.severity_counts?.high ?? 0}     color="orange" />
            <StatRow label="Medium"    value={summary?.severity_counts?.medium ?? 0}   color="yellow" />
            <StatRow label="Low"       value={summary?.severity_counts?.low ?? 0}      color="green" />
          </div>

          {/* File meta */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-2 text-xs font-mono text-gray-500">
            <div className="flex justify-between"><span>Format</span><span className="font-500 text-gray-700">{file_type}</span></div>
            <div className="flex justify-between"><span>Pages</span><span className="font-500 text-gray-700">{result.page_count}</span></div>
            <div className="flex justify-between"><span>Size</span><span className="font-500 text-gray-700">{(file?.size / 1024).toFixed(1)} KB</span></div>
          </div>
        </div>

        {/* Middle column: PII findings */}
        <div className="col-span-1 flex flex-col gap-3">
          <h3 className="font-display font-700 text-sm text-gray-500 uppercase tracking-wider">
            Detected PII · {groups.length} type{groups.length !== 1 ? 's' : ''}
          </h3>
          <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
            {groups.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="font-body font-500 text-emerald-700 text-sm">No sensitive data found!</p>
                <p className="text-xs text-emerald-500 mt-1">This document is safe to share.</p>
              </div>
            ) : groups.map((g, i) => (
              <FindingCard key={g.type} finding={g} idx={i} />
            ))}
          </div>
        </div>

        {/* Right column: Document preview */}
        <div className="col-span-1 flex flex-col gap-3">
          <h3 className="font-display font-700 text-sm text-gray-500 uppercase tracking-wider">
            Redacted Preview
          </h3>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
            {redacted_b64 && isImage ? (
              <img
                src={`data:image/png;base64,${redacted_b64}`}
                alt="Redacted document"
                className="w-full h-full object-contain p-3"
              />
            ) : redacted_b64 && redacted_ext === 'pdf' ? (
              <div className="flex flex-col items-center justify-center flex-1 p-6 text-center gap-4">
                <div className="w-16 h-20 bg-crimson-50 border-2 border-crimson-100 rounded-lg flex items-center justify-center">
                  <span className="font-mono font-700 text-crimson-600 text-xs">PDF</span>
                </div>
                <div>
                  <p className="font-body font-500 text-gray-700 text-sm">PDF redacted successfully</p>
                  <p className="text-xs text-gray-400 mt-1">{result.page_count} page{result.page_count !== 1 ? 's' : ''} processed</p>
                </div>
                <div className="w-full bg-gray-50 rounded-lg p-3 text-left">
                  <p className="text-xs font-mono text-gray-400 mb-2">Text preview:</p>
                  <p className="text-xs font-mono text-gray-600 leading-relaxed line-clamp-6 whitespace-pre-wrap">
                    {result.raw_text_preview?.slice(0, 300)}…
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
                <DocumentIcon className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400 font-body">Preview not available<br />for this file type</p>
                <p className="text-xs text-gray-300 mt-2 font-mono">{file_type}</p>
              </div>
            )}

            {/* Download strip */}
            <div className="border-t border-gray-100 p-4">
              <button
                onClick={onDownload}
                className="w-full py-2.5 bg-crimson-600 hover:bg-crimson-700 text-white font-body font-500 text-sm rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
              >
                <DownloadIcon className="w-4 h-4" />
                Download redacted {redacted_ext?.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Sub-components ────────────────────────────────────────────────────── */
function FindingCard({ finding, idx }) {
  const [expanded, setExpanded] = useState(false)
  const vals = [...finding.values]
  const sevClass = `sev-${finding.severity}`

  return (
    <div
      className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm cursor-pointer hover:border-gray-200 transition-all animate-slide-up"
      style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both', opacity: 0 }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{finding.icon}</span>
          <div>
            <p className="font-display font-700 text-sm text-gray-800">{finding.type}</p>
            <p className="text-xs text-gray-400 font-body">{vals.length} instance{vals.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-mono font-500 ${sevClass}`}>
            {finding.severity}
          </span>
          <ChevronIcon className={`w-3.5 h-3.5 text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
          {vals.map((v, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
              <span className="flex-1 font-mono text-xs text-gray-500 truncate">{v}</span>
              <span className="text-xs bg-gray-800 text-white px-1.5 py-0.5 rounded font-mono">redacted</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value, color }) {
  const colorMap = {
    crimson: 'text-crimson-600',
    amber:   'text-amber-600',
    red:     'text-red-600',
    orange:  'text-orange-500',
    yellow:  'text-yellow-600',
    green:   'text-emerald-600',
  }
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-body text-gray-500">{label}</span>
      <span className={`font-display font-700 text-sm ${colorMap[color] || 'text-gray-700'}`}>{value}</span>
    </div>
  )
}

/* ─── Footer ────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-gray-100 py-4 px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-gray-400 font-body">
        <span>Vault — Personal Data Privacy Analyzer</span>
        <span>All processing happens locally on your server.</span>
      </div>
    </footer>
  )
}

/* ─── Utility ───────────────────────────────────────────────────────────── */
function base64ToBlob(b64, mime) {
  const binary = atob(b64)
  const arr    = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/* ─── Icons (inline SVG) ───────────────────────────────────────────────── */
const ShieldIcon   = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
const UploadIcon   = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
const DownloadIcon = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
const CheckIcon    = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
const AlertIcon    = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
const ChevronIcon  = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
const DocumentIcon = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
