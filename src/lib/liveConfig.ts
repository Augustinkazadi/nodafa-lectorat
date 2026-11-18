/** Domaine Jitsi (public ou auto-hébergé). Le live reste affiché dans Lectorat. */
export function getJitsiDomain() {
  return (process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function buildLiveRoomName(title: string, idHint?: number | string) {
  const slug = String(title || "live")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 24) || "Live";
  const stamp = idHint || Date.now().toString(36);
  return `NODAFALectorat${slug}${stamp}`;
}
