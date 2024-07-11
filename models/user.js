const mongoose = require("mongoose");
mongoose
  .connect(
    "###"
  )
  .then(console.log("Mongoose Connected"))
  .catch((err) => {
    console.log("Mongoose Not Connected : ", err);
  });

const userSchema = mongoose.Schema({
  name: String,
  age: Number,
  username: String,
  email: String,
  password: String,
  profile: {
    type: String,
    default: "default.jpg",
  },
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
    },
  ],
});

module.exports = mongoose.model("user", userSchema);
