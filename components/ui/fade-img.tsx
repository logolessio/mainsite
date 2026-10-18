/**
 * A picture. (It used to fade in once loaded, which kept it invisible until the page had woken up, and showed as flicker.
 * Pictures now simply appear as the browser draws them, on top of the placeholder colour behind them.)
 */
export function FadeImg({ alt = '', ...p }: React.ImgHTMLAttributes<HTMLImageElement>) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} decoding="async" {...p} />
}
