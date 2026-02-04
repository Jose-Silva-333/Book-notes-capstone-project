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

async function getBooks(order) {
  try {

    let query = "SELECT * FROM books";

    if (order) {
      query += ` ORDER BY ${order} DESC`;
    }
    else {
      query += ";";
    }

    const result = await db.query(query);

    return result.rows.map(book => ({
      ...book,
      coverUrl: book.isbn
        ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`
        : null,
    }));
  } catch (err) {
    console.error(err);
  }
}

app.get("/", async (req, res) => {
  const order = req.query.orderBy;
  const edit = req.query.edit;
  let editing = false;

  if(edit) {
    editing = true;
  }

  const books = await getBooks(order);
  res.render("index.ejs", {
    books: books,
    editing: editing
  });
});

app.get("/notes/:bookId", async (req, res) => {
  const bookId = req.params.bookId;

  try {
    const bookResult = await db.query("SELECT * FROM books WHERE id = $1", [bookId]);

    if (bookResult.rows.length === 0) {
      return res.status(404).send("Book not found");
    }

    const book = bookResult.rows[0];

    book.coverUrl = book.isbn 
      ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`
      : null;

    const notesResult = await db.query("SELECT * FROM notes WHERE book_id = $1", [bookId]);

    res.render("book-notes.ejs", {
      book: book,
      notes: notesResult.rows
    })
  } catch (err) {
    console.error(err);
  }
});

app.get("/add", (req, res) => {
  res.render("book-form.ejs");
});

app.get("/edit/:bookId", async (req, res) => {
  const bookId = req.params.bookId;

  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [bookId]);

    let book = result.rows[0];
    book.finished_reading = book.finished_reading.toISOString().split("T")[0];

    res.render("book-form.ejs", {
      book: book
    });
  }
  catch (err) {
    console.error(err);
  }
});

app.post("/add", async (req, res) => {
  const title = req.body.title;
  const description = req.body.description;
  const rating = req.body.rating;
  const finished_reading = req.body.finished_reading;
  const isbn = req.body.isbn;

  try {
    await db.query("INSERT INTO books (title, description, rating, finished_reading, isbn) " +
                    "VALUES ($1, $2, $3, $4, $5);", [title, description, rating, finished_reading, isbn]);

    res.redirect("/?edit=true");
  }
  catch (err) {
    console.error(err);
  }
});

app.delete("/:bookId", async (req, res) => {
  const bookId = req.params.bookId;

  try {
    await db.query("DELETE FROM books WHERE id = $1", [bookId]);

    res.status(200).json({message: "Book deleted successfully"});

  } catch (err) {
    console.error(err);
    res.status(500).json({error: "Server error"});
  }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
