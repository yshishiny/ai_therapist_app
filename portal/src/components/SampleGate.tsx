import type { ReactNode } from 'react'

interface SampleGateProps {
  hidden: boolean
  placeholder: ReactNode
  children: ReactNode
}

/**
 * Wraps a section that is still sample/mock content (a faithful visual port
 * of the original design mockup that isn't wired to the real API yet).
 * When `hidden` is true (the "Hide sample data" toggle is on), renders the
 * neutral `placeholder` instead of `children`. `children` are left fully
 * intact so the original content still renders when the flag is off.
 */
export function SampleGate({ hidden, placeholder, children }: SampleGateProps) {
  return <>{hidden ? placeholder : children}</>
}
