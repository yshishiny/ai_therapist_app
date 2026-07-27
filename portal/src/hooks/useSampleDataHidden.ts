import { useEffect, useState } from 'react'

// Shared, localStorage-backed toggle for hiding views/sections that are
// still sample-only content (visual ports of the original design mockup
// that were never wired to the real API). Defaults to `false` — samples
// are shown by default, unchanged from today's behavior.
const KEY = 'ui.hideSampleData'

type Listener = (value: boolean) => void
const listeners = new Set<Listener>()

function readStored(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    // localStorage unavailable (e.g. private browsing) — fall back to default.
    return false
  }
}

function writeStored(value: boolean) {
  try {
    localStorage.setItem(KEY, value ? '1' : '0')
  } catch {
    // Ignore — state still updates in-memory for this tab.
  }
}

/**
 * Every component that calls this hook stays in sync automatically:
 * same-tab updates propagate via an in-memory listener set, and updates
 * from other browser tabs propagate via the native `storage` event.
 */
export function useSampleDataHidden(): [boolean, (value: boolean) => void] {
  const [hidden, setHidden] = useState<boolean>(readStored)

  useEffect(() => {
    const listener: Listener = (value) => setHidden(value)
    listeners.add(listener)

    const onStorageEvent = (e: StorageEvent) => {
      if (e.key === KEY) setHidden(e.newValue === '1')
    }
    window.addEventListener('storage', onStorageEvent)

    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorageEvent)
    }
  }, [])

  const update = (value: boolean) => {
    writeStored(value)
    setHidden(value)
    listeners.forEach((listener) => listener(value))
  }

  return [hidden, update]
}
