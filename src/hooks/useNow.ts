import { useEffect, useState } from 'react'

/**
 * Relógio reativo: re-renderiza o componente no intervalo dado.
 * Usado para travar palpites no horário exato do início de cada jogo,
 * mesmo que o usuário deixe a tela aberta.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
