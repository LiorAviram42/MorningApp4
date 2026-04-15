import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-red-50 p-4 text-center" dir="rtl">
          <h1 className="text-2xl font-bold text-red-600 mb-4">אופס! משהו השתבש.</h1>
          <p className="text-gray-700 mb-4">האפליקציה נתקלה בשגיאה לא צפויה.</p>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200 text-left w-full max-w-md overflow-auto mb-6">
            <pre className="text-xs text-red-500 whitespace-pre-wrap font-mono">
              {this.state.error?.message || 'שגיאה לא ידועה'}
            </pre>
          </div>
          <button
            className="px-6 py-2 bg-red-600 text-white rounded-full font-bold shadow-md"
            onClick={() => window.location.reload()}
          >
            טען מחדש
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
