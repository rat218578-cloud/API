import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro não capturado:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
          <div className="bg-bg-card border border-border-default rounded-2xl p-8 max-w-md w-full text-center">
            <div className="text-4xl mb-4">😅</div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Ops! Algo deu errado</h2>
            <p className="text-text-muted text-sm mb-4">{this.state.error?.message || 'Erro desconhecido'}</p>
            <button onClick={() => window.location.reload()} className="btn-primary px-6 py-2 rounded-xl text-sm">
              Recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
