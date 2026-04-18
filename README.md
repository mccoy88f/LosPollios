# LosPollios

Applicazione web per **organizzare e seguire lo spoglio** delle **elezioni amministrative** (comunali): si inseriscono i dati sezione per sezione, si vedono i risultati aggiornati in tempo reale e le proiezioni (coalizioni, seggi, soglie).

Questa pagina spiega **cosa fa il sistema dal punto di vista di chi lo usa**, senza entrare nei dettagli tecnici.

---

## A cosa serve

- **Preparare un’elezione**: nome, comune, data, tipo di comune (per le regole di soglia e ballottaggio), numero di seggi in consiglio.
- **Definire sezioni elettorali** e, per ciascuna, dati utili (numero sezione, nome, luogo, elettori teorici).
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

---

*LosPollios — gestione spoglio elezioni amministrative online.*
