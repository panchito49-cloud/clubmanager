import { NextResponse } from "next/server";
import { getTenant } from "@/server/tenant";

export async function GET() {
  try {
    await getTenant(); // Verifica sesión
  } catch {
    return new NextResponse("No autorizado", { status: 401 });
  }

  // BOM UTF-8 para que Excel en Windows reconozca tildes y caracteres especiales
  const bom = "\uFEFF";
  const headers = [
    "Nombre",
    "Apellido",
    "DNI",
    "FechaNacimiento (AAAA-MM-DD)",
    "Genero (M/F)",
    "Categoria",
    "Rama (Masculino/Femenino)",
    "Familia",
    "TelefonoContacto",
    "EmailContacto",
    "Posicion",
    "Camiseta",
    "ObraSocial",
  ].join(";");

  const example1 = [
    "Mateo",
    "González",
    "50111222",
    "2012-05-14",
    "M",
    "U15",
    "Masculino",
    "Familia González",
    "1140001111",
    "gonzalez@ejemplo.com",
    "Base",
    "7",
    "OSDE",
  ].join(";");

  const example2 = [
    "Sofía",
    "Martínez",
    "51222333",
    "2014-08-20",
    "F",
    "U13",
    "Femenino",
    "Familia Martínez",
    "1140002222",
    "martinez@ejemplo.com",
    "Alero",
    "10",
    "Swiss Medical",
  ].join(";");

  const csvContent = `${bom}${headers}\r\n${example1}\r\n${example2}\r\n`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla_jugadores_clubmanager.csv"',
    },
  });
}
