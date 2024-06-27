const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
const io = require("socket.io")(server);
const SECRET_KEY = "your_secret_key";

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "chat_app",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Database connected!");
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let socketsConnected = new Set();

// Socket.io middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.query.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    const decoded = jwt.verify(token, SECRET_KEY);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error("Authentication error"));
  }
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);
  socketsConnected.add(socket.id);
  io.emit("clients-total", socketsConnected.size);

  socket.on("disconnect", () => {
    console.log("Socket disconnected", socket.id);
    socketsConnected.delete(socket.id);
    io.emit("clients-total", socketsConnected.size);
  });

  socket.on("message", (data) => {
    const messageData = {
      user_id: socket.user.id,
      message: data.message,
    };
    db.query("INSERT INTO messages SET ?", messageData, (err, result) => {
      if (err) throw err;
      socket.broadcast.emit("chat-message", {
        ...data,
        user: socket.user.username,
      });
    });
  });

  socket.on("feedback", (data) => {
    socket.broadcast.emit("feedback", data);
  });
});

// User registration endpoint
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);
  const userData = { username, email, password: hashedPassword };
  db.query("INSERT INTO users SET ?", userData, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send({ message: "Error registering user!" });
    } else {
      res.send({ message: "User registered successfully!" });
    }
  });
});

// User login endpoint
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query(
    "SELECT id, username, password FROM users WHERE email = ?",
    [email],
    (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).send({ message: "Error logging in!" });
      } else if (results.length === 0) {
        res.status(404).send({ message: "User not found!" });
      } else {
        const user = results[0];
        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
          res.status(401).send({ message: "Invalid password!" });
        } else {
          const token = jwt.sign(
            { id: user.id, username: user.username },
            SECRET_KEY,
            {
              expiresIn: 86400, // 24 hours
            }
          );
          res.send({ token, username: user.username });
        }
      }
    }
  );
});
