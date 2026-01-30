import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "booknotes",
  password: "password",
  port: 5432
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

async function getBooks() {
  try {
    const result = await db.query("SELECT * FROM books;");

    return result.rows.map(book => ({
      ...book,
      coverUrl: book.isbn
        ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`
        : null,
    }));
  } catch (err) {
    console.error(err);
    throw err;
  }
}

app.get("/", async (req, res) => {
  const books = await getBooks();
  res.render("index.ejs", {
    books: books
  });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
