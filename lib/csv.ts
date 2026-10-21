/** One CSV line. Quotes what needs quoting, and keeps a cell that starts like a formula (= + - @) from being run as one when it is opened in a spreadsheet. */
export function csvLine(cells: (string | number | null | undefined)[]): string {
  return cells
    .map((v) => {
      let s = v === null || v === undefined ? '' : String(v)
      if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    })
    .join(',')
}

export const csvResponse = (name: string, lines: string[]) =>
  new Response(`\uFEFF${lines.join('\r\n')}\r\n`, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' } })

export const iso = (t: number) => new Date(t * 1000).toISOString().slice(0, 10)
export const dollars = (cents: number) => (cents / 100).toFixed(2)
