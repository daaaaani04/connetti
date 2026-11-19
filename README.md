# connetti.

Piattaforma web che mette in contatto **acquirenti** (chi cerca un servizio) e **professionisti** (chi lo offre): l'acquirente pubblica un annuncio, i professionisti inviano preventivi, le due parti si scrivono in chat e a lavoro concluso l'acquirente lascia una recensione.

Progetto sviluppato per il corso di Programmazione Web.

## Funzionalità

- Registrazione e login con ruolo **acquirente** o **venditore**
- Pubblicazione e gestione degli annunci, filtrabili per settore (edilizia, idraulica, elettricista, pulizie, traslochi…)
- Invio e gestione dei preventivi
- Chat tra acquirente e professionista
- Profilo pubblico con recensioni, profilo privato e impostazioni
- Rotte protette: le pagine private reindirizzano al login

## Stack

- **Frontend:** React 19, React Router, Vite, CSS Modules
- **Backend / database:** Supabase (Postgres, Auth, Row Level Security)
- Server Express opzionale in `server/` (le chiamate al database partono dal client, protette dalle policy RLS)

## Avvio in locale

1. Crea un progetto su [Supabase](https://supabase.com) ed esegui `schema.sql` nello SQL Editor (poi `add-immagini-settori.sql`).
2. Configura le variabili d'ambiente:
   ```bash
   cp client/.env.example client/.env   # poi inserisci URL e chiave anon
   ```
3. Installa e avvia il client:
   ```bash
   cd client
   npm install
   npm run dev
   ```

Altri comandi: `npm run build` (build di produzione), `npm run lint`.

## Struttura

```
client/          app React (pagine, componenti, client Supabase)
server/          server Express (facoltativo)
schema.sql       schema del database e policy RLS
db.txt           schema delle tabelle in forma discorsiva
```

La documentazione dettagliata delle pagine è in [`client/DOCUMENTAZIONE.md`](client/DOCUMENTAZIONE.md).

## Autore

Danilo Cimmino, studente di Ingegneria alla Sapienza Università di Roma.
