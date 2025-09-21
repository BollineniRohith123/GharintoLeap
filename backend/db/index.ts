import { SQLDatabase } from "encore.dev/storage/sqldb";

export default new SQLDatabase("gharinto_db", {
  migrations: "./migrations",
});
