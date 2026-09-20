import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem('daily_delivery_entry_draft_v1');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#EEF2F0] dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC]">
          <div className="max-w-md w-full bg-white dark:bg-[#111A18] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold font-display">Something didn't load properly</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A component error was caught safely. Click reload below to refresh the page.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="text-left bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl p-3 text-[11px] font-mono text-rose-600 dark:text-rose-400 break-words max-h-32 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl btn-tactile-primary font-bold text-xs cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload App</span>
              </button>
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#162220] hover:bg-slate-200 text-[#1E293B] dark:text-slate-200 border border-[#E2E8F0] dark:border-[#1E2E2A] font-semibold text-xs cursor-pointer transition-colors"
              >
                Clear Draft & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
