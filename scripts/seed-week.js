const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ZONE = process.env.AELF_ZONE || "afrique";

const SEASON = {
  ordinaire: "Temps Ordinaire",
  avent: "Temps de l'Avent",
  careme: "Temps du Carême",
  paques: "Temps pascal",
  noel: "Temps de Noël",
};

function seasonLabel(t) {
  if (!t) return null;
  const k = String(t).toLowerCase();
  return SEASON[k] || (/temps/i.test(t) ? t : t[0].toUpperCase() + t.slice(1));
}

function clean(raw) {
  return String(raw || "")
    .replace(/\s*\(semaine\s+[IVXLC0-9]+[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFrom(info, iso) {
  const year = String(info.annee || "").toUpperCase();
  let title = clean(info.ligne1 || info.jour_liturgique_nom || info.fete || "");
  if (/Christ\s*Roi|Roi de l['']?Univers/i.test(title)) title = "Dimanche du Christ Roi de l'univers";
  if (!title) title = "Lectures du " + iso;
  const sunday =
    String(info.jour || "").toLowerCase() === "dimanche" ||
    /dimanche|Christ\s*Roi/i.test(title) ||
    new Date(iso + "T12:00:00Z").getUTCDay() === 0;
  if (["A", "B", "C"].includes(year) && !/année\s+liturgique/i.test(title)) {
    return title + " — année liturgique " + year;
  }
  if (sunday) return title;
  const season = seasonLabel(info.temps_liturgique);
  if (season && title.toLowerCase().indexOf("temps") === -1) {
    return year ? title + " — " + season + ", année liturgique " + year : title + " — " + season;
  }
  return title;
}

function strip(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&#8217;/g, "'")
    .trim();
}

function block(l) {
  if (!l) return null;
  return (
    [l.intro_lue && strip(l.intro_lue), l.ref && "(" + l.ref + ")", l.titre && strip(l.titre), strip(l.contenu || "")]
      .filter(Boolean)
      .join("\n\n") || null
  );
}

function currentWeekDates() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12));
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  const out = [];
  for (let i = 0; i < 7; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function sync(iso) {
  const res = await fetch("https://api.aelf.org/v1/messes/" + iso + "/" + ZONE, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("AELF " + res.status + " " + iso);
  const data = await res.json();
  const info = data.informations || {};
  const lectures = (data.messes || [])[0]?.lectures || [];
  const by = (t) => lectures.find((l) => l.type === t);
  const year = String(info.annee || "").toUpperCase();
  const payload = {
    title: titleFrom(info, iso),
    firstReading: block(by("lecture_1")),
    psalm: block(by("psaume")),
    secondReading: block(by("lecture_2")),
    gospel: block(by("evangile")) || "Évangile non disponible",
    liturgicalColor: info.couleur || null,
    commentary: [info.ligne2, info.ligne3, info.semaine].filter(Boolean).join(" · ") || null,
    source: "aelf",
    liturgicalYear: ["A", "B", "C"].includes(year) ? year : null,
    liturgicalSeason: seasonLabel(info.temps_liturgique),
    isSunday:
      String(info.jour || "").toLowerCase() === "dimanche" ||
      /dimanche|Christ\s*Roi/i.test(info.ligne1 || "") ||
      new Date(iso + "T12:00:00Z").getUTCDay() === 0,
  };
  const date = new Date(iso + "T12:00:00.000Z");
  const r = await prisma.dailyReading.upsert({
    where: { date },
    create: { date, ...payload },
    update: payload,
  });
  console.log(iso, "|", r.isSunday ? "DIM" : "jour", "|", r.title);
}

(async () => {
  for (const iso of currentWeekDates()) await sync(iso);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
