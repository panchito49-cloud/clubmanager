import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/form";
import { formatDateTime } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { listClubUsers } from "@/server/data/users";
import { toggleMembershipStatusAction } from "@/app/actions/users";

export const metadata = { title: "Usuarios y Staff" };

function roleBadge(role: string) {
  switch (role) {
    case "club_admin":
      return <Badge tone="info">Administrador</Badge>;
    case "coach":
      return <Badge tone="success">Entrenador</Badge>;
    case "guardian":
      return <Badge tone="neutral">Padre / Tutor</Badge>;
    case "player":
      return <Badge tone="warning">Jugador</Badge>;
    default:
      return <Badge tone="neutral">{role}</Badge>;
  }
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ rol?: string; estado?: string; ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "users.view")) return <NoAccess />;

  const params = await searchParams;
  const usersList = await listClubUsers(ctx, {
    role: params.rol,
    status: params.estado,
  });

  const canManage = can(ctx, "users.manage");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios y Staff"
        description="Gestión de accesos, roles institucionales y asignación de categorías para entrenadores."
        actions={
          canManage ? (
            <ButtonLink href="/app/usuarios/nuevo" size="sm">
              <Icon name="user-plus" size={15} /> Nuevo usuario staff
            </ButtonLink>
          ) : null
        }
      />

      <Flash ok={params.ok} error={params.error} />

      <Card className="overflow-hidden">
        <form
          method="get"
          className="flex flex-col gap-2 border-b border-ink-100 p-3 sm:flex-row sm:items-center sm:p-4"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select
              name="rol"
              defaultValue={params.rol ?? ""}
              aria-label="Filtrar por rol"
              className="w-full sm:w-48"
            >
              <option value="">Todos los roles</option>
              <option value="club_admin">Administradores</option>
              <option value="coach">Entrenadores</option>
              <option value="guardian">Padres / Tutores</option>
              <option value="player">Jugadores</option>
            </Select>

            <Select
              name="estado"
              defaultValue={params.estado ?? ""}
              aria-label="Filtrar por estado"
              className="w-full sm:w-40"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="disabled">Deshabilitados</option>
            </Select>

            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg bg-ink-100 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-200"
            >
              Filtrar
            </button>
          </div>
        </form>

        {usersList.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-400">
            No se encontraron usuarios registrados con los filtros aplicados.
          </p>
        ) : (
          <Table minWidth="min-w-[700px]">
            <THead>
              <TR>
                <TH>Usuario</TH>
                <TH>Rol</TH>
                <TH>Categorías asignadas</TH>
                <TH>Estado</TH>
                <TH>Último acceso</TH>
                <TH align="right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {usersList.map((u) => (
                <TR key={u.membershipId}>
                  <TD>
                    <div className="font-semibold text-ink-900">{u.fullName}</div>
                    <div className="text-xs text-ink-500">{u.email}</div>
                    {u.phone ? <div className="text-xs text-ink-400">{u.phone}</div> : null}
                  </TD>
                  <TD>{roleBadge(u.role)}</TD>
                  <TD>
                    {u.role === "coach" ? (
                      u.assignedCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {u.assignedCategories.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex rounded-md bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700"
                            >
                              {c.name} ({c.gender === "male" ? "M" : "F"})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400 italic">Sin categorías asignadas</span>
                      )
                    ) : (
                      <span className="text-xs text-ink-400">—</span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={u.status === "active" ? "success" : "danger"}>
                      {u.status === "active" ? "Activo" : "Deshabilitado"}
                    </Badge>
                  </TD>
                  <TD className="text-xs text-ink-500">
                    {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Nunca"}
                  </TD>
                  <TD align="right">
                    {canManage && u.membershipId !== ctx.membership.id ? (
                      <form action={toggleMembershipStatusAction}>
                        <input type="hidden" name="membershipId" value={u.membershipId} />
                        <input
                          type="hidden"
                          name="targetStatus"
                          value={u.status === "active" ? "disabled" : "active"}
                        />
                        <button
                          type="submit"
                          className={`text-xs font-semibold ${
                            u.status === "active"
                              ? "text-red-600 hover:text-red-800"
                              : "text-emerald-600 hover:text-emerald-800"
                          } hover:underline`}
                        >
                          {u.status === "active" ? "Desactivar" : "Reactivar"}
                        </button>
                      </form>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
