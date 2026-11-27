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
      "Club Mercedes",
      "12/12/2026",
      "18:30",
      "Visitante",
      "Av. 29 N° 720 (entre 30 y 32), Mercedes",
      "Clásico de la ciudad. Llegar 45 min antes con indumentaria completa.",
    ].join(";"),
    [
      "U17 Masculino",
      "Club Sarmiento",
      "19/12/2026",
      "20:00",
      "Local",
      "Calle 33 N° 334, Mercedes",
      "Partido por la fecha 4 de la liga oficial.",
    ].join(";"),
    [
      "Primera Masculino",
      "Club Náutico El Timón",
      "26/12/2026",
      "21:30",
      "Visitante",
      "Av. Flandes y Río Luján, Jáuregui",
      "Salida en micro desde la sede Calle 33 N° 334.",
    ].join(";"),
  ];

  const csv = `${bom}${headers}\r\n${sampleRows.join("\r\n")}\r\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla_fixture_nuestroclub.csv"',
    },
  });
}
