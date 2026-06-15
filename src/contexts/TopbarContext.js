"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";

const TopbarContext = createContext(null);
const SetTopbarContext = createContext(null);

export function TopbarProvider({ children }) {
  const [config, setConfig] = useState({});

  return (
    <SetTopbarContext.Provider value={setConfig}>
      <TopbarContext.Provider value={config}>
        {children}
      </TopbarContext.Provider>
    </SetTopbarContext.Provider>
  );
}

export function useTopbarConfig() {
  const ctx = useContext(TopbarContext);

  if (!ctx) {
    throw new Error("useTopbarConfig must be used within a TopbarProvider");
  }

  return ctx;
}

export function useSetTopbar(config) {
  const setConfig = useContext(SetTopbarContext);

  useLayoutEffect(() => {
    setConfig(config || {});
  });
}
