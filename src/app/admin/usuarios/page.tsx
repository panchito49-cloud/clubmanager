import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { listAllPlatformUsers } from "@/server/data/admin";

export const metadata = { title: "Superadmin - Directorio Global de Usuarios" };

export default async function AdminUsersPage() {
  const users = await listAllPlatformUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directorio Global de Usuarios"
        description="Usuarios registrados en la plataforma en todos los clubes (administradores, entrenadores, familias y deportistas)."
      />

      <Card className="overflow-hidden">
        <Table minWidth="min-w-[700px]">
          <THead>
            <TR>
              <TH>Usuario</TH>
              <TH>Tipo de cuenta</TH>
              <TH align="center">Clubes asociados</TH>
              <TH>Estado</TH>
              <TH>Último acceso</TH>
              <TH>Fecha de registro</TH>
            </TR>
          </THead>
          <TBody>
            {users.map((u) => (
              <TR key={u.id}>
                <TD>
                  <div className="font-semibold text-ink-900">{u.fullName}</div>
                  <div className="text-xs text-ink-500">{u.email}</div>
                  {u.phone ? <div className="text-xs text-ink-400">{u.phone}</div> : null}
                </TD>
                <TD>
                  {u.isPlatformAdmin ? (
                    <Badge tone="info">Superadministrador</Badge>
                  ) : (
                    <Badge tone="neutral">Usuario de Club</Badge>
                  )}
                </TD>
                <TD align="center" className="font-semibold text-ink-800">
                  {u.clubsCount}
                </TD>
                <TD>
                  <Badge tone={u.status === "active" ? "success" : "danger"}>
                    {u.status === "active" ? "Activo" : "Bloqueado"}
                  </Badge>
                </TD>
                <TD className="text-xs text-ink-500">
                  {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Nunca"}
                </TD>
                <TD className="text-xs text-ink-500">
                  {formatDateTime(u.createdAt, { withTime: false })}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
