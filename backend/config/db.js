import "../lib/load-env.js";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool
  .connect()
  .then((client) => {
    client.release();
    console.log("Talme HRMS Database Connected");
  })
  .catch((error) => {
    console.log("Database Error", error.message);
  });

export default pool;
