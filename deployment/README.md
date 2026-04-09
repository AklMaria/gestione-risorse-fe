# Architettura di Deployment Kubernetes

Questa cartella contiene tutti i manifesti (YAML) necessari per il setup in ambiente Kubernetes ("Infrastructure as Code"). L'infrastruttura è stata modularizzata in 4 ambiti logici per il progetto *Gestione Risorse*.

Tutti i componenti sono configurati per girare sul namespace `group-10`.

## Struttura delle Cartelle

### 1. `infrastructure/`
Contiene la logica per la memorizzazione dei dati e per la comunicazione asincrona:
- **`secrets.yaml`**: Contiene sia `postgres-secrets` che `rabbitmq-secrets`, ovvero tutti i dati sensibili separati per ambito.
- **`catalogue-pvc.yaml`** e **`booking-pvc.yaml`**: I "Persistent Volume Claims" configurati sulla storage class `csi-cinder-fast` con 5Gi di spazio per i due database separati.
- **`catalogue-postgres-deployment.yaml`** / **`catalogue-postgres-service.yaml`**: Deployment ed esposizione del DBMS (PostgreSQL 16) per il catalogo, inclusivo di liveness e readiness probe.
- **`booking-postgres-deployment.yaml`** / **`booking-postgres-service.yaml`**: Deployment ed esposizione del DBMS (PostgreSQL 16) dedicato alle prenotazioni.
- **`rabbitmq-deployment.yaml`** / **`rabbitmq-service.yaml`**: Deployment del message broker `booking-rabbitmq`.

### 2. `catalogue-service/`
L'ambito dedicato al microservizio del catalogo.
- **`deployment.yaml`**: Container `docker.io/mariakll/catalogue-service:latest`. Viene configurato con tutte le env vars del caso (es. `SERVER_PORT`, credenziali esplose) recuperate dinamicamente ed include Liveness, Readiness e Startup probes alla porta 8081.
- **`service.yaml`**: Espone la logica di business internamente al cluster.

### 3. `booking-service/`
L'ambito dedicato al microservizio delle prenotazioni.
- **`deployment.yaml`**: Container `docker.io/mariakll/booking-service:latest`. Speculare al catalogo, ma configurato per puntare al suo database (`booking-postgres`) alla porta 8082. Connesso anch'esso a rabbitmq ed equipaggiato di health probes.
- **`service.yaml`**: Espone internamente le API REST sulla porta 8082.

### 4. `frontend/`
Il frontend in Angular e le regole di Gateway.
- **`frontend-deployment.yaml`**: Il web server (`docker.io/mariakll/gestione-risorse-fe:latest`) con le dovute probe configurate.
- **`frontend-service.yaml`**: Il Service che ascolta la porta 80.
- **`frontend-route.yaml`**: HTTPRoute della GatewayAPI, che intercetta il prefisso `/group-10`, fa l'URL Rewrite e redireziona in ingresso al frontend.

---

## Come Avviare il Deploy

L'ordine di esecuzione ideale (per garantire che i backend avviandosi non generino eccezioni, anche se le probe aiutano a gestire l'attesa) è il seguente:

```bash
# 1. Avvia le componenti core e aspetta che i pod siano in stato RUNNING
kubectl apply -f deployment/infrastructure/

# 2. Avvia i servizi backend
kubectl apply -f deployment/catalogue-service/
kubectl apply -f deployment/booking-service/

# 3. Metti online l'interfaccia utente web e abilita il routing
kubectl apply -f deployment/frontend/
```
