import { createContext, useContext } from "react";
import { useAppState } from "../hooks/useAppState";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const state = useAppState();
  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const ctx = useContext(AppContext);
  if (ctx === null) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return ctx;
}
