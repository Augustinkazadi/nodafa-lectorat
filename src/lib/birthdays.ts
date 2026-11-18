import { prisma } from "@/lib/prisma";

export type BirthdayPerson = {
  id: number;
  prenom: string;
  nom: string;
  dateNaissance: Date;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Semaine calendaire lundi → dimanche */
export function getCurrentWeekRange(now = new Date()) {
  const day = now.getDay(); // 0 dimanche
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = startOfDay(now);
  monday.setDate(monday.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

export function anniversaryOnYear(birth: Date, year: number) {
  return new Date(year, birth.getMonth(), birth.getDate());
}

export function formatNames(people: BirthdayPerson[]) {
  return people.map((p) => `${p.prenom} ${p.nom}`).join(", ");
}

export function weekDedupeKey(now = new Date()) {
  const { monday } = getCurrentWeekRange(now);
  const y = monday.getFullYear();
  const oneJan = new Date(y, 0, 1);
  const week = Math.ceil((((monday.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
  return `birthday-week-${y}-W${week}`;
}

export function dayDedupeKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `birthday-day-${y}-${m}-${d}`;
}

export async function loadBirthdayPeople(): Promise<BirthdayPerson[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true, dateNaissance: { not: null } },
    select: { id: true, prenom: true, nom: true, dateNaissance: true },
  });
  return users.filter((u): u is BirthdayPerson => Boolean(u.dateNaissance));
}

export function peopleWithBirthdayThisWeek(people: BirthdayPerson[], now = new Date()) {
  const { monday, sunday } = getCurrentWeekRange(now);
  const year = now.getFullYear();
  return people.filter((p) => {
    const anni = anniversaryOnYear(p.dateNaissance, year);
    // Gère le cas année suivante si on est fin décembre
    const anniNext = anniversaryOnYear(p.dateNaissance, year + 1);
    return (anni >= monday && anni <= sunday) || (anniNext >= monday && anniNext <= sunday);
  });
}

export function peopleWithBirthdayToday(people: BirthdayPerson[], now = new Date()) {
  const m = now.getMonth();
  const d = now.getDate();
  return people.filter((p) => p.dateNaissance.getMonth() === m && p.dateNaissance.getDate() === d);
}

async function notifyAllUsers(payload: {
  title: string;
  message: string;
  kind: string;
  dedupeKey: string;
  url?: string;
}) {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let created = 0;
  for (const user of users) {
    try {
      await prisma.notification.create({
        data: {
          title: payload.title,
          message: payload.message,
          kind: payload.kind,
          dedupeKey: payload.dedupeKey,
          url: payload.url || "/notifications",
          userId: user.id,
        },
      });
      created += 1;
    } catch {
      // dedupe unique : déjà notifié
    }
  }
  return created;
}

export async function syncBirthdayNotifications(now = new Date()) {
  const people = await loadBirthdayPeople();
  const weekPeople = peopleWithBirthdayThisWeek(people, now);
  const todayPeople = peopleWithBirthdayToday(people, now);

  const result = {
    weekCount: weekPeople.length,
    todayCount: todayPeople.length,
    weekNames: formatNames(weekPeople),
    todayNames: formatNames(todayPeople),
    notificationsCreated: 0,
  };

  if (weekPeople.length > 0) {
    const countLabel =
      weekPeople.length === 1
        ? "1 personne"
        : `${weekPeople.length} personnes`;
    const weekIds = weekPeople.map((p) => p.id).join(",");
    result.notificationsCreated += await notifyAllUsers({
      title: "Anniversaires de la semaine",
      message: `Cette semaine, nous allons fêter l'anniversaire de ${countLabel} : ${result.weekNames}.`,
      kind: "BIRTHDAY_WEEK",
      dedupeKey: weekDedupeKey(now),
      url: `/notifications?wish=week&ids=${weekIds}`,
    });
  }

  if (todayPeople.length > 0) {
    const countLabel =
      todayPeople.length === 1
        ? "1 personne"
        : `${todayPeople.length} personnes`;
    const dayIds = todayPeople.map((p) => p.id).join(",");
    result.notificationsCreated += await notifyAllUsers({
      title: "Anniversaire(s) aujourd'hui 🎂",
      message: `Aujourd'hui, jour J : nous fêtons l'anniversaire de ${countLabel} : ${result.todayNames}. Joyeux anniversaire !`,
      kind: "BIRTHDAY_DAY",
      dedupeKey: dayDedupeKey(now),
      url: `/notifications?wish=day&ids=${dayIds}`,
    });
  }

  return result;
}
