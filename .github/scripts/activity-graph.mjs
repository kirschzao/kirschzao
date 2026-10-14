// Gera assets/activity-graph.svg com as contribuições dos últimos 31 dias (tema "react").
import { writeFileSync, mkdirSync } from "node:fs";

const USER = process.env.GH_USER || "kirschzao";
const TOKEN = process.env.GITHUB_TOKEN;
const DAYS = 31;

const to = new Date();
const from = new Date(to.getTime() - DAYS * 864e5);
const query = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login: USER, from: from.toISOString(), to: to.toISOString() } }),
});
const json = await res.json();
if (json.errors) throw new Error(JSON.stringify(json.errors));
const days = json.data.user.contributionsCollection.contributionCalendar.weeks
  .flatMap((w) => w.contributionDays)
  .slice(-DAYS);

const W = 1200, H = 420, L = 80, R = 40, T = 80, B = 70;
const pw = W - L - R, ph = H - T - B;
const rawMax = Math.max(...days.map((d) => d.contributionCount), 1);
const step = Math.max(1, Math.ceil(rawMax / 5));
const max = step * Math.ceil(rawMax / step);
const x = (i) => L + (i * pw) / (days.length - 1);
const y = (v) => T + ph - (v / max) * ph;

const c = { bg: "#20232a", line: "#5bcdec", point: "#ffffff", text: "#5bcdec", grid: "#3a3f4b", axis: "#9ba3b4" };
const pts = days.map((d, i) => [x(i), y(d.contributionCount)]);
const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
const area = `${path} L${x(days.length - 1)},${T + ph} L${L},${T + ph} Z`;

let grid = "";
for (let v = 0; v <= max; v += step) {
  grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${c.grid}" stroke-dasharray="4 4"/>`;
  grid += `<text x="${L - 14}" y="${y(v) + 5}" text-anchor="end" fill="${c.axis}" font-size="14">${v}</text>`;
}
const labels = days
  .map((d, i) => `<text x="${x(i)}" y="${T + ph + 28}" text-anchor="middle" fill="${c.axis}" font-size="13">${+d.date.slice(8)}</text>`)
  .join("");
const dots = pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${c.point}" stroke="${c.line}" stroke-width="2"/>`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI, Ubuntu, Helvetica, Arial, sans-serif">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.line}" stop-opacity="0.45"/><stop offset="1" stop-color="${c.line}" stop-opacity="0.02"/></linearGradient></defs>
<rect width="${W}" height="${H}" rx="16" fill="${c.bg}"/>
<text x="${W / 2}" y="46" text-anchor="middle" fill="${c.text}" font-size="24" font-weight="600">My Latest Contributions</text>
${grid}${labels}
<text x="${L + pw / 2}" y="${H - 12}" text-anchor="middle" fill="${c.axis}" font-size="14">Days</text>
<text transform="translate(24 ${T + ph / 2}) rotate(-90)" text-anchor="middle" fill="${c.axis}" font-size="14">Contributions</text>
<path d="${area}" fill="url(#g)"/>
<path d="${path}" fill="none" stroke="${c.line}" stroke-width="3" stroke-linejoin="round"/>
${dots}
</svg>`;

mkdirSync("assets", { recursive: true });
writeFileSync("assets/activity-graph.svg", svg);
console.log(`ok: ${days.length} dias, max ${rawMax}`);
