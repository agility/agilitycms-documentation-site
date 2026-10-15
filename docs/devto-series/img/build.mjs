// Builds the series illustrations.
//
//   src/NN-name.svg  hand-written source, timed with data-* attributes (below)
//   out/NN-name.svg  compiled: animated SVG with CSS keyframes (for sites that serve SVG as-is)
//   out/NN-name.gif  rendered animation, for dev.to (its image proxy breaks SVG)
//   out/NN-name.png  final frame, still
//   out/cover-NN.png dev.to cover image (1000x420, rendered at 2x)
//
// Timing attributes on any element in a source SVG (seconds into the loop):
//   data-in="1.2"        hidden until 1.2s, then fades in
//   data-out="4"         fades out again at 4s (and is hidden in the still)
//   data-anim="rise"     fade (default) | rise | grow-x | grow-y | draw | pulse | move
//   data-from="-300,0"   move: start offset (px); fades in there, then slides to its real position
//   data-dur="0.8"       length of the grow/draw transition
//   data-period="2"      pulse: seconds per trip along the path (should divide the loop)
// The root <svg> takes data-loop="10" (loop length in seconds).
//
// Without animation (prefers-reduced-motion, or a viewer that ignores CSS) every
// element shows its end state, so the still is always the complete picture.
//
// Run: npm i --no-save puppeteer-core && node docs/devto-series/img/build.mjs [NN ...]
// Needs Google Chrome and ffmpeg.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { covers } from "./covers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "src");
const outDir = join(here, "out");
const FPS = 15;
const FADE = 0.4;
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const pct = (t, loop) => `${Math.min(100, Math.max(0, (t / loop) * 100)).toFixed(2)}%`;

function compile(svg) {
	const loop = Number(svg.match(/data-loop="([\d.]+)"/)?.[1] ?? 10);
	const css = [];
	let n = 0;
	const out = svg.replace(/<([a-zA-Z]+)\b([^>]*?\sdata-(?:in|anim)="[^"]*"[^>]*?)(\/?)>/g, (_, tag, attrs, selfClose) => {
		const get = (k) => attrs.match(new RegExp(`\\sdata-${k}="([^"]*)"`))?.[1];
		const anim = get("anim") || "fade";
		const tin = Number(get("in") ?? 0);
		const tout = get("out") != null ? Number(get("out")) : null;
		const dur = Number(get("dur") ?? (anim === "draw" ? 0.8 : 0.9));
		const cls = `k${n++}`;
		const p = (t) => pct(t, loop);
		if (anim === "move") {
			const [dx, dy] = (get("from") ?? "0,0").split(",").map(Number);
			const from = `transform:translate(${dx}px,${dy}px)`;
			const frames = [`0%{opacity:0;${from}}`, `${p(tin)}{opacity:0;${from}}`, `${p(tin + FADE)}{opacity:1;${from}}`,
				`${p(tin + FADE + 0.5)}{opacity:1;${from}}`, `${p(tin + FADE + 0.5 + dur)}{opacity:1;transform:none}`];
			if (tout != null) frames.push(`${p(tout)}{opacity:1;transform:none}`, `${p(tout + FADE)}{opacity:0;transform:none}`, `100%{opacity:0}`);
			else frames.push(`100%{opacity:1;transform:none}`);
			css.push(`.${cls}{${tout != null ? "opacity:0;" : ""}animation:${cls} ${loop}s ease-in-out infinite}`);
			css.push(`@keyframes ${cls}{${frames.join("")}}`);
		} else if (anim === "pulse") {
			const period = Number(get("period") ?? 2);
			css.push(`.${cls}{stroke-dasharray:.06 .94;animation:${cls} ${period}s linear infinite}`);
			css.push(`@keyframes ${cls}{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}`);
		} else {
			const prop = {
				fade: ["opacity:0", "opacity:1"],
				rise: ["opacity:0;transform:translateY(14px)", "opacity:1;transform:none"],
				"grow-x": ["opacity:1;transform:scaleX(0)", "opacity:1;transform:none"],
				"grow-y": ["opacity:1;transform:scaleY(0)", "opacity:1;transform:none"],
				draw: ["stroke-dashoffset:1", "stroke-dashoffset:0"],
			}[anim];
			const span = anim === "fade" || anim === "rise" ? FADE : dur;
			const hidden = anim === "draw" ? "stroke-dashoffset:1" : "opacity:0";
			const frames = [`0%{${prop[0]}}`, `${p(tin)}{${prop[0]}}`, `${p(tin + span)}{${prop[1]}}`];
			if (tout != null) frames.push(`${p(tout)}{${prop[1]}}`, `${p(tout + FADE)}{${hidden}}`, `100%{${hidden}}`);
			else frames.push(`100%{${prop[1]}}`);
			const origin = anim === "grow-x" ? "transform-origin:left center;" : anim === "grow-y" ? "transform-origin:center bottom;" : "";
			const base = tout != null ? (anim === "draw" ? "stroke-dashoffset:1;" : "opacity:0;") : "";
			const dash = anim === "draw" ? "stroke-dasharray:1;" : "";
			css.push(`.${cls}{${base}${dash}transform-box:fill-box;${origin}animation:${cls} ${loop}s ease-out infinite}`);
			css.push(`@keyframes ${cls}{${frames.join("")}}`);
		}
		const withClass = /\sclass="/.test(attrs) ? attrs.replace(/\sclass="([^"]*)"/, ` class="$1 ${cls}"`) : `${attrs} class="${cls}"`;
		const clean = withClass.replace(/\sdata-(in|out|anim|dur|period|from)="[^"]*"/g, "");
		return `<${tag}${clean}${selfClose}>`;
	});
	// The whole scene fades in at the start of each loop and out at the end, so the GIF loops cleanly.
	css.push(`#scene{animation:scene ${loop}s linear infinite}`);
	css.push(`@keyframes scene{0%{opacity:0}${pct(0.3, loop)}{opacity:1}${pct(loop - 0.5, loop)}{opacity:1}100%{opacity:0}}`);
	css.push(`@media (prefers-reduced-motion:reduce){*{animation:none!important}}`);
	return { svg: out.replace("</style>", `${css.join("\n")}\n</style>`), loop };
}

