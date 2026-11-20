// dev.to cover images (1000x420): one card per post, same layout across the series.
// Titles are broken into lines by hand so nothing wraps unpredictably.

const posts = [
	["01", ["Your website has two", "kinds of readers now"]],
	["02", ["Your site search should", "understand a question,", "not just keywords"]],
	["03", ["“No results” is feedback,", "so collect it"]],
	["04", ["Measure your search", "before you change it"]],
	["05", ["Your build should not", "be able to quietly", "delete content"]],
	["06", ["Every page should be", "readable by a machine,", "without a second site"]],
	["07", ["An assistant on your site", "should know when to say", "“I don’t know”"]],
	["08", ["Fast, accessible and", "working everywhere:", "measured, not assumed"]],
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function cover(n, lines) {
	const part = Number(n);
	const size = lines.length > 2 ? 46 : 54;
	const lead = size * 1.18;
	const top = 210 - ((lines.length - 1) * lead) / 2;
	const title = lines
		.map((l, i) => `<text x="64" y="${(top + i * lead).toFixed(0)}" class="title" font-size="${size}">${esc(l)}</text>`)
		.join("");
	const steps = Array.from({ length: 8 }, (_, i) => {
		const fill = i + 1 === part ? "#02A196" : i + 1 < part ? "#45423E" : "#302E2B";
		return `<rect x="${64 + i * 42}" y="360" width="34" height="6" rx="3" fill="${fill}"/>`;
	}).join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 420" width="1000" height="420">
<style>
text{font-family:-apple-system,"SF Pro Display","Inter","Segoe UI",Helvetica,Arial,sans-serif}
.title{fill:#F1EFE9;font-weight:700;letter-spacing:-.01em}
.eyebrow{fill:#02A196;font-size:15px;font-weight:700;letter-spacing:.14em}
.part{fill:#AAA49B;font-size:15px;font-weight:500}
.num{fill:none;stroke:#02A196;stroke-width:2;font-size:300px;font-weight:800;opacity:.35}
</style>
<rect width="1000" height="420" fill="#0E0D0C"/>
<rect x="0" y="0" width="1000" height="420" fill="none" stroke="#302E2B" stroke-width="2"/>
<text x="972" y="372" text-anchor="end" class="num">${n}</text>
<text x="64" y="72" class="eyebrow">EXPECT MORE FROM YOUR WEBSITE</text>
${title}
${steps}
<text x="408" y="367" class="part">Part ${part} of 8</text>
</svg>`;
}

export const covers = posts.map(([n, lines]) => ({ n, svg: cover(n, lines) }));
