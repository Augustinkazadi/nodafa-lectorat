"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import AdminShell from "@/components/AdminShell";

export default function AdminMembresPage() {
  const { data: session } = useSession();
  const myId = parseInt((session?.user as any)?.id || "0", 10);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        `${u.prenom} ${u.nom}`.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        String(u.role || "").toLowerCase().includes(s)
    );
  }, [users, q]);

  const updateUser = async (userId: number, payload: any, successMsg?: string) => {
    setBusyId(userId);
    setStatus("Mise à jour...");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("❌ " + (data.message || "Erreur"));
        return;
      }
      setStatus(successMsg || "✅ Mis à jour");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (u: any, role: string) => {
    if (role === u.role) return;
    if (u.id === myId && role !== "ADMIN") {
      setStatus("❌ Vous ne pouvez pas retirer votre propre rôle admin");
      return;
    }
    const labels: Record<string, string> = {
      ADMIN: "administrateur",
      LECTEUR: "lecteur",
      VISITEUR: "visiteur",
    };
    if (!confirm(`Changer le rôle de ${u.prenom} ${u.nom} en ${labels[role] || role} ?`)) {
      return;
    }
    await updateUser(u.id, { role }, `✅ ${u.prenom} est maintenant ${labels[role] || role}`);
  };

  return (
    <AdminShell>
      <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 30 }}>Membres</h1>
      <p style={{ margin: "0 0 16px", color: "var(--muted)" }}>
        Gérez les rôles (Admin, Lecteur, Visiteur) et l&apos;accès des membres.
      </p>

      <div className="admin-panel">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un membre (nom, email)..."
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line)", marginBottom: 12 }}
        />
        {status && <p style={{ fontWeight: 700 }}>{status}</p>}

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Contact</th>
                  <th>Rôle</th>
                  <th>Présence</th>
                  <th>Compte</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const busy = busyId === u.id;
                  const role = ["ADMIN", "LECTEUR", "VISITEUR"].includes(u.role) ? u.role : "LECTEUR";
                  return (
                    <tr key={u.id} style={{ background: role === "ADMIN" ? "#f8fbff" : undefined }}>
                      <td>
                        <strong>
                          {u.prenom} {u.nom}
                        </strong>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>
                          {u.dateNaissance ? `Né(e) le ${new Date(u.dateNaissance).toLocaleDateString("fr-FR")}` : "—"}
                        </div>
                      </td>
                      <td>
                        <div>{u.email}</div>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>{u.telephone || "Pas de téléphone"}</div>
                      </td>
                      <td>
                        <select
                          value={role}
                          disabled={busy || (u.id === myId && role === "ADMIN")}
                          onChange={(e) => changeRole(u, e.target.value)}
                          title={u.id === myId ? "Vous ne pouvez pas retirer votre propre rôle admin" : "Changer le rôle"}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid var(--line)",
                            background: "var(--bg-elevated)",
                            minWidth: 120,
                          }}
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="LECTEUR">Lecteur</option>
                          <option value="VISITEUR">Visiteur</option>
                        </select>
                      </td>
                      <td>
                        <span className={`admin-chip ${u.online ? "admin-chip--ok" : "admin-chip--off"}`}>
                          {u.online ? "En ligne" : "Hors ligne"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <span className={`admin-chip ${u.isActive ? "admin-chip--ok" : "admin-chip--off"}`}>
                            {u.isActive ? "Actif" : "Désactivé"}
                          </span>
                          <button
                            type="button"
                            className="nodafa-btn nodafa-btn-ghost"
                            style={{ padding: "8px 12px" }}
                            disabled={busy || u.id === myId}
                            onClick={() =>
                              updateUser(
                                u.id,
                                { isActive: !u.isActive },
                                u.isActive ? "✅ Compte désactivé" : "✅ Compte réactivé"
                              )
                            }
                          >
                            {u.isActive ? "Désactiver" : "Réactiver"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && <p>Aucun membre trouvé.</p>}
      </div>
    </AdminShell>
  );
}
