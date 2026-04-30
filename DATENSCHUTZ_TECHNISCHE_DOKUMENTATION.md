# Explorado Academy – Technische Datenschutz-Dokumentation

**Zweck dieses Dokuments:** Übersicht aller personenbezogenen Daten, die die Software erhebt, speichert und verarbeitet – als Grundlage für Impressum und Datenschutzerklärung.

**Stand:** 19.03.2026

---

## 1. Systemübersicht

Explorado Academy ist eine interne Weiterbildungsplattform (Learning Management System) für Mitarbeiter. Die Anwendung läuft als Single-Page-Application (React/Vite) im Browser und nutzt **Supabase** als Backend (Datenbank, Auth, Storage, Edge Functions).

**Hosting & Infrastruktur:**
- Frontend: Statische Web-App, gehostet auf Edutain-Server (academy.edutain.de), FTP-Deployment
- Backend: Supabase (Frankfurt)
- Datenbank: PostgreSQL (verwaltet durch Supabase)
- E-Mail-Versand: Resend (resend.com)

---

## 2. Erhobene personenbezogene Daten

### 2.1 Authentifizierung & Benutzerkonto

| Datum | Quelle | Pflichtfeld | Zweck |
|-------|--------|-------------|-------|
| E-Mail-Adresse | Registrierung / Admin-Einladung | Ja | Login, Kommunikation |
| Passwort (gehasht) | Registrierung | Ja | Authentifizierung |
| Vollständiger Name | Registrierung / Admin-Einladung | Ja | Anzeige, Zertifikate |

**Anmeldeverfahren:** E-Mail + Passwort über Supabase Auth. Kein OAuth, kein Social Login, keine Zwei-Faktor-Authentifizierung.

**Einladungsverfahren:** Admins laden Nutzer per E-Mail ein. Dabei wird ein temporäres Passwort erstellt und ein Passwort-Reset-Link per E-Mail versendet.

### 2.2 Profildaten (Tabelle: `profiles`)

| Datum | Quelle | Pflichtfeld | Zweck |
|-------|--------|-------------|-------|
| Vollständiger Name | Registrierung / Admin | Ja | Identifikation |
| E-Mail-Adresse | Registrierung / Admin | Ja | Kontakt, Login |
| Abteilung | Admin-Eingabe | Nein | Organisationsstruktur, Reporting |
| Jobtitel | Admin-Eingabe | Nein | Kontext |
| Avatar-URL | Profilfeld (aktuell nicht aktiv genutzt) | Nein | Profilbild |
| Erstellt am / Aktualisiert am | System | Automatisch | Verwaltung |

### 2.3 Nutzungsdaten (Lernfortschritt)

| Datum | Tabelle | Zweck |
|-------|---------|-------|
| Kurseinschreibungen (User-ID, Kurs-ID, Datum) | `enrollments` | Zuordnung Nutzer → Kurs |
| Lektionsfortschritt (User-ID, Lektion-ID, abgeschlossen ja/nein, Datum) | `lesson_progress` | Fortschrittsverfolgung |
| Zertifikate (User-ID, Kurs-ID, Ausstellungsdatum, Zertifikatsnummer) | `certificates` | Nachweis Kursabschluss |
| Kursbestätigungen (User-ID, Kurs-ID, Bestätigungsdatum) | `course_acknowledgements` | Nachweis Kenntnisnahme |

### 2.4 Benutzerrollen (Tabelle: `user_roles`)

| Datum | Zweck |
|-------|-------|
| User-ID + Rolle (admin/employee) | Zugriffssteuerung |

---

## 3. Datenspeicherung

### 3.1 Datenbank (Supabase PostgreSQL)

Alle oben genannten Daten werden in einer PostgreSQL-Datenbank bei Supabase gespeichert. Row-Level Security (RLS) ist auf allen Tabellen aktiviert:

- **Mitarbeiter** sehen nur eigene Profil-, Fortschritts- und Zertifikatsdaten
- **Admins** haben Lesezugriff auf alle Nutzerdaten und Schreibzugriff auf Verwaltungsdaten

