import type { Match, Phase, Score, Team } from '../types'
import gamesSnapshot from '../data/games.snapshot.json'
import teamsSnapshot from '../data/teams.snapshot.json'

/**
 * Integração com a World Cup 2026 API (github.com/rezarahiminia/worldcup2026,
 * hospedada em worldcup26.ir): 104 jogos, 48 seleções, placares ao vivo.
 *
 * Estratégia de resiliência:
 *  1. Tenta a API ao vivo via proxy `/wc-api` (configurado no vite.config.ts).
 *  2. Se falhar (offline, CORS, API fora do ar), usa o snapshot local
 *     em `src/data/*.snapshot.json` — o app nunca fica sem calendário.
 */

const API_BASE = '/wc-api'
const REQUEST_TIMEOUT_MS = 8000

/* ---------- Formato bruto da API ---------- */

interface ApiTeam {
  id: string
  name_en: string
  fifa_code: string
  flag: string
  groups: string
}

interface ApiGame {
  id: string
  home_team_id: string
  away_team_id: string
  home_score: string
  away_score: string
  group: string
  local_date: string // MM/DD/YYYY HH:mm — no fuso local do ESTÁDIO
  stadium_id: string
  finished: string // "TRUE" | "FALSE"
  type: string // group | r32 | r16 | qf | sf | third | final
  home_team_label?: string
  away_team_label?: string
}

/**
 * Fuso IANA de cada estádio (id da API → timezone). A API envia o horário
 * na hora local do estádio; convertemos para UTC e o navegador exibe no
 * fuso de quem está vendo (ex.: 13:00 no Azteca → 16:00 em Brasília).
 */
const STADIUM_TIMEZONES: Record<string, string> = {
  '1': 'America/Mexico_City', // Estadio Azteca — Cidade do México
  '2': 'America/Mexico_City', // Estadio Akron — Guadalajara
  '3': 'America/Monterrey', // Estadio BBVA — Monterrey
  '4': 'America/Chicago', // AT&T Stadium — Dallas
  '5': 'America/Chicago', // NRG Stadium — Houston
  '6': 'America/Chicago', // Arrowhead — Kansas City
  '7': 'America/New_York', // Mercedes-Benz — Atlanta
  '8': 'America/New_York', // Hard Rock — Miami
  '9': 'America/New_York', // Gillette — Boston
  '10': 'America/New_York', // Lincoln Financial — Philadelphia
  '11': 'America/New_York', // MetLife — Nova York/Nova Jersey
  '12': 'America/Toronto', // BMO Field — Toronto
  '13': 'America/Vancouver', // BC Place — Vancouver
  '14': 'America/Los_Angeles', // Lumen Field — Seattle
  '15': 'America/Los_Angeles', // Levi's — São Francisco
  '16': 'America/Los_Angeles', // SoFi — Los Angeles
}

const DEFAULT_TIMEZONE = 'America/New_York'

const PHASE_BY_TYPE: Record<string, Phase> = {
  group: 'GROUP',
  r32: 'ROUND_OF_32',
  r16: 'ROUND_OF_16',
  qf: 'QUARTER_FINAL',
  sf: 'SEMI_FINAL',
  third: 'THIRD_PLACE',
  final: 'FINAL',
}

/** Nomes em português, indexados pelo código FIFA (fallback: nome em inglês da API). */
const TEAM_NAMES_PT: Record<string, string> = {
  MEX: 'México', RSA: 'África do Sul', KOR: 'Coreia do Sul', CZE: 'República Tcheca',
  CAN: 'Canadá', BIH: 'Bósnia e Herzegovina', QAT: 'Catar', SUI: 'Suíça',
  BRA: 'Brasil', MAR: 'Marrocos', HAI: 'Haiti', SCO: 'Escócia',
  USA: 'Estados Unidos', PAR: 'Paraguai', AUS: 'Austrália', TUR: 'Turquia',
  GER: 'Alemanha', CUW: 'Curaçao', CIV: 'Costa do Marfim', ECU: 'Equador',
  NED: 'Holanda', JPN: 'Japão', SWE: 'Suécia', TUN: 'Tunísia',
  BEL: 'Bélgica', EGY: 'Egito', IRN: 'Irã', NZL: 'Nova Zelândia',
  ESP: 'Espanha', CPV: 'Cabo Verde', KSA: 'Arábia Saudita', URU: 'Uruguai',
  FRA: 'França', SEN: 'Senegal', IRQ: 'Iraque', NOR: 'Noruega',
  ARG: 'Argentina', ALG: 'Argélia', AUT: 'Áustria', JOR: 'Jordânia',
  POR: 'Portugal', COD: 'RD do Congo', UZB: 'Uzbequistão', COL: 'Colômbia',
  ENG: 'Inglaterra', CRO: 'Croácia', GHA: 'Gana', PAN: 'Panamá',
}

