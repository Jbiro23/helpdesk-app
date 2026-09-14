# Helpdesk aplikacija s integriranom umjetnom inteligencijom

Praktični dio završnog rada, FOI Varaždin, 2026.
Autor: Jan Biro
Mentor: Prof. dr. sc. Dragutin Kermek

## Tehnologije
Node.js, Express, MySQL, JavaScript, Bootstrap 5.3, OpenAI API

## Pokretanje

1. Instalirati ovisnosti:
   npm install

2. Napraviti bazu podataka i učitati shemu iz db/schema.sql

3. Napraviti datoteku .env u korijenu projekta sa sljedećim varijablama:
   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
   JWT_SECRET
   OPENAI_API_KEY

4. Pokrenuti poslužitelj:
   npm start

Aplikacija je dostupna na http://localhost:3000

## Testna verzija
Aplikacija je postavljena na Railway i dostupna na:
https://helpdesk-app-production-2a72.up.railway.app

## Struktura projekta
- server.js — ulazna točka poslužitelja
- config/ — veza s bazom, OpenAI klijent, servis umjetne inteligencije
- middleware/ — provjera tokena i uloge
- routes/ — krajnje točke za autentikaciju, ulaznice i bazu znanja
- public/ — klijentski dio (HTML, CSS, JavaScript)
- db/schema.sql — definicija tablica
