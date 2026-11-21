import test from "node:test";
import assert from "node:assert/strict";
import { makeClient, initTable } from "../src/db.js";
import { reservar, cancelar, turnosDelDia, turnosDeCliente, libres, TurnoError } from "../src/turnos.js";

const doc = makeClient();
import { TABLE } from "../src/db.js";

test("setup", async () => { await initTable(doc, TABLE); });

test("reservar y listar", async () => {
  await reservar(doc, { fecha: "2030-01-10", hora: "09:00", cliente: "Ana", motivo: "control" });
  const ts = await turnosDelDia(doc, "2030-01-10");
  assert.equal(ts.length, 1);
  assert.equal(ts[0].cliente, "Ana");
});

test("no permite doble reserva", async () => {
  await assert.rejects(
    reservar(doc, { fecha: "2030-01-10", hora: "09:00", cliente: "Beto" }),
    (e) => e instanceof TurnoError && /ocupado/.test(e.message));
});

test("cancelar solo por el dueño", async () => {
  await assert.rejects(cancelar(doc, { fecha: "2030-01-10", hora: "09:00", cliente: "Beto" }), TurnoError);
  await cancelar(doc, { fecha: "2030-01-10", hora: "09:00", cliente: "Ana" });
  assert.equal((await turnosDelDia(doc, "2030-01-10")).length, 0);
});

test("turnos por cliente (GSI) y horarios libres", async () => {
  await reservar(doc, { fecha: "2030-01-11", hora: "10:00", cliente: "Caro" });
  await reservar(doc, { fecha: "2030-01-12", hora: "11:30", cliente: "Caro" });
  const ts = await turnosDeCliente(doc, "Caro", "2030-01-12T00:00");
  assert.deepEqual(ts.map((t) => t.fecha_hora), ["2030-01-12T11:30"]);
  assert.ok(!(await libres(doc, "2030-01-11")).includes("10:00"));
});

test("valida entradas", async () => {
  await assert.rejects(reservar(doc, { fecha: "mañana", hora: "09:00", cliente: "X" }), TurnoError);
  await assert.rejects(reservar(doc, { fecha: "2030-01-10", hora: "09:15", cliente: "X" }), TurnoError);
});
