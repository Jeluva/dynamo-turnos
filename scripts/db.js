// Levanta DynamoDB Local (requiere el comando `dynamodb-local` o DYNAMODB_LOCAL_JAR + java).
import { spawn } from "node:child_process";
const args = ["-sharedDb", "-dbPath", ".dynamodb-data", "-port", process.env.PORT || "8000"];
const jar = process.env.DYNAMODB_LOCAL_JAR;
const [cmd, full] = jar
  ? ["java", [`-Djava.library.path=${jar.replace(/[^/]*$/, "")}DynamoDBLocal_lib`, "-jar", jar, ...args]]
  : ["dynamodb-local", args];
import("node:fs").then((fs) => fs.mkdirSync(".dynamodb-data", { recursive: true }));
spawn(cmd, full, { stdio: "inherit" }).on("exit", (c) => process.exit(c ?? 0));
