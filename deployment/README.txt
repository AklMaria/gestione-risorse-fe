# Manifest Kubernetes ordinati per cartelle

Ordine consigliato di apply:

1. 00-secrets/
2. 01-storage/
3. 02-databases/
4. 03-messaging/
5. 04-backend/
6. 05-frontend/
7. 06-routing/

Esempio:

kubectl apply -f 00-secrets/
kubectl apply -f 01-storage/
kubectl apply -f 02-databases/
kubectl apply -f 03-messaging/
kubectl apply -f 04-backend/
kubectl apply -f 05-frontend/
kubectl apply -f 06-routing/
