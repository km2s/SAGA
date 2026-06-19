'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { type Locale, type T, translations } from './translations'

export { translations }

interface LocaleContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: T
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'pt',
  setLocale: () => {},
  t: translations.pt,
})

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode
  initialLocale: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    document.cookie = `saga-locale=${l};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en'
  }, [])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  )
}

export const useLocale = () => useContext(LocaleContext)
