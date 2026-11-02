// The moving backgrounds drawn by the graphics card, all in greys. Each is one fragment shader; the runner (gl.tsx) feeds them the same few inputs:
//   u_res    the size of the drawing in pixels        u_time   seconds, already scaled by the speed setting
//   u_ptr    the pointer, 0 to 1 (y up)               u_k      how strong the effect is, 0 to 1
//   u_tone   the page's tone, 0 black to 1 white      u_inv    1 on a light page (the effect is drawn dark on it)
//   u_audio  the loudness of the music, 0 to 1 (0 with no music)
// `ink(v)` turns a brightness (0 nothing, 1 full) into a grey that sits between the page's tone and its opposite.

export const VERTEX = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`

const HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res; uniform float u_time; uniform vec2 u_ptr; uniform float u_k; uniform float u_tone; uniform float u_inv; uniform float u_audio;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
vec3 ink(float v){ float top = mix(1.0, 0.0, u_inv); return vec3(mix(u_tone, top, clamp(v, 0.0, 1.0) * u_k)); }
vec2 uvp(){ return (gl_FragCoord.xy - 0.5 * u_res) / u_res.y; }
vec2 mouse(){ return (u_ptr - 0.5) * vec2(u_res.x / u_res.y, 1.0); }
`

/** Warped noise that flows like oil on water; the pointer stirs it. */
const LIQUID = `${HEAD}
void main(){
  vec2 p = uvp() * 2.4; float t = u_time * 0.1;
  vec2 m = mouse() * 2.4; float d = length(p - m);
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t), fbm(p + 4.0 * q + vec2(8.3, 2.8) + 0.126 * t));
  r += 0.35 * exp(-d * 1.6) * vec2(sin(t * 6.0 + d * 4.0), cos(t * 5.0 - d * 4.0));
  float f = fbm(p + 4.0 * r);
  float v = smoothstep(0.18, 0.95, f * 1.35);
  v = pow(v, 1.25) * (0.85 + 0.5 * u_audio);
  gl_FragColor = vec4(ink(v), 1.0);
}`

/** Rings that spread from the pointer and from a few drops that fall by themselves. */
const RIPPLE = `${HEAD}
float ring(vec2 p, vec2 c, float t, float s){ float d = length(p - c); return sin(d * 26.0 - t * s) * exp(-d * 2.1); }
void main(){
  vec2 p = uvp(); float t = u_time;
  float v = 0.0;
  v += 0.55 * ring(p, mouse(), t, 3.2);
  v += 0.35 * ring(p, vec2(0.42 * sin(t * 0.31), 0.3 * cos(t * 0.27)), t, 2.2);
  v += 0.35 * ring(p, vec2(-0.5 * cos(t * 0.19), 0.25 * sin(t * 0.23 + 1.0)), t, 2.7);
  v += 0.2 * ring(p, vec2(0.1, -0.35), t, 1.8);
  v += 0.14 * (fbm(p * 3.0 + t * 0.08) - 0.5);
  v = 0.5 + 0.5 * v * (1.0 + u_audio);
  v = smoothstep(0.35, 0.95, v);
  gl_FragColor = vec4(ink(v * 0.8), 1.0);
}`

/** Slow smoke that parts around the pointer. */
const SMOKE = `${HEAD}
void main(){
  vec2 p = uvp() * 1.7; float t = u_time * 0.12;
  vec2 m = mouse() * 1.7; float d = length(p - m);
  vec2 w = vec2(fbm(p * 1.6 + vec2(0.0, -t)), fbm(p * 1.6 + vec2(3.1, -t * 1.3)));
  float f = fbm(p * 1.4 + 2.2 * w + vec2(0.0, -t * 1.5));
  float v = smoothstep(0.25, 0.85, f);
  v *= 1.0 - 0.75 * exp(-d * d * 3.0);
  v *= 0.9 + 0.6 * u_audio;
  v *= smoothstep(1.7, 0.2, length(uvp() * vec2(0.8, 1.2)));
  gl_FragColor = vec4(ink(v * 0.95), 1.0);
}`

/** Lines of equal height, like a map, rising and sinking. The pointer pushes a hill up. */
const CONTOUR = `${HEAD}
void main(){
  vec2 p = uvp() * 2.0; float t = u_time * 0.08;
  vec2 m = mouse() * 2.0; float d = length(p - m);
  float h = fbm(p * 1.1 + vec2(t, -t * 0.6)) + 0.55 * exp(-d * d * 1.8) + 0.12 * u_audio;
  float f = fract(h * 11.0);
  float line = 1.0 - smoothstep(0.0, 0.07, abs(f - 0.5) * 2.0 * 0.5);
  float fine = 1.0 - smoothstep(0.0, 0.03, abs(fract(h * 55.0) - 0.5));
  gl_FragColor = vec4(ink(line * 0.85 + fine * 0.12), 1.0);
}`

