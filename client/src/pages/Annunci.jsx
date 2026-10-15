import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'  // ← aggiungi import
import supabase from '../lib/supabase'
import styles from './Annunci.module.css'
import FormOfferta from '../components/FormOfferta'

export default function Annunci({ sessione }) {
  const [searchParams] = useSearchParams()  // sposta qui, prima degli stati

  const [annunci, setAnnunci] = useState([])
  const [settori, setSettori] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtri, setFiltri] = useState({
    comune: '',
    settore_id: searchParams.get('settore') || ''  // legge URL al primo render
  })
  const [annuncioSelezionato, setAnnuncioSelezionato] = useState(null)
  const [successoOfferta, setSuccessoOfferta] = useState(false)
  const [profilo, setProfilo] = useState(null)
  const [offerteMie, setOfferteMie] = useState({})  // mappa annuncio_id -> offerta già inviata dal venditore

  useEffect(() => {
    async function init() {
      const { data: settoriData } = await supabase.from('settori').select('*')
      setSettori(settoriData || [])

      let filtriIniziali = {
        comune: '',
        settore_id: searchParams.get('settore') || ''  // URL ha priorità
      }

      if (sessione) {
        const { data: profiloData } = await supabase
          .from('profiles')
          .select('comune, ruolo, settore')
          .eq('id', sessione.user.id)
          .single()

        setProfilo(profiloData)

        // carico le offerte già inviate dal venditore, per sapere su quali annunci
        // esiste già un'offerta (e permetterne la modifica invece di un doppio invio)
        await caricaOfferteMie(sessione.user.id)

        filtriIniziali = {
          comune: profiloData?.comune || '',
          settore_id: searchParams.get('settore') || profiloData?.settore || ''  // ← URL prima, poi profilo
        }
      }

      setFiltri(filtriIniziali)
      await caricaAnnunci(filtriIniziali)
    }

    init()
  }, [sessione])

  async function caricaAnnunci(f = filtri) {
    setLoading(true)

    let query = supabase
      .from('annunci')
      .select('*, settori(*)')
      .eq('stato', 'attivo')
      .order('created_at', { ascending: false })

    // aggiungo filtri solo se presenti
    if (f.comune) query = query.ilike('comune', `%${f.comune}%`)    // ricerca che contine
    if (f.settore_id) query = query.eq('settore_id', f.settore_id)  // ricerca esatta

    const { data } = await query
    setAnnunci(data || [])
    setLoading(false)
  }

  // carico le offerte del venditore loggato e le indicizzo per annuncio_id,
  // così da capire a colpo d'occhio su quali annunci ha già proposto
  async function caricaOfferteMie(userId) {
    const { data } = await supabase
      .from('offerte')
      .select('*')
      .eq('venditore_id', userId)

    const mappa = {}
    ;(data || []).forEach(o => { mappa[o.annuncio_id] = o })
    setOfferteMie(mappa)
  }

  function handleFiltro(e) {
    const { name, value } = e.target
    setFiltri(prev => ({ ...prev, [name]: value }))
  }

  function handleCerca(e) {
    e.preventDefault()
    caricaAnnunci()
  }

  function handleReset() {
    const vuoti = { comune: '', settore_id: '' }
    setFiltri(vuoti)
    caricaAnnunci(vuoti)
  }

  // cerca il settore selezionato per mostrarne il label nell'header
  const settoreSelezionato = settori.find(s => String(s.id) === String(filtri.settore_id))

  return (
   <main className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <p className={styles.label}>Annunci disponibili</p>
        <h1 className={styles.titolo}>
          {settoreSelezionato ? settoreSelezionato.label : 'Trova lavori'}    {/* componente dinamico che cambia al variare del settore selezionato */} 
          <span className={styles.accent}>.</span>
        </h1>
        <p className={styles.sub}>
          {settoreSelezionato
            ? `Annunci nel settore ${settoreSelezionato.label}`
            : sessione                                                          /* else c'è una sessione */
              ? 'Annunci filtrati in base alla tua zona e ai tuoi settori.'     /* si sessione */
              : 'Sfoglia tutti gli annunci disponibili.'      /* no sessione -> generico e nessn campo selezionato */
          }
        </p>
      </div>

      {/* Filtri */}
      <form className={styles.filtri} onSubmit={handleCerca}>     {/* quando premo cerca nel form -> carico dati con filtri aggiornati*/} 
        <input
          className={styles.input}
          name="comune"
          placeholder="Comune"
          value={filtri.comune}   /* inserisco il valore comune nel form (aggiornato da react) */
          onChange={handleFiltro}     /* i filtri vengono aggiornati istantaneamente ma la chiamata al db avviene solo onSubmit*/
        />
        <select
          className={styles.select}
          name="settore_id"
          value={filtri.settore_id}
          onChange={handleFiltro}     
        >
          <option value="">Tutti i settori</option>
          {settori.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <button className={styles.btnPrimary} type="submit">Cerca</button>
        <button className={styles.btnSecondary} type="button" onClick={handleReset}>Reset</button>
      </form>

      {/* Risultati */}
      {loading ? (
        <div className={styles.loadingContainer}>       {/* se in caricamento */}
          <div className={styles.loadingDots}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p className={styles.loadingText}>Ricerca annunci in corso</p>
        </div>
      ) : annunci.length === 0 ? (
        <div className={styles.empty}>
          <p>Nessun annuncio trovato con questi filtri.</p>
          <button className={styles.btnSecondary} onClick={handleReset}>
            Rimuovi filtri
          </button>
        </div>
      ) : (
        <>
          <p className={styles.risultati}>{annunci.length} annunci trovati</p>
          <div className={styles.lista}>
            {annunci.map(a => (
              <div key={a.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <span className={styles.settore}>{a.settori?.label}</span>
                    <h2 className={styles.cardTitolo}>{a.titolo}</h2>
                  </div>
                  <div className={styles.cardTopRight}>
                    {a.urgente && (                 /* se è vera la condizione a sx -> è vera anche quella a dx */
                      <span className={styles.urgente}>Urgente</span>
                    )}
                    {a.scade_il && (
                      <span className={styles.scadenza}>
                        Scade il {new Date(a.scade_il).toLocaleDateString('it-IT')}
                      </span>
                    )}
                  </div>
                </div>

                {a.descrizione && (
                  <p className={styles.descrizione}>{a.descrizione}</p>
                )}

                <div className={styles.cardBottom}>
                  <div className={styles.meta}>
                    {a.comune && <span> Luogo: {a.comune}</span>}
                    {a.budget && <span> Budget: {a.budget}€</span>}
                  </div>
                  <div className={styles.cardBottomRight}>
                    <span className={styles.data}>
                      {new Date(a.created_at).toLocaleDateString('it-IT')}
                    </span>
                    {sessione && profilo?.ruolo === 'venditore' && (
                      <button
                        className={styles.btnOfferta}
                        onClick={() => setAnnuncioSelezionato(a)}       /* al click su invia offerta attivo setAnnuncioSelezionato che apre il Form */
                      >
                        {offerteMie[a.id] ? 'Modifica offerta' : 'Invia offerta'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {annuncioSelezionato && (
        <FormOfferta
          annuncio={annuncioSelezionato}
          sessione={sessione}
          offertaEsistente={offerteMie[annuncioSelezionato.id]}
          onClose={() => setAnnuncioSelezionato(null)}
          onSuccess={() => {
            setAnnuncioSelezionato(null)
            setSuccessoOfferta(true)
            caricaOfferteMie(sessione.user.id)   // aggiorno la mappa dopo invio/modifica
            setTimeout(() => setSuccessoOfferta(false), 3000)
          }}
        />
      )}

      {successoOfferta && (
        <div className={styles.successo}>
          Offerta inviata con successo!
          <button onClick={() => setSuccessoOfferta(false)}>✕</button>
        </div>
      )}

    </main>
  )
}