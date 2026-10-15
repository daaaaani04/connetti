-- ============================================================
--  Aggiunge immagini di sfondo alle card dei settori (Home).
--  La Home usa la colonna settori.immagine come background-image.
--  Incollare nella SQL Editor di Supabase ed eseguire.
-- ============================================================

-- 1) aggiunge la colonna (se non esiste)
alter table settori add column if not exists immagine text;

-- 2) imposta un'immagine a tema per ogni settore (loremflickr, lock = immagine fissa)
update settori set immagine = 'https://loremflickr.com/600/400/construction,building?lock=11' where id = 'edilizia';
update settori set immagine = 'https://loremflickr.com/600/400/gardening,garden?lock=12'      where id = 'giardino';
update settori set immagine = 'https://loremflickr.com/600/400/plumbing,pipes?lock=13'        where id = 'idraulica';
update settori set immagine = 'https://loremflickr.com/600/400/electrician,wiring?lock=14'    where id = 'elettricista';
update settori set immagine = 'https://loremflickr.com/600/400/cleaning,house?lock=15'        where id = 'pulizie';
update settori set immagine = 'https://loremflickr.com/600/400/moving,boxes?lock=16'          where id = 'traslochi';
update settori set immagine = 'https://loremflickr.com/600/400/carpentry,woodworking?lock=17' where id = 'falegname';
update settori set immagine = 'https://loremflickr.com/600/400/painting,wall?lock=18'         where id = 'imbianchino';
