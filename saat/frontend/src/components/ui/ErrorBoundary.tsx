import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-background px-6 py-12 text-center">
        <p className="text-[17px] font-extrabold text-text">خطایی رخ داد</p>
        <p className="max-w-sm text-[13px] font-semibold leading-relaxed text-text-soft">
          صفحه به‌درستی بارگذاری نشد. یک بار رفرش سخت بزن (Ctrl+Shift+R). اگر ادامه داشت،
          Service Worker را از DevTools پاک کن.
        </p>
        {import.meta.env.DEV ? (
          <pre className="max-w-full overflow-x-auto rounded-[12px] bg-black/[0.06] px-3 py-2 text-left text-[11px] font-mono text-error-700 dark:bg-white/8">
            {this.state.error.message}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-full bg-primary-600 px-5 py-2.5 text-[13px] font-bold text-white"
        >
          بارگذاری مجدد
        </button>
      </div>
    )
  }
}
