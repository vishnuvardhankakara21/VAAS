const express = require("express")
const cors = require("cors")
const app = express()
app.use(cors())
app.use(express.json())
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

app.post("/api/chat",(req,res)=>{
  const usermessage = req.body.message
  res.json({
    response:`VAAS Recieved:${usermessage}`
  })
})

app.listen(PORT, () => {
  console.log(`VAAS server running on http://localhost:${PORT}`)
})