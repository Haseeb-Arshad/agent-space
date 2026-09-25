import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  Globe,
  Headphones,
  Languages,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  Plus,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import './App.css'

type StepNumber = 1 | 2 | 3 | 4
type AgentRole = 'support' | 'sales' | 'general'
type AgentTone = 'warm' | 'clear' | 'polished'
type KnowledgeFilter = 'all' | 'review' | 'verified'

type KnowledgeItem = {
  id: string
  title: string
  source: string
  kind: 'Website page' | 'Manual FAQ' | 'Uploaded file'
  excerpt: string
  verified: boolean
}

type WorkspaceDraft = {
  currentStep: StepNumber
  furthestStep: StepNumber
  agentName: string
  website: string
  role: AgentRole
  tone: AgentTone
  languages: string[]
  instructions: string
  boundaries: string
  agentProfileSaved: boolean
  scanComplete: boolean
  knowledgeItems: KnowledgeItem[]
}

const STORAGE_KEY = 'agent-space.front-desk-onboarding.v1'

const initialWorkspace: WorkspaceDraft = {
  currentStep: 1,
  furthestStep: 1,
  agentName: 'Website assistant',
  website: '',
  role: 'support',
  tone: 'warm',
  languages: ['English'],
  instructions: 'Be helpful, concise, and grounded in the company information that has been reviewed.',
  boundaries: 'Do not invent prices, policies, availability, or promises. Say when you do not know.',
  agentProfileSaved: false,
  scanComplete: false,
  knowledgeItems: [],
}

const steps = [
  { number: 1 as const, title: 'Create an agent', caption: 'Set the basics' },
  { number: 2 as const, title: 'Scan your company', caption: 'Preview discovery' },
  { number: 3 as const, title: 'Review knowledge', caption: 'Check what it knows' },
  { number: 4 as const, title: 'Define the agent', caption: 'Voice & boundaries' },
]

const roles: { id: AgentRole; title: string; description: string; icon: LucideIcon }[] = [
  { id: 'support', title: 'Customer support', description: 'Help customers find answers', icon: Headphones },
  { id: 'sales', title: 'Sales assistant', description: 'Guide visitors to the right fit', icon: Store },
  { id: 'general', title: 'General assistant', description: 'Welcome and help everyone', icon: Sparkles },
]

const tones: { id: AgentTone; title: string; description: string }[] = [
  { id: 'warm', title: 'Warm', description: 'Friendly and welcoming' },
  { id: 'clear', title: 'Clear', description: 'Direct and to the point' },
  { id: 'polished', title: 'Polished', description: 'Calm and professional' },
]

const supportedLanguages = ['English', 'Urdu', 'Arabic']

const pageCopy: Record<StepNumber, { title: string; description: string }> = {
  1: { title: 'Give your website a front desk.', description: 'Start with your website. We’ll guide you through the first draft of your company agent.' },
  2: { title: 'Let’s see what your company knows.', description: 'See how company discovery will work, then preview the knowledge your agent can use.' },
  3: { title: 'Review the starting knowledge.', description: 'Check every example before it becomes part of your agent’s answers.' },
  4: { title: 'Set the way your agent speaks.', description: 'Give it a role, a voice, and clear boundaries for the answers it can give.' },
}

function isStepNumber(value: unknown): value is StepNumber {
  return value === 1 || value === 2 || value === 3 || value === 4
}

function loadWorkspace(): WorkspaceDraft {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return initialWorkspace
    const parsed = JSON.parse(stored) as Partial<WorkspaceDraft>
    const currentStep = isStepNumber(parsed.currentStep) ? parsed.currentStep : 1
    const furthestStep = isStepNumber(parsed.furthestStep) ? Math.max(currentStep, parsed.furthestStep) as StepNumber : currentStep
    return {
      ...initialWorkspace,
      ...parsed,
      currentStep,
      furthestStep,
      languages: Array.isArray(parsed.languages) ? parsed.languages.filter((language): language is string => typeof language === 'string') : initialWorkspace.languages,
      knowledgeItems: Array.isArray(parsed.knowledgeItems) ? parsed.knowledgeItems : [],
    }
  } catch {
    return initialWorkspace
  }
}

