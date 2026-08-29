const express = require("express")
const cors = require("cors")
const app = express()
app.use(cors())
const PORT = 5000

app.get("/", (req, res) => {
  res.send("VAAS server is running")
})

app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    message: "VAAS backend is running"
  })
})

app.listen(PORT, () => {
  console.log(`VAAS server running on http://localhost:${PORT}`)
})