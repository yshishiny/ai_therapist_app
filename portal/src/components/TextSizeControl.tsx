import { Type } from 'lucide-react'
import { TEXT_SIZES, useTextSize } from '../hooks/useTextSize'

/**
 * Standard / Large / Larger picker for the header of every portal.
 *
 * The options are labelled with progressively larger type so the control
 * previews its own effect -- you can see which one you want before
 * committing to it, which matters when the reason you are reaching for
 * this control is that you cannot read the current size.
 */
export function TextSizeControl({ compact = false }: { compact?: boolean }) {
  const [size, setSize] = useTextSize()

  return (
    <div
      className="inline-flex items-center gap-1.5 bg-organic-surface border border-organic-neutral-300/60 rounded-organic-pill px-2 py-1"
      role="group"
      aria-label="Text size"
    >
      <Type size={15} className="text-organic-neutral-500 flex-none" aria-hidden="true" />
      {!compact && <span className="sr-only">Text size</span>}
      {TEXT_SIZES.map((option, i) => (
        <button
          key={option.value}
          onClick={() => setSize(option.value)}
          aria-pressed={size === option.value}
          title={`${option.label} text`}
          // Fixed px here on purpose: this control must stay a stable size
          // while it changes everything else, or it moves under the cursor
          // as you click through the options.
          style={{ fontSize: `${11 + i * 2}px`, lineHeight: 1.1 }}
          className={`font-heading px-2 py-1 rounded-organic-pill transition-colors ${
            size === option.value
              ? 'bg-organic-accent text-organic-neutral-100'
              : 'text-organic-neutral-700 hover:bg-organic-neutral-200'
          }`}
        >
          A
          <span className="sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