### 3.2 Datei-Speicherung (Supabase Storage)

| Bucket | Inhalt | Zugriff | Personenbezug |
|--------|--------|---------|---------------|
| `certificates` | Zertifikat-PDF-Vorlagen | Admins hochladen, authentifizierte Nutzer lesen | Kein direkter – Name wird erst client-seitig eingefügt |
| `course-media` | Kursvideos und -bilder | Öffentlich lesbar, Admins verwalten | Keiner |
| `course_files` | Kursmaterialien zum Download | Authentifizierte Nutzer lesen, Admins verwalten | Keiner |

**Hinweis zur Zertifikatsgenerierung:** Die personalisierte PDF-Erstellung (Name auf Zertifikat) erfolgt **client-seitig** im Browser mittels `pdf-lib`. Es werden keine personalisierten PDFs serverseitig gespeichert.

### 3.3 Browser-Speicherung (localStorage)

| Datum | Zweck | Lebensdauer |
|-------|-------|-------------|
| Supabase Session-Token | Authentifizierung | Bis Logout / Token-Ablauf |
| Access-Token & Refresh-Token | API-Zugriff | Auto-Refresh, bis Logout |

**Keine Cookies** werden von der Anwendung selbst gesetzt (Supabase Auth nutzt localStorage, nicht Cookies).

---

## 4. Drittanbieter / Auftragsverarbeiter

### 4.1 Supabase

- **Dienst:** Datenbank, Authentifizierung, Datei-Speicherung, Serverless Functions
- **Datenübermittlung:** Alle Nutzerdaten (Profil, Fortschritt, Auth)
- **Standort/Region:** (Bitte prüfen – Supabase-Projekt-Region)
- **Relevanz:** Auftragsverarbeitungsvertrag (AVV) erforderlich
- **Website:** supabase.com

### 4.2 Resend

- **Dienst:** E-Mail-Versand (transaktionale E-Mails)
- **Datenübermittlung:** E-Mail-Adresse, Name des Empfängers, E-Mail-Inhalte (Kursnamen, Links)
- **Anlässe:** Einladungs-E-Mails, Erinnerungen an Kursabschluss, Abschlussbestätigungen, benutzerdefinierte Admin-E-Mails
- **Hinweis:** In der Admin-Oberfläche wird angezeigt: _"E-Mails unverschlüsselt gesendet. Vermeiden Sie das Versenden hochsensibler Personaldaten."_
- **Relevanz:** Auftragsverarbeitungsvertrag (AVV) erforderlich
- **Website:** resend.com

### 4.3 Nicht vorhanden

Folgende Dienste werden **nicht** genutzt:
- Keine Analyse-/Tracking-Tools (kein Google Analytics, Plausible, Hotjar etc.)
- Keine Zahlungsanbieter (kein Stripe, PayPal etc.)
- Kein Social Login (kein Google, Microsoft, GitHub OAuth)
- Kein CDN mit Tracking
- Keine Werbedienste

---

## 5. Datenflüsse

### 5.1 Nutzerregistrierung (Admin-Einladung)
1. Admin gibt E-Mail, Name, Abteilung, Jobtitel ein
2. Supabase Edge Function erstellt Auth-Account mit temporärem Passwort
3. Profil wird in `profiles`-Tabelle angelegt
4. Einladungs-E-Mail mit Passwort-Reset-Link wird über Resend versendet
5. Nutzer setzt eigenes Passwort über den Link

### 5.2 Lernbetrieb
1. Nutzer loggt sich ein → Session-Token in localStorage
2. Nutzer schreibt sich in Kurse ein → `enrollments`-Tabelle
3. Lektionsfortschritt wird gespeichert → `lesson_progress`-Tabelle
4. Bei Kursabschluss: Zertifikat wird in `certificates`-Tabelle eingetragen
5. PDF-Zertifikat wird client-seitig generiert und heruntergeladen

