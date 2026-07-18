import { Component, type ErrorInfo, type ReactNode } from 'react'
import GlobalErrorFallback from './GlobalErrorFallback'

interface GlobalErrorBoundaryProps {
  children: ReactNode
}

interface GlobalErrorBoundaryState {
  hasError: boolean
}

export default class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled RefLab render error:', error, info)
  }

  private handleRetry = () => {
    // A rejected lazy-import promise is cached by the module loader. Merely
    // remounting the same tree can therefore reproduce the exact failure.
    // A full reload is the only reliable recovery for both chunk failures and
    // ordinary render crashes.
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return <GlobalErrorFallback onRetry={this.handleRetry} />
    }

    return this.props.children
  }
}
