import 'dotenv/config'
import './lib/supabase.js'
import express from 'express'
import cors from 'cors'

const port = 3000

const app = express()
app.use(cors()) // permetto a tutti i domini di accedere alle mie API 
app.use(express.json()) // per poter leggere il body delle richieste in formato JSON

app.get('/', (req, res) => res.send('Hello World!'))




app.listen(port, () => console.log(`Example app listening on port ${port}!`))