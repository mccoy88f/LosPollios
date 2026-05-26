# LosPollios

**Versione attuale: 1.0.4**

Applicazione web per **organizzare e seguire lo spoglio** delle **elezioni amministrative** (comunali): si inseriscono i dati sezione per sezione, si vedono i risultati aggiornati in tempo reale e le proiezioni (coalizioni, seggi, soglie).

Questa pagina spiega **cosa fa il sistema dal punto di vista di chi lo usa**, senza entrare nei dettagli tecnici.

---

## Novità in v1.0.4

- **Salvataggio automatico più intelligente** — voti **lista** e **preferenze** digitati a tastiera si salvano dopo **4 secondi** dall’ultima modifica; con i pulsanti **+ / −** o uscendo dal campo il salvataggio è **immediato**. L’**affluenza** resta con salvataggio rapido (~mezzo secondo).
- **Collegamento live più robusto** — la vista live si **riconnette in automatico** dopo interruzioni di rete o quando il telefono torna attivo; un **avviso** indica se la riconnessione è in corso o se conviene ricaricare la pagina.

## Novità in v1.0.3

- **Panoramica live** — voti mostrati come `N / totale`, logo e nomi liste più leggibili.

## Novità in v1.0.2

- **Menu live allineato ai tab** — Panoramica, Liste, Sezioni, Coalizioni (solo se ≥2 liste hanno coalizione), Preferenze, Analisi; **Aggiornamenti** resta accessibile dal pulsante dedicato.
- **Preferenze unificate** — stessa esperienza del tab Preferenze anche da URL dedicato; trend con punto dell’anno in corso.
- **Coalizioni** — tab visibile solo quando ha senso (almeno due liste con campo coalizione compilato).

## Novità in v1.0.1

- **Ordine progressivo candidati** — in elezione attiva e nello storico.
- **Preferenze nello storico** — collegamento anagrafiche e candidati consiglio storici.

## Novità in v1.0.0

- **Backup e ripristino elezione** — dall’area admin di un’elezione puoi scaricare un file JSON completo (sezioni, liste, candidati, dati di spoglio) e ripristinarlo su un’elezione nuova o esistente, con conferma del nome per evitare errori.
- **Sessioni attive** — in admin vedi chi è loggato (ultima attività, browser, IP) e puoi **disconnettere** un utente; non puoi chiudere la tua sessione corrente da lì.
- **Cronologia aggiornamenti (live)** — vista **Aggiornamenti** nella live: storico di affluenza, voti lista e preferenze con data/ora e operatore.
- **Inserimento dati per l’admin** — l’amministratore accede allo spoglio anche dal menu (contesto elezione) e dalla scheda elezione, come gli operatori.
- **PWA e icona app** — icone PNG/SVG versionate in `public/icons/`, manifest e favicon; installabile su telefono con branding coerente.
- **Tema scuro** — campi e form in area admin più leggibili in modalità scura.
- **Stato sezioni** — indicatore di completamento corretto (affluenza a zero non conta come “mezzo pieno”; liste senza voti non gonfiano la percentuale).
- **Versione in footer** — in fondo alle pagine compare la versione (allineata a `package.json`).

---

## A cosa serve

- **Preparare un’elezione**: nome, comune, data, tipo di comune (per le regole di soglia e ballottaggio), numero di seggi in consiglio.
- **Definire sezioni elettorali** e, per ciascuna, dati utili (numero sezione, nome, luogo, aventi diritto al voto per sezione).
- **Definire le liste** in corsa, con colori, coalizioni, candidato sindaco e **candidati al consiglio** (con eventuali preferenze da registrare nello spoglio).
- **Raccogliere lo spoglio**: per ogni sezione si inseriscono affluenza (votanti, schede valide, nulle, bianche) e i **voti per lista** (e le preferenze ai candidati, se previste).
- **Vedere l’andamento**: la **vista live** mostra l’evoluzione dei risultati mentre arrivano i dati, con tab per analisi, preferenze e proiezioni.
- **Consultare elezioni passate**: è possibile tenere uno **storico** con risultati di elezioni già concluse, separato dalle elezioni “operative” del giorno del voto.