/** Flowing shapes drawn in a dither of dots, the way a very old screen would. */
const DITHER = `${HEAD}
float bayer(vec2 c){ vec2 a = mod(c, 4.0); float x = a.x; float y = a.y;
  float i = mod(x + y * 4.0, 16.0);
  float b = 0.0;
  b += (mod(floor(i / 8.0), 2.0)) * 0.5 + (mod(floor(i / 4.0), 2.0)) * 0.25 + (mod(floor(i / 2.0), 2.0)) * 0.125 + (mod(i, 2.0)) * 0.0625;
  return fract(b * 1.37 + hash(c) * 0.0);
}
void main(){
  vec2 cell = floor(gl_FragCoord.xy / 3.0);
  vec2 p = (cell * 3.0 - 0.5 * u_res) / u_res.y * 2.2; float t = u_time * 0.1;
  vec2 m = mouse() * 2.2; float d = length(p - m);
  float f = fbm(p + 2.0 * vec2(fbm(p + t), fbm(p - t))) + 0.5 * exp(-d * d * 2.0) + 0.15 * u_audio;
  f = smoothstep(0.2, 0.95, f);
  float v = step(bayer(cell), f);
  gl_FragColor = vec4(ink(v * 0.8), 1.0);
}`

/** Television snow with a bar that rolls up the screen. The pointer tears it. */
const STATIC = `${HEAD}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float t = u_time;
  float tear = exp(-pow((uv.y - u_ptr.y) * 14.0, 2.0)) * 0.03;
  vec2 g = floor((gl_FragCoord.xy + vec2(tear * u_res.x, 0.0)) / 2.0);
  float n = hash(g + floor(t * 22.0) * 7.31);
  float bar = smoothstep(0.0, 0.08, fract(uv.y - t * 0.07)) * smoothstep(0.3, 0.1, fract(uv.y - t * 0.07));
  float lines = 0.5 + 0.5 * sin(uv.y * u_res.y * 1.2);
  float v = n * (0.42 + 0.5 * u_audio) * (0.6 + 0.4 * lines) + bar * 0.28;
  gl_FragColor = vec4(ink(v), 1.0);
}`

/** Liquid metal: blobs that merge, lit like chrome. */
const MERCURY = `${HEAD}
float field(vec2 p, float t){
  float f = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 c = vec2(sin(t * (0.31 + fi * 0.07) + fi * 2.1), cos(t * (0.27 + fi * 0.05) + fi * 1.3)) * vec2(0.62, 0.38);
    float r = 0.1 + 0.03 * sin(fi * 3.0 + t) + 0.04 * u_audio;
    f += r * r / (dot(p - c, p - c) + 0.0004);
  }
  vec2 m = mouse();
  f += 0.012 / (dot(p - m, p - m) + 0.0004);
  return f;
}
void main(){
  vec2 p = uvp(); float t = u_time * 0.5;
  float e = 0.004;
  float f = field(p, t);
  float fx = field(p + vec2(e, 0.0), t) - field(p - vec2(e, 0.0), t);
  float fy = field(p + vec2(0.0, e), t) - field(p - vec2(0.0, e), t);
  vec3 n = normalize(vec3(-fx, -fy, 0.35 * e * 20.0));
  float inside = smoothstep(0.95, 1.05, f);
  float light = pow(max(dot(n, normalize(vec3(-0.5, 0.7, 0.6))), 0.0), 6.0);
  float env = 0.5 + 0.5 * sin(n.x * 5.0 + n.y * 4.0 + 1.0);
  float v = inside * (0.18 + 0.55 * env + 0.6 * light);
  float halo = (1.0 - inside) * smoothstep(0.2, 0.9, f) * 0.18;
  gl_FragColor = vec4(ink(v + halo), 1.0);
}`

export const SHADER_SOURCE = { liquid: LIQUID, ripple: RIPPLE, smoke: SMOKE, contour: CONTOUR, dither: DITHER, static: STATIC, mercury: MERCURY } as const
/** Shaders that are heavy are drawn smaller and stretched, which also softens them. */
export const SHADER_SCALE: Record<keyof typeof SHADER_SOURCE, number> = { liquid: 0.55, ripple: 0.7, smoke: 0.5, contour: 0.75, dither: 1, static: 1, mercury: 0.7 }
