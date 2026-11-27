import { NextResponse } from "next/server";

export async function GET() {
  const bom = "\uFEFF";
  const headers = [
    "Categoria",
    "Rival",
    "Fecha (DD/MM/AAAA)",
    "Hora (HH:MM)",
    "Condicion (Local o Visitante)",
    "Direccion o Cancha",
    "Observaciones",
  ].join(";");

  const sampleRows = [
    [
      "U15 Masculino",
      "Club Quilmes de Mercedes",
      "12/12/2026",
      "18:30",
      "Visitante",
      "Calle 12 N° 640 (entre 27 y 29), Mercedes",
      "Llegar 45 min antes con indumentaria suplente",
    ].join(";"),
    [
      "U17 Masculino",
      "San Martín de Junín",
      "19/12/2026",
      "20:00",
      "Local",
      "Calle 33 N° 334, Mercedes",
      "Partido por la Copa Centenario",
    ].join(";"),
    [
      "Primera Masculino",
      "Colón de Chivilcoy",
      "26/12/2026",
      "21:30",
      "Visitante",
      "Av. Bernardo de Irigoyen 150, Chivilcoy",
      "Salida en micro desde la sede Calle 33 N° 334",
    ].join(";"),
  ];

  const csv = `${bom}${headers}\r\n${sampleRows.join("\r\n")}\r\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla_fixture_clubmanager.csv"',
    },
  });
}
