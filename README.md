# LosPollios

Applicazione web per **organizzare e seguire lo spoglio** delle **elezioni amministrative** (comunali): si inseriscono i dati sezione per sezione, si vedono i risultati aggiornati in tempo reale e le proiezioni (coalizioni, seggi, soglie).

Questa pagina spiega **cosa fa il sistema dal punto di vista di chi lo usa**, senza entrare nei dettagli tecnici.

---

## A cosa serve

- **Preparare un’elezione**: nome, comune, data, tipo di comune (per le regole di soglia e ballottaggio), numero di seggi in consiglio.
- **Definire sezioni elettorali** e, per ciascuna, dati utili (numero sezione, nome, luogo, aventi diritto al voto per sezione).
- **Definire le liste** in corsa, con colori, coalizioni, candidato sindaco e **candidati al consiglio** (con eventuali preferenze da registrare nello spoglio).
- **Raccogliere lo spoglio**: per ogni sezione si inseriscono affluenza (votanti, schede valide, nulle, bianche) e i **voti per lista** (e le preferenze ai candidati, se previste).
- **Vedere l’andamento**: una vista “live” mostra l’evoluzione dei risultati mentre arrivano i dati; una **dashboard di analisi** aiuta a leggere aggregati e proiezioni.
- **Consultare elezioni passate**: è possibile tenere uno **storico** con risultati di elezioni già concluse, separato dalle elezioni “operative” del giorno del voto.

Il sistema calcola in automatico **percentuali**, **raggruppamenti per coalizione**, **distribuzione dei seggi** (metodo D’Hondt) e indicazioni legate alle **regole previste** per il tipo di comune (ad esempio soglia percentuale e possibile ballottaggio).

---

## Chi fa cosa: i tipi di utente

L’amministratore crea gli account collegati a un’elezione. Esistono **tre ruoli**:

| Ruolo | In sintesi |
|--------|------------|
| **Amministratore** | Configura elezioni, sezioni, liste, candidati e utenti. Accede all’area di gestione riservata agli amministratori. |
| **Inserimento dati** | Inserisce e aggiorna i dati di spoglio (affluenza e voti) **per le sezioni** dell’elezione a cui è abilitato. Può lavorare su tutte le liste di quella sezione: in fase di creazione utente si può opzionalmente **associare una lista** (utile per organizzazione o trasparenza), ma non limita da sola i campi modificabili nello spoglio. |
| **Solo visualizzazione** | Account pensato per chi deve **solo consultare**; **non** può usare le schermate di inserimento dati. |

Gli utenti “inserimento dati” sono legati a **un’elezione**; il sistema impedisce di accedere all’inserimento di un’altra elezione se non si è autorizzati.

---

## Pagine e funzioni principali (per l’utente)

- **Accesso (login)**  
  Ogni persona usa le proprie credenziali (nome utente e password) assegnate dall’amministratore.

- **Area amministrazione**  
  Creazione e modifica dell’elezione, sezioni, liste e candidati, gestione degli accessi, stato dell’elezione (es. preparazione, attiva, chiusa).

- **Inserimento spoglio (entry)**  
  Elenco delle sezioni; entrando in una sezione si compilano affluenza e risultati per lista (e preferenze). I dati possono essere aggiornati man mano che si ricevono nuove comunicazioni dai seggi.

- **Vista live**  
  Pagina pensata per **seguire i risultati in aggiornamento** durante lo spoglio (pubblica o semi-pubblica, a seconda di come viene diffuso il link).

- **Dashboard analisi**  
  Visione più analitica di risultati aggregati e proiezioni utili a chi coordina o commenta l’esito.

- **Storico**  
  Consultazione di **elezioni archiviate** con i relativi risultati, senza mescolarle con l’elezione corrente.

---

## Flusso tipico il giorno del voto

1. L’**amministratore** ha già creato l’elezione, sezioni, liste e utenti (o li completa in corsa se servono modifiche).
2. Gli operatori con ruolo **inserimento dati** entrano e caricano i dati **sezione per sezione**.
3. Chi segue l’esito usa la **vista live** e, se serve, la **dashboard**.
4. A elezione conclusa, si può aggiornare lo **stato** dell’elezione e usare o aggiornare lo **storico** per consultazioni future.

---

