-- ============================================================
--  SCHEMA DATABASE - progetto_web
--  Ricostruito dal codice del client (src/).
--  Incollare TUTTO questo file nella SQL Editor di Supabase
--  (nuovo progetto) ed eseguire.
-- ============================================================

-- ---------- ENUM ----------
create type ruolo_utente as enum ('acquirente', 'venditore');
create type stato_annuncio as enum ('attivo', 'chiuso', 'scaduto');
create type stato_offerta  as enum ('inviata', 'vista', 'accettata', 'rifiutata');

-- ---------- SETTORI ----------
create table settori (
  id       text primary key,    -- es. 'edilizia'
  label    text not null,       -- es. 'Edilizia'
  icona    text,                -- emoji o nome icona
  immagine text                 -- URL immagine di sfondo per la card in Home
);

-- ---------- PROFILES (1:1 con auth.users) ----------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  ruolo        ruolo_utente not null,
  nome         text,
  cognome      text,
  nome_azienda text,            -- usato per i venditori
  email        text,
  telefono     text,
  comune       text,
  indirizzo    text,            -- usato per i venditori
  settore      text references settori(id),  -- settore del venditore (singolo)
  created_at   timestamptz default now()
);

-- ---------- ANNUNCI ----------
create table annunci (
  id            uuid primary key default gen_random_uuid(),
  acquirente_id uuid not null references profiles(id) on delete cascade,
  titolo        text not null,
  descrizione   text,
  settore_id    text references settori(id),
  comune        text,
  budget        text,
  urgente       boolean default false,
  stato         stato_annuncio default 'attivo',
  created_at    timestamptz default now(),
  scade_il      date
);

-- ---------- OFFERTE ----------
create table offerte (
  id            uuid primary key default gen_random_uuid(),
  annuncio_id   uuid not null references annunci(id) on delete cascade,
  venditore_id  uuid not null references profiles(id) on delete cascade,
  messaggio     text,
  prezzo        numeric,
  stato         stato_offerta default 'inviata',
  created_at    timestamptz default now(),
  -- un venditore può fare UNA sola offerta per annuncio (errore 23505 gestito nel client)
  unique (annuncio_id, venditore_id)
);

-- ---------- MESSAGGI (chat legata a un'offerta/preventivo) ----------
create table messaggi (
  id              uuid primary key default gen_random_uuid(),
  preventivo_id   uuid not null references offerte(id) on delete cascade,
  mittente_id     uuid not null references profiles(id) on delete cascade,
  destinatario_id uuid not null references profiles(id) on delete cascade,
  testo           text not null,
  created_at      timestamptz default now()
);

-- ---------- RECENSIONI ----------
create table recensioni (
  id            uuid primary key default gen_random_uuid(),
  acquirente_id uuid not null references profiles(id) on delete cascade,
  venditore_id  uuid not null references profiles(id) on delete cascade,
  annuncio_id   uuid references annunci(id) on delete set null,
  stelle        int not null check (stelle between 1 and 5),
  testo         text,
  created_at    timestamptz default now()
);

-- ============================================================
--  TRIGGER: crea automaticamente il profilo alla registrazione
--  (il client passa i dati in options.data -> raw_user_meta_data)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, ruolo, nome, cognome, nome_azienda, email, telefono, comune, settore)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'ruolo')::ruolo_utente, 'acquirente'),
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'cognome',
    new.raw_user_meta_data->>'nomeAzienda',
    new.email,
    new.raw_user_meta_data->>'telefono',
    new.raw_user_meta_data->>'comune',
    nullif(new.raw_user_meta_data->>'settoreSelezionato', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  ROW LEVEL SECURITY
--  Policy permissive adatte a un progetto didattico:
--  - lettura pubblica dove il sito mostra dati a tutti
--  - scrittura consentita agli utenti autenticati
--  Irrobustire in produzione.
-- ============================================================
alter table settori     enable row level security;
alter table profiles    enable row level security;
alter table annunci     enable row level security;
alter table offerte     enable row level security;
alter table messaggi    enable row level security;
alter table recensioni  enable row level security;

-- settori: sola lettura pubblica
create policy "settori lettura" on settori for select using (true);

-- profiles: lettura pubblica, modifica solo del proprio profilo
create policy "profiles lettura"  on profiles for select using (true);
create policy "profiles update"   on profiles for update using (auth.uid() = id);
create policy "profiles insert"   on profiles for insert with check (auth.uid() = id);

-- annunci: lettura pubblica, gestione solo da parte dell'acquirente proprietario
create policy "annunci lettura" on annunci for select using (true);
create policy "annunci insert"  on annunci for insert with check (auth.uid() = acquirente_id);
create policy "annunci update"  on annunci for update using (auth.uid() = acquirente_id);
create policy "annunci delete"  on annunci for delete using (auth.uid() = acquirente_id);

-- offerte: visibili agli utenti autenticati; il venditore crea le proprie; aggiornamento consentito agli autenticati
create policy "offerte lettura" on offerte for select using (auth.role() = 'authenticated');
create policy "offerte insert"  on offerte for insert with check (auth.uid() = venditore_id);
create policy "offerte update"  on offerte for update using (auth.role() = 'authenticated');

-- messaggi: accesso a chi è mittente o destinatario
create policy "messaggi lettura" on messaggi for select
  using (auth.uid() = mittente_id or auth.uid() = destinatario_id);
create policy "messaggi insert"  on messaggi for insert
  with check (auth.uid() = mittente_id);

-- recensioni: lettura pubblica, scrittura dell'acquirente autore
create policy "recensioni lettura" on recensioni for select using (true);
create policy "recensioni insert"  on recensioni for insert with check (auth.uid() = acquirente_id);

-- ============================================================
--  DATI INIZIALI: settori
--  Adatta label/icone ai settori effettivi del tuo sito.
-- ============================================================
insert into settori (id, label, icona, immagine) values
  ('edilizia',    'Edilizia',     '🏗️', 'https://loremflickr.com/600/400/construction,building?lock=11'),
  ('giardino',    'Giardinaggio', '🌳', 'https://loremflickr.com/600/400/gardening,garden?lock=12'),
  ('idraulica',   'Idraulica',    '🔧', 'https://loremflickr.com/600/400/water,pipes?lock=13'),
  ('elettricista','Elettricista', '💡', 'https://loremflickr.com/600/400/electrician,light?lock=14'),
  ('pulizie',     'Pulizie',      '🧹', 'https://loremflickr.com/600/400/cleaning,house?lock=15'),
  ('traslochi',   'Traslochi',    '📦', 'https://loremflickr.com/600/400/moving,boxes?lock=16'),
  ('falegname',   'Falegnameria', '🪚', 'https://loremflickr.com/600/400/carpentry,woodworking?lock=17'),
  ('imbianchino', 'Imbianchino',  '🎨', 'https://loremflickr.com/600/400/painting,wall?lock=18')
on conflict (id) do nothing;
