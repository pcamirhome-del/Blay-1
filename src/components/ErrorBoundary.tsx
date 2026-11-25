import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'حدث خطأ غير متوقع',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let parsedDetails: { operationType?: string; path?: string; error?: string } | null = null;
      try {
        parsedDetails = JSON.parse(this.state.errorMessage);
      } catch {
        parsedDetails = null;
      }

      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6"
        >
          <div className="w-full max-w-md rounded-2xl bg-slate-900/90 backdrop-blur-md border border-rose-500/40 p-6 shadow-xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold font-display">تنبيه في الاتصال أو الصلاحيات</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              {parsedDetails?.error
                ? `تعذر إتمام العملية (${parsedDetails.operationType} على المسار ${parsedDetails.path}): ${parsedDetails.error}`
                : this.state.errorMessage}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm px-4 py-2.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل التطبيق</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
