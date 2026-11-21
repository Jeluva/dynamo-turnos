# dynamo-turnos

CLI en Node.js para reservar turnos (de 30 minutos) sobre **DynamoDB**. Es un **proyecto de práctica** para
aprender modelado single-table, índices secundarios globales (GSI) y escrituras condicionales. No es un sistema de producción.

## Qué hace

- `init`: crea la tabla `Turnos` (on-demand) con un GSI `por-cliente`.
- `reservar`: guarda un turno con `ConditionExpression: attribute_not_exists(pk)`, así dos reservas del mismo horario no se pisan.
- `cancelar`: borra el turno solo si pertenece al cliente indicado (condición `cliente = :c`).
- `dia`: lista los turnos de una fecha (Query por partition key) y los horarios libres entre 09:00 y 13:00.
- `cliente`: lista los turnos de una persona, opcionalmente desde una fecha (Query sobre el GSI).

Modelo: `pk = DIA#AAAA-MM-DD`, `sk = HORA#HH:MM`; GSI con `cliente` + `fecha_hora`.

## Cómo correrlo

Requiere Node 20+ y Java 17+ (para DynamoDB Local).

```bash
npm install
# Terminal 1: DynamoDB Local en http://localhost:8000 (datos en .dynamodb-data)
#   Opción A: comando `dynamodb-local` en el PATH
#   Opción B: DYNAMODB_LOCAL_JAR=/ruta/DynamoDBLocal.jar npm run db   (descarga oficial de AWS)
npm run db

# Terminal 2
node src/cli.js init
node src/cli.js reservar 2026-12-01 09:00 Ana "control"
node src/cli.js reservar 2026-12-01 09:00 Beto      # Error: el horario ya esta ocupado
node src/cli.js dia 2026-12-01
node src/cli.js cliente Ana
node src/cli.js cancelar 2026-12-01 09:00 Ana
```

Variables: `DYNAMODB_ENDPOINT` (default `http://localhost:8000`), `TURNOS_TABLE` (default `Turnos`), `AWS_REGION`.
Las credenciales están fijas en `local` para DynamoDB Local; para apuntar a AWS real habría que cambiar `src/db.js`.

## Tests

Con DynamoDB Local corriendo: `npm test` (6 tests con `node:test`, usan una tabla temporal).

## Limitaciones

Horario fijo 09:00–13:00 para "libres", sin zonas horarias, sin autenticación (el "cliente" es solo un nombre) y sin paginación en las consultas.
