// The film, series and anime data on 17.logoless.io, from OMDb: writes lib/seventeen/titles.json, which lib/seventeen/packs.ts builds the catalogue from.
//   node --env-file=.env.local scripts/seventeen-omdb.mjs
// OMDB_API_KEY comes from .env.local. Each title is looked up by name and year (two calls: the short plot for the cards, the full one for its page),
// so the site itself never calls OMDb. To add a pack, add its title to TITLES (newest first: the order is the "just added" order) and run this again.
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const KEY = process.env.OMDB_API_KEY
if (!KEY) throw new Error('OMDB_API_KEY is not set (add it to .env.local)')

/** [title, year, kind, IMDb id when the name finds the wrong title]. Anime is our own kind: OMDb calls it a series. */
const TITLES = [
  ['Sinners', 2025, 'Film'],
  ['F1', 2025, 'Film'],
  ['Superman', 2025, 'Film'],
  ['Severance', 2022, 'Series'],
  ['Solo Leveling', 2024, 'Anime'],
  ['The Penguin', 2024, 'Series'],
  ['Gladiator II', 2024, 'Film'],
  ['Dune: Part Two', 2024, 'Film'],
  ['Challengers', 2024, 'Film'],
  ['Furiosa: A Mad Max Saga', 2024, 'Film'],
  ['Shogun', 2024, 'Series'],
  ['Frieren: Beyond Journey\'s End', 2023, 'Anime'],
  ['Oppenheimer', 2023, 'Film'],
  ['Saltburn', 2023, 'Film'],
  ['John Wick: Chapter 4', 2023, 'Film'],
  ['Spider-Man: Across the Spider-Verse', 2023, 'Film'],
  ['The Bear', 2022, 'Series'],
  ['Arcane', 2021, 'Anime'],
  ['The Batman', 2022, 'Film'],
  ['Top Gun: Maverick', 2022, 'Film'],
  ['House of the Dragon', 2022, 'Series'],
  ['Andor', 2022, 'Series'],
  ['Chainsaw Man', 2022, 'Anime'],
  ['Cyberpunk: Edgerunners', 2022, 'Anime'],
  ['Everything Everywhere All at Once', 2022, 'Film'],
  ['The Last of Us', 2023, 'Series'],
  ['Wednesday', 2022, 'Series'],
  ['Squid Game', 2021, 'Series'],
  ['Dune', 2021, 'Film'],
  ['Jujutsu Kaisen', 2020, 'Anime'],
  ['Joker', 2019, 'Film'],
  ['Parasite', 2019, 'Film'],
  ['Euphoria', 2019, 'Series'],
  ['The Boys', 2019, 'Series'],
  ['Avengers: Endgame', 2019, 'Film'],
  ['Demon Slayer: Kimetsu no Yaiba', 2019, 'Anime'],
  ['Vinland Saga', 2019, 'Anime'],
  ['Succession', 2018, 'Series'],
  ['Blade Runner 2049', 2017, 'Film'],
  ['Baby Driver', 2017, 'Film'],
  ['La La Land', 2016, 'Film'],
  ['Stranger Things', 2016, 'Series'],
  ['Mad Max: Fury Road', 2015, 'Film'],
  ['Better Call Saul', 2015, 'Series'],
  ['Mr. Robot', 2015, 'Series'],
  ['Interstellar', 2014, 'Film'],
  ['Whiplash', 2014, 'Film'],
  ['Nightcrawler', 2014, 'Film'],
  ['Gone Girl', 2014, 'Film'],
  ['True Detective', 2014, 'Series'],
  ['Peaky Blinders', 2013, 'Series'],
  ['The Wolf of Wall Street', 2013, 'Film'],
  ['Prisoners', 2013, 'Film'],
  ['Attack on Titan', 2013, 'Anime'],
  ['Drive', 2011, 'Film'],
  ['Game of Thrones', 2011, 'Series'],
  ['Inception', 2010, 'Film'],
  ['Shutter Island', 2010, 'Film'],
  ['The Social Network', 2010, 'Film'],
  ['Breaking Bad', 2008, 'Series'],
  ['The Dark Knight', 2008, 'Film'],
  ['No Country for Old Men', 2007, 'Film'],
  ['There Will Be Blood', 2007, 'Film'],
  ['Naruto: Shippuden', 2007, 'Anime'],
  ['Death Note', 2006, 'Anime'],
  ['The Prestige', 2006, 'Film'],
  ['Dexter', 2006, 'Series'],
  ['Kill Bill: Vol. 1', 2003, 'Film'],
  ['American Psycho', 2000, 'Film'],
  ['Gladiator', 2000, 'Film'],
  ['Fight Club', 1999, 'Film'],
  ['The Matrix', 1999, 'Film'],
  ['The Sopranos', 1999, 'Series'],
  ['Heat', 1995, 'Film'],
  ['Se7en', 1995, 'Film', 'tt0114369'],
  ['Pulp Fiction', 1994, 'Film'],
  ['Scarface', 1983, 'Film'],
  ['Taxi Driver', 1976, 'Film'],
  ['The Godfather', 1972, 'Film'],
]

const get = async (params) => {
  const res = await fetch(`https://www.omdbapi.com/?apikey=${KEY}&${new URLSearchParams(params)}`)
  const j = await res.json()
  if (j.Response !== 'True') throw new Error(`${params.t}: ${j.Error}`)
  return j
}
// OMDb leaves some characters as HTML entities (O&apos;Connell)
const ENTITIES = { '&apos;': "'", '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>' }
const val = (v) => (v && v !== 'N/A' ? v.replace(/&(?:apos|quot|amp|lt|gt);/g, (e) => ENTITIES[e]) : undefined)

const out = []
for (const [t, y, kind, id] of TITLES) {
  const type = kind === 'Film' ? 'movie' : 'series'
  // a series is listed under the year it started, which OMDb gives as "2019–", so its year is only a hint
  const short = id ? await get({ i: id, plot: 'short' }) : await get({ t, y: String(y), type, plot: 'short' }).catch(() => get({ t, type, plot: 'short' }))
  const full = await get({ i: short.imdbID, plot: 'full' })
  const rt = short.Ratings?.find((r) => r.Source === 'Rotten Tomatoes')?.Value
  out.push({
    imdbID: short.imdbID,
    kind,
    title: short.Title,
    year: short.Year,
    rated: val(short.Rated),
    released: val(short.Released),
    runtime: val(short.Runtime),
    genres: (val(short.Genre) ?? '').split(', ').filter(Boolean),
    director: val(short.Director),
    writer: val(short.Writer),
    actors: (val(short.Actors) ?? '').split(', ').filter(Boolean),
    plot: val(short.Plot),
    plotFull: val(full.Plot),
    language: val(short.Language),
    country: val(short.Country),
    awards: val(short.Awards),
    // the address without its size, so the site can ask for the size it needs (see poster() in lib/seventeen/packs.ts)
    poster: val(short.Poster)?.replace(/\._V1_.*$/, '._V1_'),
    imdbRating: val(short.imdbRating),
    imdbVotes: val(short.imdbVotes),
    metascore: val(short.Metascore),
    rottenTomatoes: rt,
    seasons: val(short.totalSeasons),
  })
  console.log(`${short.imdbID}  ${kind.padEnd(6)} ${short.Title} (${short.Year})`)
}

writeFileSync(join(ROOT, 'lib', 'seventeen', 'titles.json'), JSON.stringify(out, null, 1) + '\n')
console.log(`\n${out.length} titles written to lib/seventeen/titles.json`)