## Note per chi installa o ospita il sistema

Per sviluppatori e sistemisti: il progetto è un’applicazione **Next.js** con database **SQLite** tramite **Prisma**. Per avviare in ambiente di sviluppo servono Node.js, dipendenze installate (`npm install`), file `.env` con `DATABASE_URL` e `JWT_SECRET` adeguato in produzione. Comandi utili: `npm run dev` (sviluppo), `npm run build` (build), script `db:*` per database e seed di prova.

### PWA (installazione su telefono)

Il sito espone un **manifest** (`/manifest.webmanifest`), icone **192/512** e un **service worker** (`/sw.js`) per soddisfare i criteri di installazione come app su **Chrome/Android** e migliorare **“Aggiungi alla schermata Home”** su **Safari/iOS** (richiede **HTTPS** in produzione; in locale è ok su `http://localhost`).

Dopo il deploy, apri il sito dal telefono: dal menu del browser (Chrome: *Installa app* / *Aggiungi a schermata Home*; Safari: *Condividi* → *Aggiungi a Home*).

### SQLite, molti scrutatori e “live”

- **Scritture:** SQLite consente **una scrittura alla volta** sul file; le altre si accodano. Ogni salvataggio sezione è una **transazione** breve (affluenza + voti per lista). Con decine di scrutatori su **sezioni diverse** è in genere accettabile; picchi simultanei possono introdurre **attese brevi** (mitigate con `busy_timeout` e modalità **WAL**, impostate all’avvio del server).
- **Letture:** con **WAL** le letture (dashboard, live) possono procedere in parallelo alle scritture molto meglio che col journal classico.
- **Tempo reale:** gli aggiornamenti alla vista live usano **SSE in memoria sullo stesso processo Node**. Con **un solo** container/istanza va bene; con **più repliche** Docker ogni istanza ha memoria separata: servirebbe un bus condiviso (es. Redis) per notifiche cross-istanza — scenario da pianificare solo se replichi l’app.

### Docker e Portainer

L’immagine **non contiene** un `JWT_SECRET` né altre chiavi: in container il secret di default del codice non è adatto alla produzione. **Devi impostare le variabili d’ambiente tu**, altrimenti le sessioni JWT restano deboli o incoerenti tra deploy.

Obbligatorio in produzione:

| Variabile | Ruolo |
|-----------|--------|
| **`JWT_SECRET`** | Chiave usata per firmare i cookie di sessione (login admin/operatori). Deve essere una stringa lunga e imprevedibile (es. 32+ caratteri casuali). **Impostala sempre** quando usi Docker. |

Già configurata nel `docker-compose.yml` (puoi sovrascriverle):

| Variabile | Default tipico |
|-----------|----------------|
| **`DATABASE_URL`** | `file:/data/lospollios.db` — database SQLite sul volume Docker `lospollios-data` montato in `/data`. |

**Come impostare `JWT_SECRET` con Docker Compose** (dalla cartella del progetto):

1. Esporta la variabile nella shell prima di avviare lo stack, oppure crea un file **`.env`** nella stessa directory del `docker-compose.yml` (Compose legge automaticamente `.env` e sostituisce `${JWT_SECRET}`):

   ```bash
   JWT_SECRET=incolla-qui-una-stringa-lunga-e-casuale
   ```

2. Avvio: `docker compose up -d --build` — l’interfaccia è sulla **porta 3522** (vedi sotto).

**Portainer (Stacks):** nello stack, apri **Environment** e aggiungi `JWT_SECRET` con un valore generato (non lasciare vuoto). Il `docker-compose.yml` del repo espone l’app sulla **porta esterna standard 3522** (`3522:3000`). Puoi cambiarla nello stack se serve. Il volume `lospollios-data` mantiene il file SQLite tra i riavvii.

Dopo `docker compose up`, apri **http://localhost:3522** (o `http://<host>:3522` sul server).

**Eseguire il container a mano:**

```bash
docker run -p 3522:3000 -e JWT_SECRET='la-tua-chiave-segreta' -v lospollios-data:/data lospollios
```

Senza `-e JWT_SECRET=...` il processo parte comunque, ma **non** è una configurazione sicura per un ambiente esposto in rete.

---

*LosPollios — gestione spoglio elezioni amministrative online.*
