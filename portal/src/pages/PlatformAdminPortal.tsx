import { useNavigate } from 'react-router-dom'
import { Brain, Building2, Lock, ArrowLeft } from 'lucide-react'

/**
 * Platform admin — deliberately not built.
 *
 * This screen used to render a complete, entirely invented business: 48
 * active clinics, $62.4k MRR, 412 clinicians, 1.9M AI messages a month, six
 * named tenant organisations with fabricated revenue figures and account
 * statuses (including one "Past due"), and three priced subscription tiers
 * with invented per-plan revenue. None of it came from an API — the file made
 * zero network calls. It sat on a live, reachable route.
 *
 * It has not been wired to real data, and that is a deliberate decision
 * rather than unfinished work:
 *
 * 1. There is no platform-administrator role. `backend/auth.py` defines
 *    PATIENT, CLINICIAN, SUPERVISOR and ADMIN, and this route is gated on
 *    ADMIN — the same role every *practice* administrator holds. Showing real
 *    cross-tenant figures here would hand each practice a view of every other
 *    practice's clinics, clinician counts and patient counts. That is a worse
 *    outcome than the invented data it replaced, because it would be true.
 *
 * 2. There is no billing system to report on. No subscription, plan, seat or
 *    invoice table exists anywhere in the schema, so MRR, plan mix and seat
 *    limits are not merely unwired — they have no source at all.
 *
 * Building this properly needs, in order: a platform-level role distinct from
 * practice ADMIN and enforced server-side; cross-tenant endpoints that only
 * that role can reach; and a real billing integration. Until then an honest
 * empty screen is the correct thing to ship.
 */
export default function PlatformAdminPortal() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-organic-bg grid place-items-center px-6 py-16">
      <div className="max-w-[560px] w-full">
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-10 h-10 rounded-organic-tile bg-organic-accent grid place-items-center text-organic-accent-100">
            <Brain size={20} />
          </div>
          <div className="leading-tight">
            <div className="font-heading text-[1.0625rem] text-organic-text">AI Therapist</div>
            <div className="text-[0.7812rem] text-organic-neutral-600">Platform administration</div>
          </div>
        </div>

        <div className="bg-organic-surface rounded-organic-card p-7 shadow-organic-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <Lock size={20} className="text-organic-neutral-500 flex-none" />
            <h1 className="text-[1.375rem] font-heading text-organic-text">
              Platform administration is not available
            </h1>
          </div>

          <p className="text-sm text-organic-neutral-700 mb-4">
            This console would show activity across every clinic on the platform.
            It has not been built, and the figures it used to display were sample
            data rather than anything measured.
          </p>

          <div className="bg-organic-bg rounded-organic-tile p-4 mb-5">
            <div className="flex items-start gap-2.5">
              <Building2 size={17} className="text-organic-neutral-500 flex-none mt-0.5" />
              <div className="text-[0.8125rem] text-organic-neutral-700">
                <p className="mb-2">Two things are needed before it can be:</p>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    A platform-administrator role. Today this page is reachable by any
                    practice administrator, so showing real figures from other clinics
                    here would expose one practice's data to another.
                  </li>
                  <li>
                    A billing system. Revenue, subscription plans and seat limits have
                    no source in the database, so they cannot be reported on.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-[0.8125rem] text-organic-neutral-600 mb-5">
            Your own practice's clinicians, patients, assessments and content are all
            managed in the Practice Admin console.
          </p>

          <button
            onClick={() => navigate('/')}
            className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Go to Practice Admin
          </button>
        </div>
      </div>
    </div>
  )
}
