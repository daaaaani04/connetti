// src/components/FormOfferta.jsx
import { useState } from 'react'
import supabase from '../lib/supabase'
import styles from './FormOfferta.module.css'


export default function FormOfferta({ annuncio, sessione, onClose, onSuccess, offertaEsistente }) {
  const [form, setForm] = useState({
    // se sto modificando un'offerta esistente prefillo i campi con i suoi dati
    messaggio: offertaEsistente?.messaggio || '',
    prezzo: offertaEsistente?.prezzo ?? ''
  })
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrore(null)
    setLoading(true)

    const datiOfferta = {
      messaggio: form.messaggio,
      prezzo: form.prezzo ? parseFloat(form.prezzo) : null
    }

    let error
    if (offertaEsistente) {
      // aggiorno l'offerta esistente (senza cancellarla, per non perdere la chat
      // collegata via messaggi.preventivo_id) e la riporto a "inviata": serve a
      // ri-proporsi, ad esempio dopo un rifiuto
      const res = await supabase
        .from('offerte')
        .update({ ...datiOfferta, stato: 'inviata' })
        .eq('id', offertaEsistente.id)
      error = res.error
    } else {
      // prima offerta per questo annuncio: la creo
      const res = await supabase
        .from('offerte')
        .insert({
          annuncio_id: annuncio.id,
          venditore_id: sessione.user.id,
          ...datiOfferta
        })
      error = res.error
    }

    setLoading(false)

    if (error) {
      // errore unicità — offerta già inviata (es. race condition su insert)
      if (error.code === '23505') {
        return setErrore('Hai già inviato un\'offerta per questo annuncio.')
      }
      return setErrore(error.message)
    }

    onSuccess()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>  {/* stopPropagation serve per bloccare la propagazione dell'evento */}
        {/* cliccando sul modal potrebbe chiudersi inavvertitamente (sto cliccando implicitamente anceh sull'overlay) */}
        
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.settore}>{annuncio.settori?.label}</span>
            <h2 className={styles.modalTitolo}>{annuncio.titolo}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Dettagli annuncio */}
        <div className={styles.annuncioInfo}>
          {annuncio.comune && <span>Luogo: {annuncio.comune}</span>}
          {annuncio.budget && <span> Budget: {annuncio.budget}€</span>}
          {annuncio.urgente && <span className={styles.urgente}>Urgente</span>}
        </div>

        {annuncio.descrizione && (
          <p className={styles.annuncioDesc}>{annuncio.descrizione}</p>
        )}

        <div className={styles.divider} />

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Il tuo preventivo (€)</label>
            <input
              className={styles.input}
              name="prezzo"
              type="number"
              placeholder="Es. 250"
              value={form.prezzo}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Messaggio *</label>
            <textarea
              className={styles.textarea}
              name="messaggio"
              placeholder="Presentati e descrivi come puoi aiutare il cliente..."
              value={form.messaggio}
              onChange={handleChange}
              rows={4}
              required
            />
          </div>

          {errore && <p className={styles.errore}>{errore}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
            >
              Annulla
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={loading}
            >
              {loading ? 'Invio...' : (offertaEsistente ? 'Aggiorna offerta' : 'Invia offerta')}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}