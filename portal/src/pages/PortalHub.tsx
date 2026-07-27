import { Link } from 'react-router-dom'
import { Brain, Building2, ShieldCheck, Stethoscope, HeartHandshake, ArrowRight } from 'lucide-react'

const PORTALS = [
  {
    name: 'Platform Admin',
    layer: 'Layer 1',
    href: '/platform-admin',
    icon: Building2,
    iconBg: 'bg-organic-neutral-900',
    iconColor: 'text-organic-accent-100',
    desc: 'Your company — tenants, plans, global catalog and revenue.',
    tags: ['Tenants', 'MRR', 'Plans', 'Catalog'],
  },
  {
    name: 'Practice Admin',
    layer: 'Layer 2',
    href: '/',
    icon: ShieldCheck,
    iconBg: 'bg-organic-accent',
    iconColor: 'text-organic-accent-100',
    desc: 'Clinic owner — clinicians, patients, permissions and billing.',
    tags: ['Overview', 'Access', 'Billing', 'Content'],
  },
  {
    name: 'Clinician Workspace',
    layer: 'Layer 3',
    href: '/workspace',
    icon: Stethoscope,
    iconBg: 'bg-organic-accent-2-500',
    iconColor: 'text-organic-accent-2-100',
    desc: 'Therapist — caseload, patient charts, AI scribe and care plans.',
    tags: ['Caseload', 'Chart', 'AI Scribe', 'Plan'],
  },
  {
    name: 'Patient App',
    layer: 'Layer 4',
    href: '/patient-app',
    icon: HeartHandshake,
    iconBg: 'bg-organic-accent-200',
    iconColor: 'text-organic-accent-800',
    desc: 'End user — assessments, homework, AI companion and progress.',
    tags: ['Home', 'Aria chat', 'Tasks', 'Progress'],
  },
]

export default function PortalHub() {
  return (
    <div
      className="min-h-screen py-16 px-6"
      style={{ background: 'radial-gradient(circle at 20% -10%, #f7f8fa, #eff0f4)' }}
    >
      <div className="max-w-[1080px] mx-auto">
        <div className="flex items-center gap-3.5 mb-11">
          <div className="w-[52px] h-[52px] rounded-organic-tile bg-organic-accent grid place-items-center text-organic-accent-100">
            <Brain size={26} />
          </div>
          <div>
            <div className="font-heading text-[22px]">AI Therapist Platform</div>
            <div className="text-[13px] text-organic-neutral-600">Multi-tenant SaaS for therapists &amp; clinics</div>
          </div>
        </div>

        <h1 className="text-[52px] max-w-[640px] mb-3.5 font-heading leading-[1.1]">Four connected portals, one warm platform.</h1>
        <p className="text-[17px] text-organic-neutral-700 max-w-[560px] mb-12">
          Every layer of the system — from platform ownership down to the patient&apos;s phone. Open any portal to explore its screens.
        </p>

        <div className="grid grid-cols-2 gap-5">
          {PORTALS.map((p) => (
            <Link
              key={p.name}
              to={p.href}
              className="block bg-organic-surface rounded-[26px] p-[26px] shadow-organic-sm border border-organic-neutral-300/50 relative overflow-hidden"
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-[52px] h-[52px] rounded-organic-tile ${p.iconBg} grid place-items-center`}>
                    <p.icon size={25} className={p.iconColor} />
                  </div>
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-organic-neutral-600">{p.layer}</span>
                </div>
                <h3 className="text-2xl font-heading mb-1.5">{p.name}</h3>
                <p className="text-sm text-organic-neutral-700 mb-[18px] min-h-[42px]">{p.desc}</p>
                <div className="flex gap-1.5 flex-wrap mb-5">
                  {p.tags.map((t) => (
                    <span key={t} className="text-[11.5px] px-2.5 py-1 rounded-organic-pill bg-organic-neutral-100 text-organic-neutral-700">
                      {t}
                    </span>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1.5 font-heading text-sm text-organic-accent-700">
                  Open portal <ArrowRight size={17} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-[13px] text-organic-neutral-600">Admin picker · sample data throughout</p>
      </div>
    </div>
  )
}