Il sistema calcola in automatico **percentuali**, **raggruppamenti per coalizione**, **distribuzione dei seggi** (metodo D’Hondt) e indicazioni legate alle **regole previste** per il tipo di comune (ad esempio soglia percentuale e possibile ballottaggio).

---

## Chi fa cosa: i tipi di utente

L’amministratore crea gli account collegati a un’elezione. Esistono **tre ruoli**:

| Ruolo | In sintesi |
|--------|------------|
| **Amministratore** | Configura elezioni, sezioni, liste, candidati e utenti. Accede all’area di gestione riservata agli amministratori. |
| **Inserimento dati** | Inserisce e aggiorna i dati di spoglio (affluenza e voti) **per le sezioni** dell’elezione a cui è abilitato. Può lavorare su tutte le liste di quella sezione: in fase di creazione utente si può opzionalmente **associare una lista** (utile per organizzazione o trasparenza), ma non limita da sola i campi modificabili nello spoglio. |
| **Solo visualizzazione** | Account pensato per chi deve **solo consultare** (vista live e home); **non** può inserire o modificare lo spoglio. |

Gli utenti “inserimento dati” sono legati a **un’elezione**; il sistema impedisce di accedere all’inserimento di un’altra elezione se non si è autorizzati.

### Accesso e limiti operativi

- **Login obbligatorio** su tutte le pagine e le API (eccetto login e logout): senza sessione valida si viene reindirizzati alla pagina di accesso.
- Ogni accesso crea una **sessione** tracciata sul server; il logout (o la revoca da admin) la invalida. Dopo un aggiornamento importante dell’app, gli utenti con sessioni molto vecchie potrebbero dover **rifare login** una volta.
- Ogni utente non amministratore è associato a **una sola elezione** alla volta.
- L’amministratore può **limitare le sezioni** modificabili da un operatore (solo le sezioni assegnate compaiono in inserimento dati; i tentativi su altre sezioni sono bloccati).
- L’**amministratore** gestisce tutti gli account (creazione, modifica, eliminazione) dall’area admin, anche quelli di altre elezioni, e da **Sessioni attive** può vedere chi è connesso e disconnetterlo.

---

## Pagine e funzioni principali (per l’utente)

- **Accesso (login)**  
  Ogni persona usa le proprie credenziali (nome utente e password) assegnate dall’amministratore.

- **Area amministrazione**  
  Creazione e modifica dell’elezione, sezioni, liste e candidati, gestione degli accessi, stato dell’elezione (es. preparazione, attiva, chiusa). Dalla scheda di un’elezione: **backup** (download JSON) e **ripristino** (upload con anteprima e conferma del nome). Menu globali: **Sessioni attive**, **Dati storici**, anagrafica persone.

- **Inserimento spoglio (entry)**  
  Elenco delle sezioni; entrando in una sezione si compilano affluenza e risultati per lista (e preferenze). I dati si **salvano in automatico** (affluenza subito; voti lista e preferenze da tastiera dopo circa 4 secondi, oppure subito con +/− o uscendo dal campo). Utilizzabile anche da telefono (PWA).

- **Vista live**  
  Pagina pensata per **seguire i risultati in aggiornamento** durante lo spoglio. Tab: panoramica, liste, sezioni, coalizioni (solo se almeno due liste hanno il campo coalizione), preferenze (solo se ci sono candidati al consiglio), **analisi** (seggi attuali, proiezione finale, confronto storico). **Aggiornamenti** (cronologia con operatore e orario) è un pulsante a destra dei tab, non un tab del menu. In caso di rete instabile o telefono in standby, il collegamento in tempo reale **tenta la riconnessione da solo**; se resta interrotto a lungo compare un avviso per ricaricare la pagina. Mostra anche avvisi di **coerenza dati** e lo stato di ogni sezione (da fare, in corso, completa). Gli URL legacy `/dashboard/...`, `/live/.../preferenze` e `/live/.../aggiornamenti` reindirizzano alla live con il tab o la vista corrispondente.

