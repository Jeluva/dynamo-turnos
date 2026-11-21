import { PutCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { TABLE } from "./db.js";

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):(00|30)$/;

export class TurnoError extends Error {}

function validar(fecha, hora) {
  if (!RE_FECHA.test(fecha) || Number.isNaN(Date.parse(fecha)))
    throw new TurnoError(`Fecha invalida: "${fecha}" (usar AAAA-MM-DD)`);
  if (!RE_HORA.test(hora))
    throw new TurnoError(`Hora invalida: "${hora}" (turnos de 30 min: HH:00 o HH:30)`);
}

const key = (fecha, hora) => ({ pk: `DIA#${fecha}`, sk: `HORA#${hora}` });

// Reserva con escritura condicional: si el horario ya esta tomado, DynamoDB
// rechaza el put de forma atomica (no hay carrera entre dos clientes).
export async function reservar(doc, { fecha, hora, cliente, motivo = "" }) {
  validar(fecha, hora);
  if (!cliente) throw new TurnoError("Falta el nombre del cliente");
  try {
    await doc.send(new PutCommand({
      TableName: TABLE,
      Item: { ...key(fecha, hora), cliente, motivo, fecha_hora: `${fecha}T${hora}`, creado: new Date().toISOString() },
      ConditionExpression: "attribute_not_exists(pk)",
    }));
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException")
      throw new TurnoError(`El horario ${fecha} ${hora} ya esta ocupado`);
    throw e;
  }
}

// Solo el dueño del turno puede cancelarlo.
export async function cancelar(doc, { fecha, hora, cliente }) {
  validar(fecha, hora);
  try {
    await doc.send(new DeleteCommand({
      TableName: TABLE,
      Key: key(fecha, hora),
      ConditionExpression: "cliente = :c",
      ExpressionAttributeValues: { ":c": cliente },
    }));
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException")
      throw new TurnoError(`No hay un turno de "${cliente}" el ${fecha} a las ${hora}`);
    throw e;
  }
}

export async function turnosDelDia(doc, fecha) {
  validar(fecha, "00:00");
  const r = await doc.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "pk = :p",
    ExpressionAttributeValues: { ":p": `DIA#${fecha}` },
  }));
  return r.Items;
}

export async function turnosDeCliente(doc, cliente, desde = "") {
  const r = await doc.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "por-cliente",
    KeyConditionExpression: desde ? "cliente = :c AND fecha_hora >= :d" : "cliente = :c",
    ExpressionAttributeValues: desde ? { ":c": cliente, ":d": desde } : { ":c": cliente },
  }));
  return r.Items;
}

// Horarios libres del dia entre apertura y cierre (30 min cada uno).
export async function libres(doc, fecha, apertura = "09:00", cierre = "13:00") {
  const ocupados = new Set((await turnosDelDia(doc, fecha)).map((t) => t.sk.slice(5)));
  const out = [];
  for (let m = toMin(apertura); m < toMin(cierre); m += 30) {
    const h = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    if (!ocupados.has(h)) out.push(h);
  }
  return out;
}
const toMin = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
