#!/usr/bin/env node
import { makeClient, initTable } from "./db.js";
import { reservar, cancelar, turnosDelDia, turnosDeCliente, libres, TurnoError } from "./turnos.js";

const AYUDA = `turnos - reserva de turnos sobre DynamoDB

  turnos init                                   crea la tabla si no existe
  turnos reservar <fecha> <hora> <cliente> [motivo]
  turnos cancelar <fecha> <hora> <cliente>
  turnos dia <fecha>                            turnos y horarios libres del dia
  turnos cliente <nombre> [desde AAAA-MM-DD]    turnos de un cliente (via GSI)

Fecha AAAA-MM-DD, hora HH:00 o HH:30. Endpoint: DYNAMODB_ENDPOINT (default http://localhost:8000)`;

const [cmd, ...a] = process.argv.slice(2);
const doc = makeClient();
const fila = (t) => `${t.fecha_hora.replace("T", " ")}  ${t.cliente}${t.motivo ? "  (" + t.motivo + ")" : ""}`;

try {
  switch (cmd) {
    case "init":
      console.log((await initTable(doc)) ? "Tabla creada." : "La tabla ya existia.");
      break;
    case "reservar":
      await reservar(doc, { fecha: a[0], hora: a[1], cliente: a[2], motivo: a.slice(3).join(" ") });
      console.log(`Reservado: ${a[0]} ${a[1]} para ${a[2]}`);
      break;
    case "cancelar":
      await cancelar(doc, { fecha: a[0], hora: a[1], cliente: a[2] });
      console.log("Turno cancelado.");
      break;
    case "dia": {
      const ts = await turnosDelDia(doc, a[0]);
      console.log(ts.length ? ts.map(fila).join("\n") : "Sin turnos.");
      console.log("Libres: " + ((await libres(doc, a[0])).join(", ") || "ninguno"));
      break;
    }
    case "cliente": {
      const ts = await turnosDeCliente(doc, a[0], a[1] ? `${a[1]}T00:00` : "");
      console.log(ts.length ? ts.map(fila).join("\n") : "Sin turnos.");
      break;
    }
    default:
      console.log(AYUDA);
      process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  if (e instanceof TurnoError) { console.error("Error: " + e.message); process.exit(2); }
  console.error(e.name === "TimeoutError" || e.code === "ECONNREFUSED"
    ? "No se pudo conectar a DynamoDB. ¿Esta corriendo `npm run db`?" : e);
  process.exit(1);
}
