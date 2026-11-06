'use client'

import { Template } from './Template'
import { useLandingVals } from './vals'

export function Landing() {
  return <Template v={useLandingVals()} />
}
