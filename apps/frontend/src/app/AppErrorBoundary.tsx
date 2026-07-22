import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Surface } from "@/components/ui";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled RefLab interface error", error, info);
  }

  private reload = () => {
    window.location.reload();
  };

  private goHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="mc-min-screen grid place-items-center bg-(--mc-color-canvas) px-5 py-10">
        <Surface className="w-full max-w-lg text-center sm:p-8" variant="raised" padding="lg">
          <span className="mc-brand-stripes mx-auto mb-6" aria-hidden="true" />
          <p className="mc-eyebrow mb-2">RefLab</p>
          <h1 className="mc-page-title">Não foi possível mostrar esta página</h1>
          <p className="mt-3 text-sm leading-6 text-(--mc-color-text-secondary)">
            Os teus dados permanecem guardados. Atualiza a aplicação e tenta novamente.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="secondary" onClick={this.goHome}>
              Voltar ao início
            </Button>
            <Button type="button" onClick={this.reload}>
              Atualizar aplicação
            </Button>
          </div>
        </Surface>
      </main>
    );
  }
}
