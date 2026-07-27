import { useEffect, useState } from 'react'
import { AlertTriangle, FlaskConical, Lock, ShieldCheck, X } from 'lucide-react'
import apiClient from '../services/api'

/**
 * Controlled Trial Mode panel.
 *
 * Governs instruments we do not own the rights to. The states are:
 *
 *   RESERVED          metadata only, nothing to administer
 *   TRIAL             time-limited evaluation on authorised content
 *   LICENSED_ACTIVE   real clinical use under a verified license
 *
 * The banners and counters here are a courtesy to the person using the
 * app -- the actual restrictions are enforced server-side, so ignoring
 * this UI does not get anyone past them.
 */

export type TrialCatalogEntry = {
  id: string
  name: string
  availability_state?: string | null
  requires_governance_approval?: boolean
  description?: string | null
}

type Trial = {
  id: string
  instrument_name: string
  trial_source: string
  publisher: string | null
  authorization_reference: string | null
  organization: string
  approved_users: string[]
  start_date: string
  expiry_date: string
  maximum_administrations: number
  administrations_used: number
  real_patient_use_allowed: boolean
  report_export_allowed: boolean
  content_storage_allowed: boolean
  result_storage_allowed: boolean
  allowed_country: string | null
  allowed_language: string | null
  status: string
  days_remaining: number
  administrations_remaining: number
  banner: string
  is_synthetic: boolean
}

const SOURCE_LABELS: Record<string, string> = {
  publisher_sandbox: 'Publisher sandbox',
  authorized_demo: 'Authorized demo',
  synthetic: 'Synthetic (fictional items)',
}

const inputCls =
  'w-full bg-organic-bg border border-organic-neutral-300/60 rounded-organic-tile px-3 py-2 text-sm'
const labelCls = 'block text-xs font-semibold text-organic-neutral-600 mb-1.5'

