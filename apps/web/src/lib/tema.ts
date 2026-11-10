/**
 * Alterna claro ↔ escuro. Mantém a classe `.dark` (telas antigas) e o
 * atributo `data-tema` (tokens do redesign) em sincronia no <html>.
 * A preferência persiste em localStorage('saga-theme').
 */
export function toggleTema() {
  const root = document.documentElement
  const escuro = root.getAttribute('data-tema') !== 'escuro'
  root.classList.toggle('dark', escuro)
  root.setAttribute('data-tema', escuro ? 'escuro' : 'claro')
  try {
    localStorage.setItem('saga-theme', escuro ? 'dark' : 'light')
  } catch {
    /* localStorage indisponível — ignora */
  }
}
