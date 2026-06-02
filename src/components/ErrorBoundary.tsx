import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  label?: string
}
interface State {
  error: Error | null
}

/** Catches render errors so one failing view never blanks the whole tool. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error(`[fletchers-bar]${this.props.label ? ' ' + this.props.label : ''} render error:`, error)
  }
  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-paper p-8 text-center">
          <div className="wordmark text-[22px] text-pine">Fletcher's — Bar Builder</div>
          <p className="max-w-md text-[13px] text-ink/70">
            Something hiccuped while drawing. Your layout is saved — reloading will bring it right back.
          </p>
          <button onClick={() => window.location.reload()} className="rounded-md bg-pine px-4 py-2 text-[13px] font-semibold text-white hover:bg-pine/90">
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function ThreeDFallback() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#ECE7DA] p-6 text-center">
      <div className="text-[13px] font-semibold text-ink/80">3D view unavailable</div>
      <p className="max-w-xs text-[12px] text-stone">
        Your browser couldn’t start WebGL (hardware acceleration may be off, or too many 3D tabs are open). The 2D plan and
        elevations work as normal.
      </p>
    </div>
  )
}
