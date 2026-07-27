import { useEffect, useState } from 'react'

/**
 * Text size / readability control.
 *
 * This exists because the clinician using the workspace could not read the
 * default type comfortably. It scales text, icons and spacing together by
 * driving a single `--ui-scale` custom property on :root (see index.css),
 * rather than the CSS `zoom` property, which is inconsistent across
 * browsers and breaks position:fixed overlays.
 *
 * The choice is remembered per browser and shared by every portal, so
 * moving between the Practice Admin console and the Clinical Workspace
 * does not reset it.
 */

const KEY = 'ui.textSize'

export type TextSize = 'standard' | 'large' | 'larger'

export const TEXT_SIZES: { value: TextSize; label: string; scale: number }[] = [
  { value: 'standard', label: 'Standard', scale: 1 },
  { value: 'large', label: 'Large', scale: 1.15 },
  { value: 'larger', label: 'Larger', scale: 1.3 },
]

type Listener = (value: TextSize) => void
const listeners = new Set<Listener>()

function isTextSize(value: string | null): value is TextSize {
  return value === 'standard' || value === 'large' || value === 'larger'
}

function readStored(): TextSize {
  try {
    const stored = localStorage.getItem(KEY)
    return isTextSize(stored) ? stored : 'standard'
  } catch {
    // localStorage unavailable (private browsing) — fall back to default.
    return 'standard'
  }
}

/** Applied to the document, not to any one React tree, so the scale also
 *  covers portals/overlays rendered outside the current component. */
export function applyTextSize(value: TextSize): void {
  const entry = TEXT_SIZES.find((s) => s.value === value) ?? TEXT_SIZES[0]
  const root = document.documentElement
  root.style.setProperty('--ui-scale', String(entry.scale))
  root.setAttribute('data-text-size', entry.value)
}

// Apply the stored preference immediately on module load, before React
// paints, so the UI does not flash at the wrong size on a hard refresh.
if (typeof document !== 'undefined') {
  applyTextSize(readStored())
}

export function useTextSize(): [TextSize, (value: TextSize) => void] {
  const [size, setSize] = useState<TextSize>(readStored)

  useEffect(() => {
    applyTextSize(size)
  }, [size])

  useEffect(() => {
    const listener: Listener = (value) => setSize(value)
    listeners.add(listener)

    // Keep other tabs of the same portal in step.
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && isTextSize(e.newValue)) {
        setSize(e.newValue)
        applyTextSize(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const update = (value: TextSize) => {
    try {
      localStorage.setItem(KEY, value)
    } catch {
      // Ignore — the scale still applies for this session.
    }
    applyTextSize(value)
    setSize(value)
    listeners.forEach((l) => l(value))
  }

  return [size, update]
}