function hostFromUrl(value: string): string {
  if (!value.trim()) return 'yourwebsite.com'
  try {
    const candidate = value.includes('://') ? value : `https://${value}`
    return new URL(candidate).hostname.replace(/^www\./, '')
  } catch {
    return value.replace(/^https?:\/\//, '').split('/')[0] || 'yourwebsite.com'
  }
}

function pageUrl(website: string, path: string): string {
  return `https://${hostFromUrl(website)}${path}`
}

function sampleKnowledge(website: string): KnowledgeItem[] {
  return [
    {
      id: crypto.randomUUID(),
      title: 'About the company',
      source: pageUrl(website, '/about'),
      kind: 'Website page',
      excerpt: 'Example excerpt: add a short description of what your company does and who it serves.',
      verified: false,
    },
    {
      id: crypto.randomUUID(),
      title: 'Contact information',
      source: pageUrl(website, '/contact'),
      kind: 'Website page',
      excerpt: 'Example excerpt: include your preferred support contact and business hours.',
      verified: false,
    },
    {
      id: crypto.randomUUID(),
      title: 'Shipping and returns',
      source: pageUrl(website, '/shipping'),
      kind: 'Website page',
      excerpt: 'Example excerpt: describe delivery regions, shipping times, and your return policy.',
      verified: false,
    },
    {
      id: crypto.randomUUID(),
      title: 'What can you help me with?',
      source: 'Example FAQ',
      kind: 'Manual FAQ',
      excerpt: 'Example answer: share the topics your front desk should be ready to help with.',
      verified: false,
    },
  ]
}

function App() {
  const [workspace, setWorkspace] = useState<WorkspaceDraft>(loadWorkspace)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [urlError, setUrlError] = useState('')
  const [showFaqForm, setShowFaqForm] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [filter, setFilter] = useState<KnowledgeFilter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', excerpt: '' })
  const [notice, setNotice] = useState('')

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  }, [workspace])

  useEffect(() => {
    if (!isScanning) return
    let progress = 0
    let finishTimer = 0
    const interval = window.setInterval(() => {
      progress = Math.min(progress + 4, 100)
      setScanProgress(progress)
      if (progress === 100) {
        window.clearInterval(interval)
        finishTimer = window.setTimeout(() => {
          setWorkspace((current) => ({
            ...current,
            scanComplete: true,
            knowledgeItems: sampleKnowledge(current.website),
          }))
          setIsScanning(false)
        }, 240)
      }
    }, 52)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(finishTimer)
    }
  }, [isScanning])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3600)
    return () => window.clearTimeout(timeout)
  }, [notice])

  function updateWorkspace<K extends keyof WorkspaceDraft>(key: K, value: WorkspaceDraft[K]) {
    setWorkspace((current) => ({ ...current, [key]: value }))
  }

  function navigateToStep(step: StepNumber) {
    setWorkspace((current) => ({
      ...current,
      currentStep: step,
      furthestStep: Math.max(current.furthestStep, step) as StepNumber,
    }))
  }

  function createAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = workspace.website.trim()
    const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`
    try {
      const parsed = new URL(candidate)
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('invalid')
      setUrlError('')
      setWorkspace((current) => ({
        ...current,
        website: `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/$/, '')}`,
        currentStep: 2,
        furthestStep: 2,
        agentProfileSaved: false,
        scanComplete: false,
        knowledgeItems: [],
      }))
      setScanProgress(0)
    } catch {
      setUrlError('Enter a valid website address, such as yourcompany.com.')
    }
  }

  function beginSampleScan() {
    if (workspace.scanComplete) {
      navigateToStep(3)
      return
    }
    setScanProgress(0)
    setIsScanning(true)
  }

  function selectStep(step: StepNumber) {
    const available = step === 1
      || (step === 2 && Boolean(workspace.website))
      || (step === 3 && workspace.scanComplete)
      || (step === 4 && workspace.furthestStep >= 4)
    if (available) navigateToStep(step)
  }

  function saveAgentProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setWorkspace((current) => ({ ...current, agentProfileSaved: true }))
    setNotice('Agent behavior saved to your draft.')
  }

  function addFaq(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const question = newQuestion.trim()
    const answer = newAnswer.trim()
    if (!question || !answer) return
    const nextItem: KnowledgeItem = {
      id: crypto.randomUUID(),
      title: question,
      source: 'Added by you',
      kind: 'Manual FAQ',
      excerpt: answer,
      verified: false,
    }
    setWorkspace((current) => ({ ...current, knowledgeItems: [nextItem, ...current.knowledgeItems] }))
    setNewQuestion('')
    setNewAnswer('')
    setShowFaqForm(false)
    setNotice('FAQ added to your review list.')
  }

  async function addTextFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    if (!/\.(txt|csv)$/i.test(file.name)) {
      setNotice('This prototype can preview TXT and CSV files only.')
      input.value = ''
      return
    }
    if (file.size > 100_000) {
      setNotice('Choose a file under 100 KB for this local preview.')
      input.value = ''
      return
    }
    try {
      const content = (await file.text()).trim()
      if (!content) {
        setNotice('That file is empty. Choose a file with text to review.')
        input.value = ''
        return
      }
      const preview = content.slice(0, 1200)
      const item: KnowledgeItem = {
        id: crypto.randomUUID(),
        title: file.name,
        source: `Local file · ${file.name}`,
        kind: 'Uploaded file',
        excerpt: content.length > 1200 ? `${preview}\n\n[Preview shortened. The prototype does not index the full file.]` : preview,
        verified: false,
      }
      setWorkspace((current) => ({ ...current, knowledgeItems: [item, ...current.knowledgeItems] }))
      setNotice(`${file.name} added to this browser’s review list.`)
    } catch {
      setNotice('That file could not be read. Try a plain text or CSV file.')
    }
    input.value = ''
  }

  function startEditing(item: KnowledgeItem) {
    setEditingId(item.id)
    setEditDraft({ title: item.title, excerpt: item.excerpt })
  }

  function saveEdit(itemId: string) {
    if (!editDraft.title.trim() || !editDraft.excerpt.trim()) return
    setWorkspace((current) => ({
      ...current,
      knowledgeItems: current.knowledgeItems.map((item) =>
        item.id === itemId
          ? { ...item, title: editDraft.title.trim(), excerpt: editDraft.excerpt.trim(), verified: false }
          : item,
      ),
    }))
    setEditingId(null)
    setNotice('Knowledge item saved and marked for review.')
  }

  function toggleVerified(itemId: string) {
    setWorkspace((current) => ({
      ...current,
      knowledgeItems: current.knowledgeItems.map((item) =>
        item.id === itemId ? { ...item, verified: !item.verified } : item,
      ),
    }))
  }

  function removeKnowledge(itemId: string) {
    setWorkspace((current) => ({
      ...current,
      knowledgeItems: current.knowledgeItems.filter((item) => item.id !== itemId),
    }))
    setNotice('Knowledge item removed.')
  }

  const currentStep = workspace.currentStep
  const completedReviews = workspace.knowledgeItems.filter((item) => item.verified).length
  const pendingReviews = workspace.knowledgeItems.length - completedReviews
  const currentPageCopy = pageCopy[currentStep]

  return (
    <div className="app-shell">
      <Sidebar currentStep={currentStep} furthestStep={workspace.furthestStep} selectStep={selectStep} knowledgeCount={workspace.knowledgeItems.length} />
      <div className="app-main">
        <Topbar website={workspace.website} />
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> YOUR FIRST AGENT</div>
              <h1>{currentPageCopy.title}</h1>
              <p>{currentPageCopy.description}</p>
            </div>
            <div className="draft-badge"><span /> Draft saved</div>
          </div>

          <StepNavigation currentStep={currentStep} workspace={workspace} selectStep={selectStep} />

          <div className="content-grid">
            <section className="primary-column" aria-live="polite">
              {currentStep === 1 && (
                <CreateAgentPanel
                  workspace={workspace}
                  urlError={urlError}
                  updateWorkspace={updateWorkspace}
                  setUrlError={setUrlError}
                  createAgent={createAgent}
                />
              )}
              {currentStep === 2 && (
                <ScanCompanyPanel
                  workspace={workspace}
                  isScanning={isScanning}
                  scanProgress={scanProgress}
                  beginSampleScan={beginSampleScan}
                />
              )}
              {currentStep === 3 && (
                <KnowledgeReviewPanel
                  workspace={workspace}
                  filter={filter}
                  setFilter={setFilter}
                  showFaqForm={showFaqForm}
                  setShowFaqForm={setShowFaqForm}
                  newQuestion={newQuestion}
                  setNewQuestion={setNewQuestion}
                  newAnswer={newAnswer}
                  setNewAnswer={setNewAnswer}
                  addFaq={addFaq}
                  editingId={editingId}
                  editDraft={editDraft}
                  setEditDraft={setEditDraft}
                  startEditing={startEditing}
                  saveEdit={saveEdit}
                  cancelEdit={() => setEditingId(null)}
                  toggleVerified={toggleVerified}
                  removeKnowledge={removeKnowledge}
                  completedReviews={completedReviews}
                  pendingReviews={pendingReviews}
                  addTextFile={addTextFile}
                  continueToProfile={() => navigateToStep(4)}
                />
              )}
              {currentStep === 4 && (
                <AgentDefinitionPanel
                  workspace={workspace}
                  updateWorkspace={updateWorkspace}
                  saveAgentProfile={saveAgentProfile}
                />
              )}
            </section>

            <aside className="secondary-column">
              <AgentPreview workspace={workspace} currentStep={currentStep} />
              <SetupChecklist workspace={workspace} completedReviews={completedReviews} />
            </aside>
          </div>
        </main>
      </div>
      {notice && <div className="toast" role="status"><CheckCircle2 size={17} />{notice}</div>}
    </div>
  )
}

function Sidebar({ currentStep, furthestStep, selectStep, knowledgeCount }: { currentStep: StepNumber; furthestStep: StepNumber; selectStep: (step: StepNumber) => void; knowledgeCount: number }) {
  return (
    <aside className="sidebar">
      <div className="brand-row">
        <div className="brand-icon"><Sparkles size={19} strokeWidth={2.2} /></div>
        <span>agent<span className="brand-space">space</span></span>
      </div>

      <button className="workspace-switcher" type="button" aria-label="Current workspace">
        <div className="workspace-mark">AS</div>
        <div className="workspace-copy"><span className="muted-label">WORKSPACE</span><strong>Personal workspace</strong></div>
        <ChevronDown size={15} />
      </button>

      <div className="sidebar-section-label">BUILD</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        <button className="nav-item active" type="button" onClick={() => selectStep(1)}>
          <LayoutDashboard size={17} /><span>Agent studio</span><span className="nav-live-dot" />
        </button>
        <button className={`nav-item ${currentStep === 3 ? 'sub-active' : ''}`} type="button" disabled={furthestStep < 3 && currentStep < 3} onClick={() => selectStep(3)}>
          <BookOpen size={17} /><span>Knowledge</span><span className="nav-count">{currentStep === 3 ? knowledgeCount : '—'}</span>
        </button>
        <button className={`nav-item ${currentStep === 4 ? 'sub-active' : ''}`} type="button" disabled={furthestStep < 4} onClick={() => selectStep(4)}>
          <Bot size={17} /><span>Agent behavior</span><span className="nav-count">{furthestStep >= 4 ? 'Ready' : '—'}</span>
        </button>
      </nav>

      <div className="sidebar-section-label operate-label">OPERATE</div>
      <nav className="sidebar-nav" aria-label="Coming soon">
        <div className="nav-item disabled" aria-disabled="true"><MessageCircle size={17} /><span>Conversations</span><LockKeyhole size={13} className="locked-icon" /></div>
        <div className="nav-item disabled" aria-disabled="true"><Search size={17} /><span>Insights</span><LockKeyhole size={13} className="locked-icon" /></div>
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-help">
        <div className="help-icon"><MessageCircle size={16} /></div>
        <div><strong>Need a hand?</strong><span>We’re here to help you build.</span></div>
        <ChevronRight size={15} />
      </div>
      <div className="profile-row">
        <div className="profile-avatar">AS</div>
        <div className="profile-copy"><strong>Account owner</strong><span>Free workspace</span></div>
        <button className="icon-button profile-menu" type="button" aria-label="Account menu"><ChevronDown size={16} /></button>
      </div>
    </aside>
  )
}

function Topbar({ website }: { website: string }) {
  return (
    <header className="topbar">
      <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>Agent studio</strong></div>
      <div className="topbar-right">
        <div className="prototype-pill"><span /> Prototype</div>
        <div className="topbar-divider" />
        <div className="topbar-agent"><div className="topbar-agent-icon"><Bot size={16} /></div><span>{website ? hostFromUrl(website) : 'New agent'}</span></div>
        <button className="icon-button topbar-menu" type="button" aria-label="More options"><ChevronDown size={16} /></button>
      </div>
    </header>
  )
}

function StepNavigation({ currentStep, workspace, selectStep }: { currentStep: StepNumber; workspace: WorkspaceDraft; selectStep: (step: StepNumber) => void }) {
  return (
    <div className="stepper-card" aria-label="Agent setup steps">
      {steps.map((step, index) => {
        const complete = step.number < currentStep
        const active = step.number === currentStep
        const accessible = step.number === 1
          || (step.number === 2 && Boolean(workspace.website))
          || (step.number === 3 && workspace.scanComplete)
          || (step.number === 4 && workspace.furthestStep >= 4)
        return (
          <div className="stepper-part" key={step.number}>
            <button
              className={`stepper-step ${active ? 'current' : ''} ${complete ? 'complete' : ''}`}
              type="button"
              disabled={!accessible}
              onClick={() => selectStep(step.number)}
              aria-current={active ? 'step' : undefined}
            >
              <span className="step-number">{complete ? <Check size={15} /> : `0${step.number}`}</span>
              <span className="stepper-copy"><strong>{step.title}</strong><small>{step.caption}</small></span>
            </button>
            {index < steps.length - 1 && <div className={`step-connector ${complete ? 'done' : ''}`} />}
          </div>
        )
      })}
      <div className="stepper-side-note"><ShieldCheck size={16} /><span>Your draft saves as you go</span></div>
    </div>
  )
}

function CreateAgentPanel({
  workspace,
  urlError,
  updateWorkspace,
  setUrlError,
  createAgent,
}: {
  workspace: WorkspaceDraft
  urlError: string
  updateWorkspace: <K extends keyof WorkspaceDraft>(key: K, value: WorkspaceDraft[K]) => void
  setUrlError: (message: string) => void
  createAgent: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="panel-card create-panel">
      <div className="card-topline">
        <span className="section-kicker"><span className="kicker-number">01</span> THE BASICS</span>
        <span className="time-estimate">About 1 minute</span>
      </div>
      <h2>Let’s meet your company.</h2>
      <p className="panel-intro">Your website is the best place to start. Add a name for your agent and we’ll set up its workspace.</p>

      <form onSubmit={createAgent} noValidate>
        <label className="field-label" htmlFor="website-url">Company website <span>Required</span></label>
        <div className={`input-with-icon ${urlError ? 'has-error' : ''}`}>
          <Globe size={17} />
          <input
            id="website-url"
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder="yourcompany.com"
            value={workspace.website}
            aria-invalid={Boolean(urlError)}
            aria-describedby={urlError ? 'website-error' : 'website-hint'}
            onChange={(event) => {
              setUrlError('')
              updateWorkspace('website', event.target.value)
            }}
          />
          <span className="input-suffix"><CheckCircle2 size={15} /> Public site</span>
        </div>
        {urlError ? <p className="field-error" id="website-error">{urlError}</p> : <p className="field-hint" id="website-hint">We’ll use this to create a starting point for your company knowledge.</p>}

        <label className="field-label agent-name-label" htmlFor="agent-name">What should we call your agent?</label>
        <div className="input-with-icon name-input">
          <Bot size={17} />
          <input id="agent-name" type="text" maxLength={48} value={workspace.agentName} onChange={(event) => updateWorkspace('agentName', event.target.value)} placeholder="e.g. Alex, your company guide" />
        </div>

        <fieldset className="role-fieldset">
          <legend className="field-label">What will it help with?</legend>
          <div className="role-options">
            {roles.map(({ id, title, description, icon: Icon }) => (
              <button key={id} className={`role-option ${workspace.role === id ? 'selected' : ''}`} type="button" onClick={() => updateWorkspace('role', id)} aria-pressed={workspace.role === id}>
                <span className="role-icon"><Icon size={17} /></span>
                <span className="role-copy"><strong>{title}</strong><small>{description}</small></span>
                <span className="role-radio">{workspace.role === id && <span />}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form-footer">
          <div className="privacy-note"><ShieldCheck size={16} /><span>You’ll review everything before it goes live.</span></div>
          <button className="button-primary" type="submit">Create agent <ArrowRight size={16} /></button>
        </div>
      </form>
    </div>
  )
}

function ScanCompanyPanel({
  workspace,
  isScanning,
  scanProgress,
  beginSampleScan,
}: {
  workspace: WorkspaceDraft
  isScanning: boolean
  scanProgress: number
  beginSampleScan: () => void
}) {
  const stages = [
    { title: 'Find useful pages', detail: 'Looking for the parts of your site customers visit most', icon: Globe },
    { title: 'Spot key details', detail: 'Products, policies, contact details, and common questions', icon: ScanSearch },
    { title: 'Build a review list', detail: 'You choose what your agent can use', icon: BookOpen },
  ]
  const activeStage = scanProgress < 36 ? 0 : scanProgress < 72 ? 1 : 2

  return (
    <div className="panel-card scan-panel">
      <div className="card-topline">
        <span className="section-kicker"><span className="kicker-number">02</span> COMPANY DISCOVERY</span>
        {workspace.scanComplete && <span className="sample-status"><CheckCircle2 size={14} /> Preview ready</span>}
      </div>
      <h2>A little discovery goes a long way.</h2>
      <p className="panel-intro">Your agent starts by learning what your company shares with the world. You’ll review the results before anything is used.</p>

      <div className="website-summary">
        <div className="website-summary-icon"><Globe size={19} /></div>
        <div className="website-summary-copy"><span>COMPANY WEBSITE</span><strong>{hostFromUrl(workspace.website)}</strong><small>{workspace.website}</small></div>
        <span className="website-state"><span /> Ready</span>
      </div>

      {!workspace.scanComplete && (
        <div className="scan-stages">
          {stages.map(({ title, detail, icon: Icon }, index) => {
            const completed = isScanning && index < activeStage
            const active = isScanning && index === activeStage
            return (
              <div className={`scan-stage ${active ? 'scanning' : ''} ${completed ? 'stage-done' : ''}`} key={title}>
                <div className="scan-stage-icon">{completed ? <Check size={16} /> : <Icon size={17} />}</div>
                <div className="scan-stage-copy"><strong>{title}</strong><span>{detail}</span></div>
                {active ? <span className="stage-working"><i /> Working</span> : completed ? <CheckCircle2 size={17} className="stage-check" /> : <Circle size={16} className="stage-pending" />}
              </div>
            )
          })}
        </div>
      )}

      {isScanning && (
        <div className="scan-progress-wrap" role="status" aria-label={`Sample scan ${scanProgress}% complete`}>
          <div className="scan-progress-label"><span>Preparing your sample preview</span><strong>{scanProgress}%</strong></div>
          <div className="progress-track"><span style={{ width: `${scanProgress}%` }} /></div>
        </div>
      )}

      {workspace.scanComplete && (
        <div className="scan-results">
          <div className="results-heading"><div className="results-check"><Check size={18} /></div><div><strong>Your sample preview is ready</strong><span>Example findings for {hostFromUrl(workspace.website)}</span></div></div>
          <div className="result-metrics">
            <div><FileText size={17} /><strong>3</strong><span>example pages</span></div>
            <div><MessageCircle size={17} /><strong>1</strong><span>example FAQ</span></div>
            <div><ShieldCheck size={17} /><strong>0</strong><span>auto-approved</span></div>
          </div>
          <div className="results-disclaimer"><Sparkles size={16} /><span>These are sample findings for the prototype. Your website has not been fetched or crawled.</span></div>
        </div>
      )}

      <div className="prototype-note"><div className="note-icon"><Sparkles size={15} /></div><p><strong>Sample scan only.</strong> This prototype shows the discovery flow with example content. It does not access your website or send data to a server.</p></div>

      <div className="scan-footer">
        <div className="privacy-note"><ShieldCheck size={16} /><span>Nothing is published without your review.</span></div>
        {workspace.scanComplete ? (
          <button className="button-primary" type="button" onClick={beginSampleScan}>Review knowledge <ArrowRight size={16} /></button>
        ) : (
          <button className="button-primary" type="button" onClick={beginSampleScan} disabled={isScanning}>
            {isScanning ? <><span className="button-spinner" /> Building preview</> : <>Run sample scan <ArrowRight size={16} /></>}
          </button>
        )}
      </div>
    </div>
  )
}

function KnowledgeReviewPanel({
  workspace,
  filter,
  setFilter,
  showFaqForm,
  setShowFaqForm,
  newQuestion,
  setNewQuestion,
  newAnswer,
  setNewAnswer,
  addFaq,
  editingId,
  editDraft,
  setEditDraft,
  startEditing,
  saveEdit,
  cancelEdit,
  toggleVerified,
  removeKnowledge,
  completedReviews,
  pendingReviews,
  addTextFile,
  continueToProfile,
}: {
  workspace: WorkspaceDraft
  filter: KnowledgeFilter
  setFilter: (filter: KnowledgeFilter) => void
  showFaqForm: boolean
  setShowFaqForm: (show: boolean) => void
  newQuestion: string
  setNewQuestion: (value: string) => void
  newAnswer: string
  setNewAnswer: (value: string) => void
  addFaq: (event: FormEvent<HTMLFormElement>) => void
  editingId: string | null
  editDraft: { title: string; excerpt: string }
  setEditDraft: (draft: { title: string; excerpt: string }) => void
  startEditing: (item: KnowledgeItem) => void
  saveEdit: (itemId: string) => void
  cancelEdit: () => void
  toggleVerified: (itemId: string) => void
  removeKnowledge: (itemId: string) => void
  completedReviews: number
  pendingReviews: number
  addTextFile: (event: ChangeEvent<HTMLInputElement>) => void
  continueToProfile: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const visibleItems = workspace.knowledgeItems.filter((item) => {
    if (filter === 'review') return !item.verified
    if (filter === 'verified') return item.verified
    return true
  })

  return (
    <div className="panel-card knowledge-panel">
      <div className="card-topline">
        <span className="section-kicker"><span className="kicker-number">03</span> COMPANY KNOWLEDGE</span>
        <span className="sample-status"><Sparkles size={14} /> Example content</span>
      </div>
      <div className="knowledge-heading-row">
        <div><h2>Keep the answers you trust.</h2><p className="panel-intro">Your agent will only use information you approve. Edit an example or add an answer of your own.</p></div>
        <div className="knowledge-actions">
          <input ref={fileInputRef} className="visually-hidden-input" type="file" accept=".txt,.csv,text/plain,text/csv" aria-label="Upload a TXT or CSV file" onChange={addTextFile} />
          <button className="button-secondary add-faq-button upload-button" type="button" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Upload text / CSV</button>
          <button className="button-secondary add-faq-button" type="button" onClick={() => setShowFaqForm(!showFaqForm)}><Plus size={16} /> Add an FAQ</button>
        </div>
      </div>

      <div className="review-banner">
        <div className="review-banner-icon"><ShieldCheck size={18} /></div>
        <div><strong>{pendingReviews > 0 ? `${pendingReviews} ${pendingReviews === 1 ? 'item needs' : 'items need'} your review` : 'Everything is reviewed'}</strong><span>{pendingReviews > 0 ? 'Example content is clearly marked. Verify it or replace it with your company’s real information.' : 'Your reviewed items are ready for the next setup step.'}</span></div>
        <div className="review-count"><strong>{completedReviews}</strong><span>/{workspace.knowledgeItems.length}</span></div>
      </div>

      {showFaqForm && (
        <form className="faq-form" onSubmit={addFaq}>
          <div className="faq-form-heading"><div><span className="faq-form-icon"><MessageCircle size={16} /></span><strong>Add an official answer</strong></div><button className="icon-button" type="button" aria-label="Close FAQ form" onClick={() => setShowFaqForm(false)}><X size={17} /></button></div>
          <label className="field-label" htmlFor="new-question">Question</label>
          <input id="new-question" className="plain-input" value={newQuestion} onChange={(event) => setNewQuestion(event.target.value)} placeholder="What do customers ask?" required />
          <label className="field-label" htmlFor="new-answer">Official answer</label>
          <textarea id="new-answer" className="plain-input answer-input" value={newAnswer} onChange={(event) => setNewAnswer(event.target.value)} placeholder="Write the answer your agent should give..." rows={3} required />
          <div className="faq-form-footer"><span>Added answers start as unverified.</span><button className="button-primary compact" type="submit">Add to review <ArrowRight size={15} /></button></div>
        </form>
      )}

      <div className="knowledge-toolbar">
        <div className="filter-tabs" role="tablist" aria-label="Filter knowledge items">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All <span>{workspace.knowledgeItems.length}</span></FilterButton>
          <FilterButton active={filter === 'review'} onClick={() => setFilter('review')}>Needs review <span>{pendingReviews}</span></FilterButton>
          <FilterButton active={filter === 'verified'} onClick={() => setFilter('verified')}>Verified <span>{completedReviews}</span></FilterButton>
        </div>
        <div className="knowledge-sort"><span>Sorted by</span><strong>Source type</strong><ChevronDown size={14} /></div>
      </div>

      <div className="knowledge-list">
        {visibleItems.length > 0 ? visibleItems.map((item) => (
          <article className={`knowledge-item ${item.verified ? 'is-verified' : ''}`} key={item.id}>
            <div className="knowledge-item-top">
              <div className={`knowledge-kind-icon ${item.kind === 'Manual FAQ' ? 'faq-kind' : ''}`}>{item.kind === 'Manual FAQ' ? <MessageCircle size={16} /> : <FileText size={16} />}</div>
              <div className="knowledge-item-title"><div><span className="kind-label">{item.kind}</span>{item.verified && <span className="verified-label"><BadgeCheck size={13} /> Verified</span>}</div>
                {editingId === item.id ? (
                  <input className="edit-title-input" value={editDraft.title} onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })} aria-label="Knowledge item title" />
                ) : <h3>{item.title}</h3>}
              </div>
              <button className="icon-button remove-item" type="button" onClick={() => removeKnowledge(item.id)} aria-label={`Remove ${item.title}`}><X size={16} /></button>
            </div>
            <div className="knowledge-source"><Globe size={13} /><span>{item.source}</span><span className="source-separator">·</span><span>{item.kind === 'Manual FAQ' ? 'Added by you' : item.kind === 'Uploaded file' ? 'Stored in this browser' : 'Website sample'}</span></div>
            {editingId === item.id ? (
              <textarea className="edit-excerpt-input" rows={3} value={editDraft.excerpt} onChange={(event) => setEditDraft({ ...editDraft, excerpt: event.target.value })} aria-label="Knowledge excerpt" />
            ) : (
              <div className="knowledge-excerpt"><span className="excerpt-mark">“</span><p>{item.excerpt}</p></div>
            )}
            <div className="knowledge-item-footer">
              {item.verified ? <span className="review-state good"><CheckCircle2 size={14} /> Approved for this agent</span> : <span className="review-state"><Circle size={13} /> Waiting for your review</span>}
              <div className="item-actions">
                {editingId === item.id ? (
                  <><button className="text-button" type="button" onClick={cancelEdit}>Cancel</button><button className="button-primary compact" type="button" onClick={() => saveEdit(item.id)}>Save changes <Check size={14} /></button></>
                ) : (
                  <><button className="text-button" type="button" onClick={() => startEditing(item)}>Edit</button><button className={`verify-button ${item.verified ? 'verified' : ''}`} type="button" onClick={() => toggleVerified(item.id)}>{item.verified ? <><Check size={14} /> Reviewed</> : <>Verify <ArrowRight size={14} /></>}</button></>
                )}
              </div>
            </div>
          </article>
        )) : (
          <div className="empty-filter"><div><Search size={19} /></div><strong>No items in this view</strong><span>Try another filter or add a new FAQ.</span></div>
        )}
      </div>

      <div className="knowledge-footer-row">
        <div className="knowledge-footer-note"><ShieldCheck size={16} /><span>Only verified information is available to your agent. You can change your review at any time.</span></div>
        <button className="button-primary compact" type="button" onClick={continueToProfile}>Define your agent <ArrowRight size={15} /></button>
      </div>
    </div>
  )
}

function AgentDefinitionPanel({
  workspace,
  updateWorkspace,
  saveAgentProfile,
}: {
  workspace: WorkspaceDraft
  updateWorkspace: <K extends keyof WorkspaceDraft>(key: K, value: WorkspaceDraft[K]) => void
  saveAgentProfile: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="panel-card definition-panel">
      <div className="card-topline">
        <span className="section-kicker"><span className="kicker-number">04</span> AGENT BEHAVIOR</span>
        <span className="time-estimate">About 2 minutes</span>
      </div>
      <h2>Give your agent a point of view.</h2>
      <p className="panel-intro">Choose how it should help and speak. These settings shape the draft; they do not connect a live AI model.</p>

      <form className="definition-form" onSubmit={saveAgentProfile}>
        <fieldset className="role-fieldset definition-role-fieldset">
          <legend className="field-label">What is its main role?</legend>
          <div className="role-options">
            {roles.map(({ id, title, description, icon: Icon }) => (
              <button key={id} className={`role-option ${workspace.role === id ? 'selected' : ''}`} type="button" onClick={() => updateWorkspace('role', id)} aria-pressed={workspace.role === id}>
                <span className="role-icon"><Icon size={17} /></span>
                <span className="role-copy"><strong>{title}</strong><small>{description}</small></span>
                <span className="role-radio">{workspace.role === id && <span />}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="definition-fieldset">
          <legend className="field-label">Choose a speaking style</legend>
          <div className="tone-options">
            {tones.map((tone) => (
              <button key={tone.id} className={`tone-option ${workspace.tone === tone.id ? 'selected' : ''}`} type="button" onClick={() => updateWorkspace('tone', tone.id)} aria-pressed={workspace.tone === tone.id}>
                <span className={`tone-swatch tone-${tone.id}`}><MessageCircle size={15} /></span>
                <span><strong>{tone.title}</strong><small>{tone.description}</small></span>
                <span className="tone-check">{workspace.tone === tone.id && <Check size={13} />}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="definition-fieldset">
          <legend className="field-label"><Languages size={14} /> Languages</legend>
          <p className="field-hint language-hint">Select the languages your draft should be prepared to support.</p>
          <div className="language-options">
            {supportedLanguages.map((language) => {
              const selected = workspace.languages.includes(language)
              return <button key={language} className={`language-option ${selected ? 'selected' : ''}`} type="button" aria-pressed={selected} onClick={() => updateWorkspace('languages', selected ? workspace.languages.filter((item) => item !== language) : [...workspace.languages, language])}>{selected && <Check size={13} />}{language}</button>
            })}
          </div>
        </fieldset>

        <div className="definition-fieldset text-fieldset">
          <label className="field-label" htmlFor="agent-instructions">Instructions</label>
          <p className="field-hint">Tell the agent how to help, using only information that has been reviewed.</p>
          <textarea id="agent-instructions" className="plain-input behavior-textarea" rows={3} maxLength={600} value={workspace.instructions} onChange={(event) => updateWorkspace('instructions', event.target.value)} />
          <span className="character-count">{workspace.instructions.length}/600</span>
        </div>

        <div className="definition-fieldset text-fieldset">
          <label className="field-label" htmlFor="agent-boundaries">Boundaries</label>
          <p className="field-hint">Set expectations for what it should avoid or when it should say it does not know.</p>
          <textarea id="agent-boundaries" className="plain-input behavior-textarea" rows={3} maxLength={600} value={workspace.boundaries} onChange={(event) => updateWorkspace('boundaries', event.target.value)} />
          <span className="character-count">{workspace.boundaries.length}/600</span>
        </div>

        <div className="form-footer">
          <div className="privacy-note"><ShieldCheck size={16} /><span>Saved to this browser’s draft.</span></div>
          <button className="button-primary" type="submit">Save agent profile <ArrowRight size={16} /></button>
        </div>
      </form>
    </div>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button className={`filter-tab ${active ? 'active' : ''}`} type="button" role="tab" aria-selected={active} onClick={onClick}>{children}</button>
}

function AgentPreview({ workspace, currentStep }: { workspace: WorkspaceDraft; currentStep: StepNumber }) {
  const roleLabel = roles.find((role) => role.id === workspace.role)?.title.toLowerCase() ?? 'assistant'
  const agentName = workspace.agentName.trim() || 'Your front desk'
  return (
    <div className="preview-card">
      <div className="preview-card-header"><div><span className="aside-kicker">A FIRST LOOK</span><h3>Your agent, taking shape</h3></div><div className="preview-window-icon"><Bot size={18} /></div></div>
      <div className="browser-frame">
        <div className="browser-toolbar"><div className="browser-dots"><i /><i /><i /></div><div className="browser-address"><LockKeyhole size={10} />{hostFromUrl(workspace.website)}</div><span className="browser-menu-dots">•••</span></div>
        <div className="browser-page">
          <div className="site-header"><div className="site-logo"><span className="site-logo-mark"><Sparkles size={11} /></span><span>{workspace.website ? hostFromUrl(workspace.website).split('.')[0] : 'your company'}</span></div><div className="site-links"><i /><i /><i /></div></div>
          <div className="site-hero"><span className="site-demo-label">WEBSITE PREVIEW</span><div className="hero-title-line long" /><div className="hero-title-line" /><div className="hero-copy-line" /><div className="hero-copy-line short" /><div className="hero-cta-line" /></div>
          <div className="widget-launcher"><MessageCircle size={17} /><span>Ask {workspace.website ? hostFromUrl(workspace.website).split('.')[0] : 'us'}</span></div>
        </div>
      </div>
      <div className="assistant-preview">
        <div className="assistant-header"><div className="assistant-avatar"><Sparkles size={15} /></div><div><strong>{agentName}</strong><span><i /> Here to help</span></div><div className="assistant-more">···</div></div>
        <div className="assistant-message"><span className="message-time">A MOMENT AGO</span><p>Hi there! I’m {agentName}. I’m here to help with your {roleLabel} questions.</p></div>
        <div className="suggestion-row"><span>What can you help with?</span><ChevronRight size={13} /></div>
        <div className="chat-input-preview"><span>Ask me anything...</span><div><ArrowRight size={13} /></div></div>
        <div className="preview-disclaimer"><Sparkles size={12} /> Example preview · no live AI connected</div>
      </div>
      <div className="preview-note"><span className="preview-note-dot" /><span>{currentStep === 1 ? 'Your live preview updates as you set things up.' : currentStep === 2 ? 'A sample of how your agent could appear on your site.' : currentStep === 3 ? 'Your reviewed knowledge will guide the real answers.' : `A ${workspace.tone} voice, set to ${workspace.languages.length || 'no'} ${workspace.languages.length === 1 ? 'language' : 'languages'}.`}</span></div>
    </div>
  )
}

function SetupChecklist({ workspace, completedReviews }: { workspace: WorkspaceDraft; completedReviews: number }) {
  const websiteAdded = Boolean(workspace.website)
  const scanReady = workspace.scanComplete
  const knowledgeReady = workspace.knowledgeItems.length > 0 && completedReviews === workspace.knowledgeItems.length
  const behaviorReady = workspace.agentProfileSaved
  const rows = [
    { title: 'Company details', detail: websiteAdded ? hostFromUrl(workspace.website) : 'Add your website', done: websiteAdded },
    { title: 'Sample discovery', detail: scanReady ? 'Preview ready' : 'Waiting for website', done: scanReady },
    { title: 'Knowledge review', detail: knowledgeReady ? 'All items verified' : workspace.knowledgeItems.length ? `${completedReviews} of ${workspace.knowledgeItems.length} verified` : 'Review sample content', done: knowledgeReady },
    { title: 'Agent behavior', detail: behaviorReady ? 'Profile saved' : 'Set voice and boundaries', done: behaviorReady },
  ]
  return (
    <div className="checklist-card">
      <div className="checklist-heading"><div className="checklist-heading-icon"><CheckCircle2 size={17} /></div><div><span className="aside-kicker">YOUR PROGRESS</span><h3>Agent setup</h3></div></div>
      <div className="checklist-progress"><span style={{ width: `${(rows.filter((row) => row.done).length / rows.length) * 100}%` }} /></div>
      <div className="checklist-rows">
        {rows.map((row, index) => <div className={`checklist-row ${row.done ? 'done' : ''}`} key={row.title}><span className="checklist-index">{row.done ? <Check size={13} /> : `0${index + 1}`}</span><span className="checklist-row-copy"><strong>{row.title}</strong><small>{row.detail}</small></span>{row.done && <CheckCircle2 size={15} className="row-check" />}</div>)}
      </div>
      <div className="checklist-footer"><span className="footer-sparkle"><Sparkles size={14} /></span><p>This is a prototype workspace. Scans and answers use sample content.</p></div>
    </div>
  )
}

export default App
