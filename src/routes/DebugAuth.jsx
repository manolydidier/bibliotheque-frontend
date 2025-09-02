// src/routes/DebugAuth.jsx
import React from "react";
import { useSelector } from "react-redux";

const selectDebug = (s) => ({
  token: s?.library?.auth?.token ?? null,
  isAuthenticated: !!(s?.library?.auth?.token),
  loading: !!(s?.library?.auth?.loading),
  // selon ta config persist:
  rootPersistRehydrated: s?._persist?.rehydrated ?? undefined,
  libPersistRehydrated:  s?.library?._persist?.rehydrated ?? undefined,
});

export default function DebugAuth() {
  const st = useSelector(selectDebug);
  return (
    <pre style={{
      position: "fixed", bottom: 10, right: 10, zIndex: 9999,
      background: "rgba(0,0,0,0.75)", color: "#fff",
      padding: "10px", borderRadius: 8, fontSize: 12, maxWidth: 380
    }}>
      {JSON.stringify(st, null, 2)}
    </pre>
  );
}
