import { useEffect, useState} from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'
import FormRecensione from '../components/FormRecensione'
import styles from './ProfiloPubblico.module.css'

/*componente react che implementa la pagina profilo pubblico di un venditore e mostra informazioni, recensioni, eventualmente posizione
e la possibilità di lasciare una recensione nel caso in cui non sia stata già lasciata  */

//componente svg per disegnare la freccia indietro
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" >
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
)

//componente intero che disegna la card di una recensione nella pag recensioni e riceve come props { r } cioè i dati di una sigola recensione
function RecensioneCard({ r }) {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewTop}>
        <div className={styles.reviewAvatar}>
          {r.profiles?.nome?.[0]?.toUpperCase() ?? '?'}
          {/* disegna il cerchio con la lettera del profilo che ha pubblicato la recnesione o punto interrogativo se non lo ha */}
        </div>
        <div className={styles.reviewMeta}>
          <p className={styles.reviewNome}>
            {r.profiles?.nome} {r.profiles?.cognome}
          </p>
          <p className={styles.reviewData}>
            {/* data formattata in italiano */}
            {new Date(r.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className={styles.stelle}>
          {/* cicla 5 volte sulla array per disegnare le stelle, se il numero di stelle è <= voto colora la stella con lo stile */}
          {[1,2,3,4,5].map(n => (
            <span key={n} className={n <= r.stelle ? styles.starOn : styles.starOff}>★</span>
          ))}
        </div>
      </div>
      {/* se l'utente ha scritto un commento lo mette sotto la situa */}
      {r.testo && (
        <p className={styles.reviewTesto}>{r.testo}</p>
      )}
    </div>
  )
}