- **Storico (admin)**  
  Gestione di **elezioni storiche** in tabella dedicata: inserimento manuale, import da **Excel** o da link **Eligendo** (Ministero dell’Interno), modifica liste/candidati/preferenze. Si può anche applicare il macro Eligendo a un’**elezione archiviata** (dati operativi) e completarla da admin come un’elezione normale.

---

## Flusso tipico il giorno del voto

1. L’**amministratore** ha già creato l’elezione, sezioni, liste e utenti (o li completa in corsa se servono modifiche).
2. Gli operatori con ruolo **inserimento dati** entrano e caricano i dati **sezione per sezione**.
3. Chi segue l’esito usa la **vista live** (tab Analisi, Preferenze, ecc.).
4. A elezione conclusa, si può aggiornare lo **stato** dell’elezione e usare o aggiornare lo **storico** per consultazioni future.

---

## Note per chi installa o ospita il sistema

Per sviluppatori e sistemisti: il progetto è un’applicazione **Next.js 15** con **Prisma** e **PostgreSQL**. Interfaccia con componenti condivisi (pulsanti, card, avvisi, badge stato sezione) e palette **brand** per la navigazione; i colori delle liste restano quelli elettorali nei grafici e nello spoglio.

Comandi utili:

| Comando | Uso |
|---------|-----|
| `npm run dev` | Sviluppo locale |
| `npm run build` | Build di produzione (Prisma + Next.js; rigenera le icone in modo idempotente) |
| `npm run generate:icons` | Rigenera PNG e `icon.svg` in `public/icons/` da `src/lib/appIconSvg.ts` (solo se cambi il logo) |
| `npm run db:push` | Allinea lo schema al DB (sviluppo) |
| `npm run db:seed` | Popola dati di esempio (solo dev, dopo push schema) |
| `npm run db:reset` | Reset DB + seed (solo dev) |

In sviluppo serve un file `.env` con almeno `DATABASE_URL` e `JWT_SECRET`.

### PWA (installazione su telefono)

Il sito espone un **manifest** (`/manifest.webmanifest`), **icone già presenti nel repository** in `public/icons/` (32, 180, 192, 512 px + `icon.svg`) e `public/favicon.png`, più un **service worker** (`/sw.js`) per l’installazione come app su **Chrome/Android** e **“Aggiungi alla schermata Home”** su **Safari/iOS** (richiede **HTTPS** in produzione; in locale è ok su `http://localhost`). Nome app: **LosPollios**.

Per cambiare il logo esegui `npm run generate:icons` (legge la definizione in `src/lib/appIconSvg.ts` e aggiorna i file in `public/icons/`). Non serve rigenerarle a ogni deploy se non modifichi il branding.

Dopo il deploy, apri il sito dal telefono: dal menu del browser (Chrome: *Installa app* / *Aggiungi a schermata Home*; Safari: *Condividi* → *Aggiungi a Home*).

### Database server, concorrenza e “live”

- **Scritture/letture:** PostgreSQL gestisce bene più operatori che inseriscono sezioni in parallelo.
- **Tempo reale (SSE):** quando i risultati cambiano, l’app invia un evento tramite **`pg_notify`** sul canale `lospollios_election_sse`; ogni istanza Node che serve la vista live fa **`LISTEN`** sullo stesso database. Così le notifiche funzionano anche con **più repliche** dell’app dietro un load balancer, purché condividano lo **stesso Postgres**. Il payload NOTIFY ha un limite (~8 KB): aggiornamenti molto grandi potrebbero non essere propagati (caso raro in uso normale). Il client invia **ping** periodici e, su mobile, **riconnette** quando torna la rete o la scheda diventa di nuovo visibile.
- **Qualità dati:** l’API risultati segnala anomalie (sezione “con dati” solo con affluenza a zero, progresso voti distorto, ecc.) e la UI live le mostra in evidenza.