/** Traduz os labels de vagas do mata-mata ("Winner Group D" → "1º Grupo D"). */
function translateLabel(label: string): string {
  return label
    .replace(/^Winner Group (\w)$/, '1º Grupo $1')
    .replace(/^Runner-up Group (\w)$/, '2º Grupo $1')
    .replace(/^3rd Group (.+)$/, '3º Grupos $1')
    .replace(/^Winner Match (\d+)$/, 'Vencedor Jogo $1')
    .replace(/^Loser Match (\d+)$/, 'Perdedor Jogo $1')
}

/* ---------- Mapeamento API → domínio ---------- */

function toTeam(apiTeam: ApiTeam | undefined, label: string | undefined): Team {
  if (!apiTeam) {
    return { code: 'TBD', name: label ? translateLabel(label) : 'A definir', flag: '' }
  }
  return {
    code: apiTeam.fifa_code,
    name: TEAM_NAMES_PT[apiTeam.fifa_code] ?? apiTeam.name_en,
    flag: apiTeam.flag,
  }
}

/** Diferença (ms) entre o relógio de parede do fuso dado e o UTC, num instante. */
function tzOffsetMs(epochMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(epochMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  )
  return asUtc - epochMs
}

/** "06/11/2026 13:00" (MM/DD/YYYY, hora local do estádio) → ISO 8601 em UTC. */
function parseApiDate(localDate: string, timeZone: string): string {
  const [date, time] = localDate.split(' ')
  const [month, day, year] = date.split('/').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wallUtc = Date.UTC(year, month - 1, day, hour, minute)
  // duas passadas para estabilizar em viradas de horário de verão
  let offset = tzOffsetMs(wallUtc, timeZone)
  offset = tzOffsetMs(wallUtc - offset, timeZone)
  return new Date(wallUtc - offset).toISOString()
}

function toRealScore(game: ApiGame): Score | null {
  if (game.finished !== 'TRUE') return null
  return { home: Number(game.home_score), away: Number(game.away_score) }
}

function mapToMatches(games: ApiGame[], teams: ApiTeam[]): Match[] {
  const teamById = new Map(teams.map((t) => [t.id, t]))
  return games.map((game) => ({
    id: game.id,
    date: parseApiDate(game.local_date, STADIUM_TIMEZONES[game.stadium_id] ?? DEFAULT_TIMEZONE),
    phase: PHASE_BY_TYPE[game.type] ?? 'GROUP',
    group: game.type === 'group' ? game.group : undefined,
    homeTeam: toTeam(teamById.get(game.home_team_id), game.home_team_label),
    awayTeam: toTeam(teamById.get(game.away_team_id), game.away_team_label),
    realScore: toRealScore(game),
  }))
}

/* ---------- Fetch com timeout + fallback ---------- */

async function fetchJson<T>(path: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal: controller.signal })
    if (!response.ok) throw new Error(`API respondeu ${response.status}`)
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Busca o calendário completo. API ao vivo primeiro; snapshot local como fallback.
 */
export async function fetchMatches(): Promise<Match[]> {
  try {
    const [gamesRes, teamsRes] = await Promise.all([
      fetchJson<{ games: ApiGame[] }>('/get/games'),
      fetchJson<{ teams: ApiTeam[] }>('/get/teams'),
    ])
    return mapToMatches(gamesRes.games, teamsRes.teams)
  } catch (error) {
    console.warn('[fifaApi] API ao vivo indisponível, usando snapshot local.', error)
    return mapToMatches(
      gamesSnapshot as unknown as ApiGame[],
      teamsSnapshot as unknown as ApiTeam[],
    )
  }
}
