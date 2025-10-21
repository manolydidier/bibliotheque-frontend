// src/components/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Optionnel: log à Sentry, console, etc.
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
          <div className="font-semibold mb-1">Oups, un problème est survenu.</div>
          <div className="text-sm opacity-80">
            {this.state.error?.message || "Erreur inconnue."}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
