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
  const edit = req.query.edit;

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

    let editing = false;

    if(edit) {
      editing = true;
    }

    res.render("book-notes.ejs", {
      book: book,
      notes: notesResult.rows,
      editing: editing
    })
  } catch (err) {
    console.error(err);
  }
});

app.get("/add", (req, res) => {
  res.render("book-form.ejs", {
    book: null
  });
});

app.get("/notes/add/:bookId", async (req, res) => {
  const bookId = req.params.bookId;

  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [bookId]);

    let book = result.rows[0];

    res.render("note-form.ejs", {
      book: book,
      note: null
    });
  }
  catch (err) {
    console.error(err);
  }
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

app.get("/notes/edit/:noteId", async (req, res) => {
  const noteId = req.params.noteId;

  try {
    const result = await db.query("SELECT * FROM notes WHERE id = $1", [noteId]);

    let note = result.rows[0];

    res.render("note-form.ejs", {
      note: note
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

app.post("/edit/:bookId", async (req, res) => {
  const bookId = req.params.bookId;
  const title = req.body.title;
  const description = req.body.description;
  const rating = req.body.rating;
  const finished_reading = req.body.finished_reading;
  const isbn = req.body.isbn;

  try {
    await db.query("UPDATE books SET title = $1, description = $2, rating = $3, finished_reading= $4, isbn = $5 WHERE id = $6;",
      [title, description, rating, finished_reading, isbn, bookId]);

    res.redirect("/?edit=true");
  } catch (err) {
    console.error(err);
  }
});

app.post("/notes/add/:bookId", async (req, res) => {
  const bookId = req.params.bookId;
  const body_text = req.body.body_text;

  try {
    await db.query("INSERT INTO notes (body_text, book_id) VALUES ($1, $2);", [body_text, bookId]);

    res.redirect(`/notes/${bookId}?edit=true`);
  } catch (err) {
    console.error(err);
  }
});

app.post("/notes/edit/:noteId", async (req, res) => {
  const noteId = req.params.noteId;
  const body_text = req.body.body_text;

  try {
    const result = await db.query("UPDATE notes SET body_text = $1 WHERE id = $2 RETURNING book_id;", [body_text, noteId]);

    const bookId = result.rows[0].book_id;

    res.redirect(`/notes/${bookId}?edit=true`);
  } catch (err) {
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

app.delete("/notes/:noteId", async (req, res) => {
  const noteId = req.params.noteId;

  try {
    await db.query("DELETE FROM notes WHERE id = $1", [noteId]);

    res.status(200).json({message: "Note deleted successfully"});

  } catch (err) {
    console.error(err);
    res.status(500).json({error: "Server error"});
  }
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
