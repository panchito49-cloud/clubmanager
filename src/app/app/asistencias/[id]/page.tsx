import { notFound } from "next/navigation";
import { NoAccess } from "@/components/ui/page";
import { can, getTenant } from "@/server/tenant";
import { getTraining } from "@/server/data/sports";
import { AttendanceSheet } from "@/components/attendance/attendance-sheet";

export const metadata = { title: "Planilla de Asistencia en Cancha" };

export default async function TrainingAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "trainings.view")) return <NoAccess />;

  const { id } = await params;
  const data = await getTraining(ctx, id);

  if (!data) {
    notFound();
  }

  const { training, roster } = data;
  const canRecord = can(ctx, "attendance.record");

  return (
    <AttendanceSheet
      training={training}
      initialRoster={roster}
      canRecord={canRecord}
    />
  );
}