function todayISO(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export function TrialModePanel({
  entry,
  onClose,
  onChanged,
}: {
  entry: TrialCatalogEntry
  onClose: () => void
  onChanged: () => void
}) {
  const [trial, setTrial] = useState<Trial | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'view' | 'activate' | 'license'>('view')

  const load = () => {
    setLoading(true)
    apiClient
      .getAssessmentTrial(entry.id)
      .then((t: Trial | null) => setTrial(t))
      .catch(() => setError('Could not load trial status for this instrument.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [entry.id])

  const state = entry.availability_state || 'RESERVED'
  const expired = trial?.status === 'expired' || trial?.status === 'revoked'
  const live = trial?.status === 'active' && !expired

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-organic-bg w-full max-w-[640px] h-screen overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Permanent banner — stays visible for the whole trial, per the
            requirement that trial status is never ambiguous. */}
        {live && (
          <div
            className={`sticky top-0 z-10 px-6 py-3 text-[0.8125rem] font-semibold flex items-start gap-2 ${
              trial!.is_synthetic
                ? 'bg-organic-accent-2-200 text-organic-accent-2-800'
                : 'bg-organic-accent-200 text-organic-accent-800'
            }`}
          >
            <AlertTriangle size={16} className="flex-none mt-0.5" />
            <span>{trial!.banner}</span>
          </div>
        )}

        <div className="p-7">
          <div className="flex justify-between items-start mb-1.5">
            <div>
              <h2 className="text-[1.5rem] font-heading text-organic-text">{entry.name}</h2>
              <p className="text-sm text-organic-neutral-600">
                {state === 'LICENSED_ACTIVE'
                  ? 'Licensed for clinical use'
                  : state === 'TRIAL'
                  ? 'Evaluation in progress'
                  : 'Reserved — awaiting license or publisher approval'}
              </p>
            </div>
            <button onClick={onClose} className="text-organic-neutral-500 hover:text-organic-neutral-800">
              <X size={22} />
            </button>
          </div>

          {loading && <div className="text-sm text-organic-neutral-600 mt-6">Loading…</div>}
          {error && <div className="text-sm text-organic-accent-800 mt-6">{error}</div>}

          {!loading && state === 'LICENSED_ACTIVE' && (
            <div className="mt-6 bg-organic-surface rounded-organic-card p-5 flex items-start gap-3">
              <ShieldCheck size={20} className="text-organic-accent-700 flex-none mt-0.5" />
              <div className="text-sm text-organic-neutral-700">
                This instrument has an approved license on file and is available for routine clinical
                use.
              </div>
            </div>
          )}

          {!loading && mode === 'view' && state !== 'LICENSED_ACTIVE' && (
            <>
              {live && <TrialCounter trial={trial!} />}

              {expired && (
                <div className="mt-6 bg-organic-neutral-200 rounded-organic-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock size={18} className="text-organic-neutral-600" />
                    <h3 className="font-heading text-[1.0625rem] text-organic-neutral-800">
                      Trial Expired
                    </h3>
                  </div>
                  <p className="text-sm text-organic-neutral-700 mb-4">
                    No further administrations are permitted. Trial records are retained as audit
                    information only and were not converted into clinical records.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode('license')}
                      className="rounded-organic-pill bg-organic-accent text-organic-neutral-100 font-heading text-sm px-4 py-2"
                    >
                      Enter License
                    </button>
                    <a
                      href={`mailto:?subject=License request: ${encodeURIComponent(entry.name)}`}
                      className="rounded-organic-pill border border-organic-neutral-300/60 text-organic-neutral-700 font-heading text-sm px-4 py-2"
                    >
                      Request License
                    </a>
                  </div>
                </div>
              )}

              {!trial && (
                <div className="mt-6 bg-organic-surface rounded-organic-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock size={18} className="text-organic-neutral-600" />
                    <h3 className="font-heading text-[1.0625rem]">No content available</h3>
                  </div>
                  <p className="text-sm text-organic-neutral-700 mb-4">
                    This slot holds the instrument's name and description only. No items, scoring keys
                    or norms are stored, because we do not hold the rights to them.
                  </p>
                  <button
                    onClick={() => setMode('activate')}
                    className="rounded-organic-pill bg-organic-accent text-organic-neutral-100 font-heading text-sm px-4 py-2 inline-flex items-center gap-1.5"
                  >
                    <FlaskConical size={15} /> Start a trial
                  </button>
                </div>
              )}

              {live && (
                <button
                  onClick={() => setMode('license')}
                  className="mt-5 rounded-organic-pill bg-organic-accent text-organic-neutral-100 font-heading text-sm px-4 py-2"
                >
                  Convert Trial to Licensed
                </button>
              )}
            </>
          )}

          {!loading && mode === 'activate' && (
            <ActivationForm
              entry={entry}
              onCancel={() => setMode('view')}
              onDone={() => {
                setMode('view')
                load()
                onChanged()
              }}
            />
          )}

          {!loading && mode === 'license' && (
            <LicenseForm
              entry={entry}
              trialId={trial?.id}
              onCancel={() => setMode('view')}
              onDone={() => {
                setMode('view')
                load()
                onChanged()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/** Days left, administrations left, where the content came from, who may
 *  use it, and whether anything may be kept. */
function TrialCounter({ trial }: { trial: Trial }) {
  const rows: [string, string][] = [
    ['Trial days remaining', String(trial.days_remaining)],
    [
      'Administrations remaining',
      `${trial.administrations_remaining} of ${trial.maximum_administrations}`,
    ],
    ['Trial source', SOURCE_LABELS[trial.trial_source] || trial.trial_source],
    ['Publisher', trial.publisher || 'Not recorded'],
    ['Authorization', trial.authorization_reference || 'None (synthetic trial)'],
    ['Authorized evaluators', String(trial.approved_users.length)],
    [
      'Data retention',
      trial.result_storage_allowed ? 'Results may be retained' : 'Results must not be retained',
    ],
    ['Real patient use', trial.real_patient_use_allowed ? 'Permitted' : 'Not permitted'],
    ['Report export', trial.report_export_allowed ? 'Permitted' : 'Not permitted'],
    ['Expires', trial.expiry_date],
  ]

  const urgent = trial.days_remaining <= 3 || trial.administrations_remaining <= 1

  return (
    <div className="mt-6 bg-organic-surface rounded-organic-card p-5">
      <h3 className="font-heading text-[1.0625rem] mb-3">Trial status</h3>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5">
        {rows.map(([label, value], i) => (
          <div key={label} className={i < 2 ? 'col-span-1' : 'col-span-1'}>
            <dt className="text-xs text-organic-neutral-600">{label}</dt>
            <dd
              className={`text-sm ${
                i < 2 && urgent ? 'text-organic-accent-800 font-bold' : 'text-organic-text'
              }`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ActivationForm({
  entry,
  onCancel,
  onDone,
}: {
  entry: TrialCatalogEntry
  onCancel: () => void
  onDone: () => void
}) {
  const [source, setSource] = useState<'synthetic' | 'publisher_sandbox' | 'authorized_demo'>(
    'synthetic',
  )
  const [form, setForm] = useState({
    publisher: '',
    authorization_reference: '',
    organization: '',
    approved_users: '',
    start_date: todayISO(),
    expiry_date: todayISO(30),
    maximum_administrations: 10,
    allowed_country: '',
    allowed_language: '',
    real_patient_use_allowed: false,
    result_storage_allowed: false,
    report_export_allowed: false,
    content_storage_allowed: false,
    accept_publisher_terms: false,
  })
  const [governance, setGovernance] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const synthetic = source === 'synthetic'

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      await apiClient.activateAssessmentTrial(
        entry.id,
        {
          ...form,
          trial_source: source,
          maximum_administrations: Number(form.maximum_administrations),
          approved_users: form.approved_users
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          publisher: form.publisher || null,
          authorization_reference: form.authorization_reference || null,
          allowed_country: form.allowed_country || null,
          allowed_language: form.allowed_language || null,
        },
        governance,
      )
      onDone()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((d: any) => d.msg).join('; ')
          : 'Could not start the trial.',
      )
      setSaving(false)
    }
  }

  return (
    <div className="mt-6">
      <h3 className="font-heading text-[1.1875rem] mb-1">Start a trial</h3>
      <p className="text-sm text-organic-neutral-600 mb-5">
        A trial may only run on content we are entitled to use. Without publisher authorization, the
        only option is a synthetic trial using fictional items written for training.
      </p>

      <label className={labelCls}>Trial source</label>
      <div className="flex flex-col gap-2 mb-4">
        {(['synthetic', 'publisher_sandbox', 'authorized_demo'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`text-left px-3.5 py-2.5 rounded-organic-tile border text-sm ${
              source === s
                ? 'border-organic-accent bg-organic-accent-100 font-semibold'
                : 'border-organic-neutral-300/60 bg-organic-surface'
            }`}
          >
            {SOURCE_LABELS[s]}
            {s === 'synthetic' && (
              <span className="block text-xs text-organic-neutral-600 font-normal mt-0.5">
                No publisher authorization needed. Cannot be used with real patients.
              </span>
            )}
          </button>
        ))}
      </div>

      {!synthetic && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className={labelCls}>Publisher</label>
            <input
              className={inputCls}
              value={form.publisher}
              onChange={(e) => set('publisher', e.target.value)}
              placeholder="e.g. Pearson Clinical"
            />
          </div>
          <div>
            <label className={labelCls}>Authorization reference *</label>
            <input
              className={inputCls}
              value={form.authorization_reference}
              onChange={(e) => set('authorization_reference', e.target.value)}
              placeholder="Written permission ref."
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>Organization *</label>
          <input
            className={inputCls}
            value={form.organization}
            onChange={(e) => set('organization', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Approved evaluators * (comma-separated ids)</label>
          <input
            className={inputCls}
            value={form.approved_users}
            onChange={(e) => set('approved_users', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Start date *</label>
          <input
            type="date"
            className={inputCls}
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Expiry date *</label>
          <input
            type="date"
            className={inputCls}
            value={form.expiry_date}
            onChange={(e) => set('expiry_date', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Maximum administrations *</label>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={form.maximum_administrations}
            onChange={(e) => set('maximum_administrations', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Allowed country</label>
          <input
            className={inputCls}
            value={form.allowed_country}
            onChange={(e) => set('allowed_country', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Allowed language</label>
          <input
            className={inputCls}
            value={form.allowed_language}
            onChange={(e) => set('allowed_language', e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-5">
        <Check
          label="Real patient data is permitted"
          hint={synthetic ? 'Unavailable for synthetic trials.' : undefined}
          disabled={synthetic}
          checked={form.real_patient_use_allowed && !synthetic}
          onChange={(v) => set('real_patient_use_allowed', v)}
        />
        <Check
          label="Results may be retained"
          checked={form.result_storage_allowed}
          onChange={(v) => set('result_storage_allowed', v)}
        />
        <Check
          label="Reports may be exported"
          checked={form.report_export_allowed}
          onChange={(v) => set('report_export_allowed', v)}
        />
        <Check
          label="Publisher content may be stored"
          checked={form.content_storage_allowed}
          onChange={(v) => set('content_storage_allowed', v)}
        />
        <Check
          label="I accept the publisher's terms *"
          checked={form.accept_publisher_terms}
          onChange={(v) => set('accept_publisher_terms', v)}
        />
        {entry.requires_governance_approval && (
          <Check
            label="Clinical governance lead has approved this trial"
            hint="Required for any non-synthetic trial of this instrument."
            checked={governance}
            onChange={setGovernance}
          />
        )}
      </div>

      {entry.requires_governance_approval && (
        <div className="bg-organic-accent-100 text-organic-accent-800 rounded-organic-tile p-3 text-xs mb-4">
          This instrument assesses suicide risk. Trials default to synthetic clinician-training
          scenarios; real-patient use requires both publisher authorization and clinical governance
          approval.
        </div>
      )}

      {error && <div className="text-sm text-organic-accent-800 mb-3">{error}</div>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-organic-pill bg-organic-accent text-organic-neutral-100 font-heading text-sm px-5 py-2.5 disabled:opacity-60"
        >
          {saving ? 'Starting…' : 'Start trial'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-organic-pill border border-organic-neutral-300/60 text-organic-neutral-700 font-heading text-sm px-5 py-2.5"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function LicenseForm({
  entry,
  trialId,
  onCancel,
  onDone,
}: {
  entry: TrialCatalogEntry
  trialId?: string
  onCancel: () => void
  onDone: () => void
}) {
  const [form, setForm] = useState({
    license_reference: '',
    licensed_organization: '',
    publisher: '',
    proof_document_url: '',
    qualified_users: '',
    permitted_instrument: entry.name,
    permitted_version: '',
    permitted_languages: '',
    permitted_territories: '',
    embedding_rights: false,
    administration_limit: '',
    valid_from: '',
    valid_until: '',
    data_retention_terms: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const csv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      await apiClient.submitAssessmentLicense(
        entry.id,
        {
          ...form,
          qualified_users: csv(form.qualified_users),
          permitted_languages: csv(form.permitted_languages),
          permitted_territories: csv(form.permitted_territories),
          administration_limit: form.administration_limit ? Number(form.administration_limit) : null,
          valid_from: form.valid_from || null,
          valid_until: form.valid_until || null,
          publisher: form.publisher || null,
          proof_document_url: form.proof_document_url || null,
          permitted_version: form.permitted_version || null,
          data_retention_terms: form.data_retention_terms || null,
        },
        trialId,
      )
      setSubmitted(true)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((d: any) => d.msg).join('; ')
          : 'Could not submit the license.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 bg-organic-surface rounded-organic-card p-5">
        <h3 className="font-heading text-[1.0625rem] mb-2">Submitted for compliance review</h3>
        <p className="text-sm text-organic-neutral-700 mb-4">
          The instrument has <strong>not</strong> been activated. Uploading evidence does not grant
          access on its own — an administrator has to review the license terms and approve it before
          the instrument can be used clinically.
        </p>
        <button
          onClick={onDone}
          className="rounded-organic-pill bg-organic-accent text-organic-neutral-100 font-heading text-sm px-4 py-2"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <h3 className="font-heading text-[1.1875rem] mb-1">Convert to licensed</h3>
      <p className="text-sm text-organic-neutral-600 mb-5">
        Record the license terms. This opens a compliance review — it does not activate the
        instrument by itself.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>License number / account ref. *</label>
          <input
            className={inputCls}
            value={form.license_reference}
            onChange={(e) => set('license_reference', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Licensed organization *</label>
          <input
            className={inputCls}
            value={form.licensed_organization}
            onChange={(e) => set('licensed_organization', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Publisher</label>
          <input
            className={inputCls}
            value={form.publisher}
            onChange={(e) => set('publisher', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Proof document URL</label>
          <input
            className={inputCls}
            value={form.proof_document_url}
            onChange={(e) => set('proof_document_url', e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Qualified users * (comma-separated)</label>
          <input
            className={inputCls}
            value={form.qualified_users}
            onChange={(e) => set('qualified_users', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Permitted version</label>
          <input
            className={inputCls}
            value={form.permitted_version}
            onChange={(e) => set('permitted_version', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Administration limit</label>
          <input
            type="number"
            className={inputCls}
            value={form.administration_limit}
            onChange={(e) => set('administration_limit', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Permitted languages (comma-separated)</label>
          <input
            className={inputCls}
            value={form.permitted_languages}
            onChange={(e) => set('permitted_languages', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Permitted territories (comma-separated)</label>
          <input
            className={inputCls}
            value={form.permitted_territories}
            onChange={(e) => set('permitted_territories', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Valid from</label>
          <input
            type="date"
            className={inputCls}
            value={form.valid_from}
            onChange={(e) => set('valid_from', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Valid until</label>
          <input
            type="date"
            className={inputCls}
            value={form.valid_until}
            onChange={(e) => set('valid_until', e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Data retention terms</label>
          <textarea
            className={`${inputCls} min-h-[70px]`}
            value={form.data_retention_terms}
            onChange={(e) => set('data_retention_terms', e.target.value)}
          />
        </div>
      </div>

      <div className="mb-5">
        <Check
          label="License includes embedding / platform rights"
          checked={form.embedding_rights}
          onChange={(v) => set('embedding_rights', v)}
        />
      </div>

      {error && <div className="text-sm text-organic-accent-800 mb-3">{error}</div>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-organic-pill bg-organic-accent text-organic-neutral-100 font-heading text-sm px-5 py-2.5 disabled:opacity-60"
        >
          {saving ? 'Submitting…' : 'Submit for review'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-organic-pill border border-organic-neutral-300/60 text-organic-neutral-700 font-heading text-sm px-5 py-2.5"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function Check({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={`flex items-start gap-2.5 text-sm ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 flex-none"
      />
      <span>
        {label}
        {hint && <span className="block text-xs text-organic-neutral-600">{hint}</span>}
      </span>
    </label>
  )
}
