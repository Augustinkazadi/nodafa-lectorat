"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
      router.push("/journal");
    }
    if (status === "authenticated") fetchUsers();
  }, [status, router, session]);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newRole }),
    });
    if (res.ok) fetchUsers();
  };

  if (loading) return <div style={{ padding: "50px", textAlign: "center" }}>Chargement...</div>;

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto", fontFamily: "Segoe UI" }}>
      <h1>👥 Gestion des rôles</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={thStyle}>Prénom</th>
            <th style={thStyle}>Nom</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Rôle actuel</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={tdStyle}>{user.prenom}</td>
              <td style={tdStyle}>{user.nom}</td>
              <td style={tdStyle}>{user.email}</td>
              <td style={tdStyle}>{user.role}</td>
              <td style={tdStyle}>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  style={{ padding: "5px", borderRadius: "6px", border: "1px solid #ccc" }}
                >
                  <option value="LECTEUR">Lecteur</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VISITEUR">Visiteur</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <p>Aucun utilisateur trouvé.</p>}
    </div>
  );
}

const thStyle = { padding: "12px", textAlign: "left" as const, fontWeight: "bold" };
const tdStyle = { padding: "12px" };