### 5.3 Admin-E-Mail-Versand
1. Admin wählt Empfänger (alle oder bestimmte Mitarbeiter)
2. Admin verfasst Betreff und Text
3. E-Mail wird über Supabase Edge Function an Resend-API gesendet
4. Resend stellt E-Mail zu

### 5.4 CSV-Export (Admin)
- Admins können Mitarbeiterdaten als CSV exportieren
- Enthält: Name, E-Mail, Abteilung, Trainingsfortschritt, Beitrittsdatum
- Export erfolgt client-seitig (Datei wird im Browser generiert)

---

## 6. Datenlöschung

### 6.1 Benutzerlöschung
- Admins können Benutzer löschen (Supabase Edge Function `delete-user`)
- Löschung des Auth-Accounts und **kaskadierendes Löschen** aller verknüpften Daten:
  - Profil
  - Rollenzuweisung
  - Einschreibungen
  - Lektionsfortschritt
  - Zertifikate
  - Kursbestätigungen

### 6.2 Nicht implementiert
- **Kein Selbstlöschungs-Feature** für Nutzer (nur durch Admin möglich)
- **Kein Datenexport-Feature** (Art. 20 DSGVO – Recht auf Datenübertragbarkeit) – Export nur durch Admin als CSV
- **Keine automatische Datenlöschung** nach Zeitablauf (keine Aufbewahrungsfristen konfiguriert)

---

## 7. Serverseitiges Logging

In den Supabase Edge Functions werden folgende Informationen geloggt:

| Funktion | Geloggte Daten |
|----------|---------------|
| `invite-user` | E-Mail-Adresse und Name des eingeladenen Nutzers, Fehlermeldungen |
| `send-email` | Request-Daten, Resend-API-Antworten |
| `delete-user` | (keine expliziten personenbezogenen Logs) |

**Hinweis:** Supabase loggt standardmäßig Datenbankabfragen und API-Aufrufe. Die Aufbewahrungsdauer dieser Logs richtet sich nach dem Supabase-Plan.

---

## 8. Sicherheitsmaßnahmen

| Maßnahme | Status |
|----------|--------|
| Passwort-Hashing | Ja (Supabase Auth, bcrypt) |
| Row-Level Security (RLS) | Ja, auf allen Tabellen |
| HTTPS/TLS | Ja (Supabase erzwingt TLS) |
| Rollenbasierte Zugriffskontrolle | Ja (Admin/Employee) |
| Session-Token-Verwaltung | Auto-Refresh, localStorage |
| CORS | Supabase-Standard |

---

## 9. Offene Punkte / Handlungsbedarf für Compliance

| Thema | Status | Handlungsbedarf |
|-------|--------|-----------------|
| AVV mit Supabase | Offen | Auftragsverarbeitungsvertrag abschließen |
| AVV mit Resend | Offen | Auftragsverarbeitungsvertrag abschließen |
| Supabase-Region (EU?) | Prüfen | Sicherstellen, dass Daten in EU/EWR verarbeitet werden |
| Resend Serverstandort | Prüfen | Datenverarbeitung außerhalb EU? → Standardvertragsklauseln? |
| Recht auf Datenübertragbarkeit | Nicht implementiert | Nutzer-Datenexport-Feature erwägen |
| Recht auf Selbstlöschung | Nicht implementiert | Nutzer-Selbstlöschung erwägen |
| Aufbewahrungsfristen | Nicht definiert | Löschfristen für Nutzungsdaten definieren |
| Einwilligungserklärung | Nicht implementiert | Datenschutzeinwilligung bei Registrierung/Einladung |
| Datenschutzerklärung | Nicht vorhanden | Muss erstellt und verlinkt werden |
| Impressum | Nicht vorhanden | Muss erstellt und verlinkt werden |
| Cookie-Banner | Nicht nötig | Keine Cookies im Einsatz (nur localStorage für Session) |
| Hosting-Anbieter Frontend | Dokumentieren | Für Impressum/Datenschutzerklärung relevant |