### Docker e Portainer

L’immagine **non contiene** un `JWT_SECRET` né altre chiavi: in container il secret di default del codice non è adatto alla produzione. **Devi impostare le variabili d’ambiente tu**, altrimenti le sessioni JWT restano deboli o incoerenti tra deploy.

Obbligatorio in produzione:

| Variabile | Ruolo |
|-----------|--------|
| **`JWT_SECRET`** | Chiave usata per firmare i cookie di sessione (login admin/operatori). Deve essere una stringa lunga e imprevedibile (es. 32+ caratteri casuali). **Impostala sempre** quando usi Docker. |

Già configurata nel `docker-compose.yml` (puoi sovrascriverle):

| Variabile | Default tipico |
|-----------|----------------|
| **`DATABASE_URL`** | Calcolata automaticamente in Compose verso il Postgres interno (`db`). Override opzionale con `APP_DATABASE_URL`. |
| **`ADMIN_USERNAME`** | `admin` — username creato automaticamente al primo avvio (se non esiste). |
| **`ADMIN_PASSWORD`** | `admin123` — password iniziale dell'admin; cambiala subito in produzione. |
| **`ADMIN_NAME`** | `Amministratore` — nome visualizzato per l'utente admin iniziale. |

**Primo avvio Docker:** l’entrypoint esegue `prisma migrate deploy` (con fallback a `db push` se il DB è legacy o alla prima installazione), applicando anche le migrazioni recenti (es. tabella **sessioni utente**). Poi crea automaticamente **solo l’utente admin iniziale** (se non esiste), senza dati demo di elezioni/liste/sezioni. A ogni **riavvio** del container le migrazioni pendenti vengono applicate automaticamente; non serve eseguirle a mano sul server.

**Come impostare `JWT_SECRET` con Docker Compose** (dalla cartella del progetto):

1. Esporta le variabili nella shell prima di avviare lo stack, oppure crea un file **`.env`** nella stessa directory del `docker-compose.yml` (Compose legge automaticamente `.env` e sostituisce `${...}`):

   ```bash
   POSTGRES_DB=lospollios
   POSTGRES_USER=lospollios
   POSTGRES_PASSWORD=metti-una-password-forte
   # Se omesso in Compose il default interno è lospollios_change_me — cambialo in produzione
   # opzionale: override completo DB app
   # APP_DATABASE_URL=postgresql://user:pass@host:5432/dbname?schema=public
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=cambia-questa-password
   ADMIN_NAME=Amministratore
   JWT_SECRET=incolla-qui-una-stringa-lunga-e-casuale
   ```

2. Avvio: `docker compose up -d --build` — l’interfaccia è sulla **porta 3522** (vedi sotto).

**Portainer (Stacks da Git):** nello stack, apri **Environment** e imposta almeno `POSTGRES_PASSWORD` e `JWT_SECRET` (opzionali `POSTGRES_USER` / `POSTGRES_DB`); il DB server parte nello stesso stack. Questo compose è configurato per **build locale dal repository** (`pull_policy: never` sull’app). In Portainer lascia disattivato “Pull latest image”. Porta esposta: **3522** (`3522:3000`).

Dopo `docker compose up`, apri **http://localhost:3522** (o `http://<host>:3522` sul server).

**Eseguire il container a mano:**

```bash
docker run -p 3522:3000 \
  -e DATABASE_URL='postgresql://user:pass@host:5432/dbname?schema=public' \
  -e JWT_SECRET='la-tua-chiave-segreta' \
  lospollios
```

Senza `-e DATABASE_URL=...` in Docker Compose viene usato il DB server Postgres preconfigurato nello stack; senza `-e JWT_SECRET=...` il processo parte ma non è una configurazione sicura per un ambiente esposto in rete. Se non imposti `ADMIN_*`, al primo avvio viene creato `admin / admin123`.

---

*LosPollios v1.0.4 — gestione spoglio elezioni amministrative online. Creato da Antonello Migliorelli.*
