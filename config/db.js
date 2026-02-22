const mongoose = require("mongoose");
const db_uri = process.env.MONGO_URI;

const connectDB = function () {
  mongoose
    .connect(db_uri)
    .then(() => {
      console.log("MongoDB Connected Successfully.");
    })
    .catch((err) => {
      console.log("Error in DB Connection", err.message);
      process.exit(1);
    });
};

module.exports = connectDB;
