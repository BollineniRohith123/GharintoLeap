import { SQLDatabase } from "encore.dev/storage/sqldb";

export default new SQLDatabase("marketplace_db", {
  migrations: "./migrations",
});
