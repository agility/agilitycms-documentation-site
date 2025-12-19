'use client'

import React, { createContext, useContext } from 'react'

interface GlobalData {
  mainMenuLinks?: any[]
  primaryDropdownLinks?: any[]
  secondaryDropdownLinks?: any[]
  marketingContent?: any
  preHeader?: any
  footerNavigation?: any[]
  footerBottomNavigation?: any[]
  footerCopyright?: string
}

const GlobalDataContext = createContext<GlobalData | null>(null)

export function GlobalDataProvider({
  children,
  data
}: {
  children: React.ReactNode
  data: GlobalData
}) {
  return (
    <GlobalDataContext.Provider value={data}>
      {children}
    </GlobalDataContext.Provider>
  )
}

export function useGlobalData() {
  const context = useContext(GlobalDataContext)
  if (!context) {
    throw new Error('useGlobalData must be used within GlobalDataProvider')
  }
  return context
}
