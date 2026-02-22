require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const authRouter = require("./routes/authRoute");
const userRouter = require("./routes/userRoute");
connectDB();

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: "https://user-mern-authentication.netlify.app",
    // origin: [
    //   "http://localhost:5173",
    //   "https://user-mern-authentication.netlify.app"
    // ],
  }),
);

// API Endpoints

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

app.listen(port, () => {
  console.log(`Application is up and running on port ${port}.`);
});
