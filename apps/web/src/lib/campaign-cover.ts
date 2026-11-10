export const CAMPAIGN_COVERS = [
  'from-[#2a1c08] via-[#5c4410] to-[#c9a22a]', // ouro/pergaminho
  'from-[#0b0c11] via-[#3a0f0f] to-[#6a2817]', // cripta/sangue (WoD)
  'from-[#1a120c] via-[#3a2418] to-[#8f3a24]', // cinza/ferrugem (horror)
  'from-[#1a0c04] via-[#5c2800] to-[#d9662b]', // brasa/bronze (sci-fi)
  'from-[#2e2318] via-[#5f5040] to-[#c9a22a]', // couro/ouro (genérico)
] as const

export const coverFor = (i: number) => CAMPAIGN_COVERS[i % CAMPAIGN_COVERS.length]