async function render(browser, file, { width, height, loop, scale = 1, still = false }) {
	const page = await browser.newPage();
	await page.setViewport({ width, height, deviceScaleFactor: scale });
	if (still) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
	await page.goto(`file://${file}`);
	if (still) {
		const png = await page.screenshot({ type: "png" });
		await page.close();
		return [png];
	}
	const frames = [];
	for (let i = 0; i < loop * FPS; i++) {
		await page.evaluate((ms) => {
			for (const a of document.getAnimations()) {
				a.pause();
				a.currentTime = ms;
			}
		}, (i * 1000) / FPS);
		frames.push(await page.screenshot({ type: "png" }));
	}
	await page.close();
	return frames;
}

function toGif(frames, gifPath) {
	const dir = join(tmpdir(), `devto-frames-${process.pid}`);
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	frames.forEach((f, i) => writeFileSync(join(dir, `f${String(i).padStart(4, "0")}.png`), f));
	execFileSync("ffmpeg", [
		"-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(dir, "f%04d.png"),
		"-vf", "split[a][b];[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=none",
		"-loop", "0", gifPath,
	]);
	rmSync(dir, { recursive: true, force: true });
}

const only = process.argv.slice(2);
const { default: puppeteer } = await import("puppeteer-core");
mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });

for (const name of readdirSync(srcDir).filter((f) => f.endsWith(".svg")).sort()) {
	if (only.length && !only.some((o) => name.startsWith(o))) continue;
	const raw = readFileSync(join(srcDir, name), "utf8");
	const { svg, loop } = compile(raw);
	const [, width, height] = raw.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
	const base = name.replace(/\.svg$/, "");
	const svgOut = join(outDir, `${base}.svg`);
	writeFileSync(svgOut, svg);
	const [still] = await render(browser, svgOut, { width, height, loop, still: true });
	writeFileSync(join(outDir, `${base}.png`), still);
	toGif(await render(browser, svgOut, { width, height, loop }), join(outDir, `${base}.gif`));
	console.log(`${base}: ${loop}s, ${width}x${height}`);
}

for (const c of covers) {
	if (only.length && !only.some((o) => `cover-${c.n}`.startsWith(o) || c.n.startsWith(o))) continue;
	const file = join(outDir, `cover-${c.n}.svg`);
	writeFileSync(file, c.svg);
	const [png] = await render(browser, file, { width: 1000, height: 420, loop: 0, scale: 2, still: true });
	writeFileSync(join(outDir, `cover-${c.n}.png`), png);
	rmSync(file);
	console.log(`cover-${c.n}`);
}

await browser.close();
