import React from "react";
import { withTranslation } from "react-i18next";

class ErrorBoundary extends React.Component {
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
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
          <div className="font-semibold mb-1">{t("Oops, something went wrong.")}</div>
          <div className="text-sm opacity-80">
            {this.state.error?.message || t("Unknown error.")}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
