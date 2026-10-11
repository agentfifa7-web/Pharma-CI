/**
 * Tour de garde officiel du mois (documents PDF d'Abidjan et des villes de l'intérieur).
 *
 *   # 1. Import d'un nouveau mois (une fois par mois, à partir des PDF reçus) :
 *   pdftotext -layout garde-abidjan.pdf abj.txt && pdftotext -layout garde-interieur.pdf int.txt
 *   node scripts/sync-pharmacies/roster.mjs --import 2026-10 abj.txt int.txt   # → garde/2026-10.json
 *
 *   # 2. Fusion dans public/data/pharmacies.json (chaque jour, après sync.mjs et official.mjs) :
 *   node scripts/sync-pharmacies/roster.mjs
 *
 * Tous les fichiers garde/*.json sont fusionnés : chaque pharmacie reçoit ses semaines de garde du mois,
 * et le site affiche d'office la bonne liste chaque semaine, même sans nouvelle synchronisation.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeRoster, parseAbidjan, parseInterior, weeksOf } from './roster-parse.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROSTERS = join(HERE, 'garde')
const DATA = join(HERE, '..', '..', 'public', 'data', 'pharmacies.json')
const log = (...a) => console.log('[garde]', ...a)
const argv = process.argv.slice(2)

if (argv[0] === '--import') {
  const [, month, abidjan, interior] = argv
  if (!/^\d{4}-\d{2}$/.test(month ?? '') || !abidjan || !interior) throw new Error('Usage : roster.mjs --import AAAA-MM abidjan.txt interieur.txt')
  const a = await readFile(abidjan, 'utf8')
  const b = await readFile(interior, 'utf8')
  const weeks = [...new Map([...weeksOf(a), ...weeksOf(b)].map((w) => [w.start, w])).values()].sort((x, y) => x.start.localeCompare(y.start))
  const entries = [...parseAbidjan(a), ...parseInterior(b)]
  for (const w of weeks) {
    const n = entries.filter((e) => e.week === w.start).length
    log(`${w.label} : ${n} pharmacies`)
    if (n < 50) throw new Error(`Semaine « ${w.label} » : trop peu de pharmacies lues (${n}) — mise en page du document modifiée ?`)
  }
  const out = join(ROSTERS, `${month}.json`)
  await writeFile(out, JSON.stringify({ month, source: 'Tour de garde officiel (Abidjan et villes de l’intérieur)', weeks, entries }, null, 1) + '\n')
  log(`${entries.length} gardes → ${out}`)
} else {
  const files = (await readdir(ROSTERS)).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort()
  const rosters = await Promise.all(files.map(async (f) => JSON.parse(await readFile(join(ROSTERS, f), 'utf8'))))
  const data = JSON.parse(await readFile(DATA, 'utf8'))
  const merged = mergeRoster(data, rosters)
  await writeFile(DATA, JSON.stringify(merged) + '\n')
  const r = merged.roster
  log(`${files.join(', ')} : ${r.pharmacies} pharmacies (${r.matchedPhone} par téléphone, ${r.matchedName} par nom, ${r.added} ajoutées) · de garde maintenant : ${merged.garde?.label ?? '—'} (${merged.counts.garde})`)
}