// componente principale per il profilo pubblico, riceve in input la prop sessione 
export default function ProfiloPubblico({ sessione }) {
  const { id } = useParams() //estrae l'id del venditore dall'url della pagina
  const navigate = useNavigate() //hook per la gestione della navigazione


  const [profilo, setProfilo]               = useState(null) //var di stato per memorizzare i dati del venditore
  const [recensioni, setRecensioni]         = useState([]) // array di recensioni di quel profilo
  const [puoRecensire, setPuoRecensire]     = useState(false) // booleano che indica se l'acquirente può recensire quel profilo
  const [haGiaRecensito, setHaGiaRecensito] = useState(false) // booleano che indica se ho già recensito
  const [loading, setLoading]               = useState(true) // booleano che indica che sta caricando la pagina in attesa delle info 
  const [tabAttiva, setTabAttiva]           = useState('recensioni') // var di stato che indica in quale sezione ci troviamo, di default recensioni
  const [menuMobileAperto, setMenuMobileAperto] = useState(false) //gestione del menu a tendina sui cellulari
  const [annuncioIdPerRecensione, setAnnuncioIdPerRecensione] = useState(null) //id del'annuncio per cui stiamo recensendo

  //useeffect lancia caricaTutto all'apertura della pagina o se cambia l'id o la sessione

  useEffect(() => { caricaTutto() }, [id, sessione])

  //carica tutti i dati che servono
  async function caricaTutto() {
    setLoading(true)
    // prende le info del venditore
    const { data: p } = await supabase
      .from('profiles')
      .select('id, nome, cognome, nome_azienda, comune, indirizzo, telefono, created_at, settori(id, label, icona)')
      .eq('id', id)
      .single()
    // prende le recensioni associate a questo venditore
    const { data: r } = await supabase
      .from('recensioni')
      .select('id, stelle, testo, created_at, profiles!acquirente_id(nome, cognome)')
      .eq('venditore_id', id)
      .order('created_at', { ascending: false })
    //salvo i dati nelle var di stato associate ( sottoforma di dizionari)
    setProfilo(p)
    setRecensioni(r || [])

    //se l'utente che guarda è loggato
    if (sessione) {
      //prendo tutti gli annunci creati da questo utente che guarda
      const { data: annunci } = await supabase
        .from('annunci').select('id').eq('acquirente_id', sessione.user.id)

      //siccome supabase restituisce [ { id: 15}, {id: 23}] applico la map per prendere un array di soli numeri
      const ids = (annunci || []).map(a => a.id)
      
      if (ids.length > 0) {
        // controllo se il venditore ha un'offerta accettata per uno dei tuoi annunci
        //limit(1) fa si che si prenda una sola offerta nel caso ce ne siano più accettate
        const { data: offerteTrovate } = await supabase
          .from('offerte').select('id, annuncio_id')
          .eq('venditore_id', id).eq('stato', 'accettata').in('annuncio_id', ids).limit(1)
          // prendi la colonna annuncio_id e controlla se il suo valore è presente dentro la lista passata 

        const offerta = offerteTrovate && offerteTrovate.length > 0 ? offerteTrovate[0] : null

        if (offerta) {
          setPuoRecensire(true)
          
          //salva l'id dell'offerta per passarlo al form
          setAnnuncioIdPerRecensione(offerta.annuncio_id)  
          
          // Controlliamo se hai già recensito
          const { data: esiste } = await supabase
            .from('recensioni').select('id')
            .eq('venditore_id', id).eq('acquirente_id', sessione.user.id).limit(1)
            
          setHaGiaRecensito(esiste && esiste.length > 0)
        }
      }
    }

    setLoading(false)
  }

  //funzione chiamata dal form recensione quando l'invio va a buon fine
  function onRecensioneInviata(nuova) {
    setRecensioni(prev => [nuova, ...prev])
    setHaGiaRecensito(true)
    setTabAttiva('recensioni')
  }

  if (loading) return <div className={styles.loading}>Caricamento in corso...</div>
  if (!profilo) return <div className={styles.loading}>Profilo non trovato.</div>

  //nome per mostrare in alto a destra nella card con annesso avatar
  const nome  = profilo.nome_azienda || `${profilo.nome} ${profilo.cognome}`
  // calcola la media delle stelle nel caso ci sia almeno una recensione
  const media = recensioni.length
    ? recensioni.reduce((a, r) => a + r.stelle, 0) / recensioni.length
    : null
  //per calcolare da quanti mesi è attivo il profilo
  const mesi  = Math.floor((Date.now() - new Date(profilo.created_at)) / (1000*60*60*24*30))

  //per il menu a tendina a sinistra /alcune schede appaino solo se son soddisfatti i requisiti (poszione appare solo se c'è indirizzo)
  // e lascia recesnione solo se puoi recensire e non ho già recensito

  const tabs = [
    { id: 'info',       label: 'Informazioni' },
    // numeretto vicino al label
    { id: 'recensioni', label: `Recensioni${recensioni.length > 0 ? ` (${recensioni.length})` : ''}` },
    ...(profilo.indirizzo ? [{ id: 'posizione', label: ' Posizione' }] : []),
    ...(puoRecensire && !haGiaRecensito ? [{ id: 'lascia', label: ' Lascia recensione' }] : []),
  ]

  //cerco nell array tabs la tab attualmente aperta
  const tabAttivaLabel = tabs.find(t => t.id === tabAttiva)?.label || ''

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>

        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button onClick={() => navigate(-1)} className={styles.backBtn}>
              <BackIcon />
            </button>
            <h1 className={styles.navTitle}>Profilo Professionale</h1>
          </div>
          <div className={styles.userDropdown}>
            {media && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>★ {media.toFixed(1)}</span>}
            <span>{nome}</span>
            <div className={styles.miniAvatar}>{nome[0]?.toUpperCase()}</div>
          </div>
        </header>

        <div className={styles.contentLayout}>

          {/* Pulsante menu a tendina visibile solo sui cellulari*/}
          <button
            className={styles.hamburgerTrigger}
            onClick={() => setMenuMobileAperto(prev => !prev)}
            aria-expanded={menuMobileAperto}
          >
            <span className={styles.hamburgerLabel}>{tabAttivaLabel}</span>
            <span className={`${styles.hamburgerIcon} ${menuMobileAperto ? styles.hamburgerIconOpen : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          {/* barra laterale sinistra */}
          <aside className={`${styles.sidebarMenu} ${menuMobileAperto ? styles.sidebarMenuOpen : ''}`}>
            {tabs.map(t => (
              <button
                key={t.id}
                className={tabAttiva === t.id ? styles.activeMenu : ''}
                onClick={() => {
                  setTabAttiva(t.id)
                  setMenuMobileAperto(false)
                }}
              >
                {t.label}
              </button>
            ))}

          {/* pulsante chiama ora */}
          {profilo.telefono && (
            <a href={`tel:${profilo.telefono}`} className={styles.ctaBtn}>
              Chiama ora
            </a>
          )}
          </aside>

          <main className={styles.mainFormArea}>

            {/* TAB: INFORMAZIONI */}
            {tabAttiva === 'info' && (
              <section className={styles.formCard}>
                <h2 className={styles.sectionTitle}>Informazioni</h2>
                <div className={styles.gridForm}>

                  <div className={styles.inputGroup}>
                    <label>NOME / AZIENDA</label>
                    <input type="text" value={nome} disabled />
                  </div>


                  {profilo.comune && (
                    <div className={styles.inputGroup}>
                      <label>CITTÀ</label>
                      <input type="text" value={profilo.comune} disabled />
                    </div>
                  )}

                  {profilo.telefono && (
                    <div className={styles.inputGroup}>
                      <label>TELEFONO</label>
                      <input type="text" value={profilo.telefono} disabled />
                    </div>
                  )}

                  <div className={styles.inputGroup}>
                    <label>MESI ATTIVO</label>
                    <input type="text" value={`${mesi} mes${mesi === 1 ? 'e' : 'i'}`} disabled />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>RECENSIONI TOTALI</label>
                    <input type="text" value={recensioni.length} disabled />
                  </div>

                  {media && (
                    <div className={styles.inputGroup}>
                      <label>PUNTEGGIO MEDIO</label>
                      <input type="text" value={`★ ${media.toFixed(1)} / 5`} disabled />
                    </div>
                  )}

                </div>
              </section>
            )}

            {/* TAB: RECENSIONI */}
            {tabAttiva === 'recensioni' && (
              <section className={styles.formCard}>
                <h2 className={styles.sectionTitle}>Recensioni ricevute</h2>

                {haGiaRecensito && (
                  <p className={styles.msgOk} style={{ marginBottom: 16 }}>
                    Hai già lasciato una recensione per questo professionista.
                  </p>
                )}

                {recensioni.length === 0 ? (
                  <div className={styles.empty}>
                    <p className={styles.emptyIcon}>💬</p>
                    <p className={styles.emptyTitle}>Nessuna recensione ancora</p>
                    <p className={styles.emptySub}>Sii il primo a condividere la tua esperienza.</p>
                  </div>
                ) : (
                  <div className={styles.reviewList}>
                    {recensioni.map(r => <RecensioneCard key={r.id} r={r} />)}
                  </div>
                )}
              </section>
            )}

            {/* TAB: POSIZIONE */}
            {tabAttiva === 'posizione' && profilo.indirizzo && (
              <section className={styles.formCard}>
                <h2 className={styles.sectionTitle}>Dove ci trovi</h2>

                <div className={`${styles.gridForm} ${styles.posizioneInfo}`}>
                  <div className={styles.inputGroup}>
                    <label>INDIRIZZO</label>
                    <input type="text" value={profilo.indirizzo} disabled />
                  </div>
                  {profilo.comune && (
                    <div className={styles.inputGroup}>
                      <label>CITTÀ</label>
                      <input type="text" value={profilo.comune} disabled />
                    </div>
                  )}
                </div>

                <div className={styles.mappaWrapper}>
                  <iframe
                    title={`Posizione di ${nome}`}
                    width="100%"
                    height="400"
                    frameBorder="0"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(`${profilo.indirizzo}, ${profilo.comune || ''}`)}&output=embed`}
                    className={styles.mappaIframe}
                  />
                </div>

                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(`${profilo.indirizzo}, ${profilo.comune || ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mappaLink}
                >
                  Apri in Google Maps ↗
                </a>
              </section>
            )}

            {/* TAB: LASCIA RECENSIONE */}
            {tabAttiva === 'lascia' && puoRecensire && !haGiaRecensito && (
              <section className={styles.formCard}>
                <h2 className={styles.sectionTitle}>Lascia una recensione</h2>
                <FormRecensione
                  venditoreid={id}
                  annuncioid={annuncioIdPerRecensione} 
                  sessione={sessione}
                  onInviata={onRecensioneInviata}
                />
              </section>
            )}

          </main>
        </div>
      </div>
    </div>
  )
}