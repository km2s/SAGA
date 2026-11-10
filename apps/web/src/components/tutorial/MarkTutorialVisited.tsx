'use client'

import { useEffect } from 'react'

export function MarkTutorialVisited({ tutorialKey }: { tutorialKey: string }) {
  useEffect(() => {
    localStorage.setItem(tutorialKey, 'true')
  }, [tutorialKey])
  return null
}
