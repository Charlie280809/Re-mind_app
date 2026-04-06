const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/checkin", (req, res) => {
  const { stress, energy } = req.body;

  const needPause = stress >= 4 || energy <= 2;

  res.json({ needPause });
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
