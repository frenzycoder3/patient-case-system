<<<<<<< HEAD
# My Health Story — Patient Case-Taking MVP

**SIH26047 · Ministry of AYUSH · Patient Case-Taking Software**

A 6-page frontend MVP that collects a patient's health story and turns it
into a visual **Patient Symptom Journey** the doctor can read in under a
minute. No backend, no AI — everything runs locally in the browser with
mock data, ready to be connected to a real API later.

---

## 1. The 6 pages

| # | Page | What it collects |
|---|------|-------------------|
| 1 | **Welcome** | Just a friendly start screen |
| 2 | **Patient Details** | Name, age, gender, phone |
| 3 | **Symptom Journey** *(the novelty page)* | Main complaint, start date, sudden/gradual, better/worse/same, severity 1–10, triggers, relief factors, patient's own words — **shown as a live visual timeline** |
| 4 | **Medical History + Medicine** | Previous diseases/surgeries/allergies, current medications, medicine response, daily-life impact |
| 5 | **Document Upload** | Old prescription/lab report upload (mock — no real file processing) |
| 6 | **Review + Doctor Summary** | All answers with Edit buttons, plus a printable doctor-ready summary with the timeline |

---

## 2. Folder structure

```
sih-mvp/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx                 Starting point of the app
    ├── App.jsx                  Sets up the 6 pages/routes
    ├── index.css                All styling
    ├── context/
    │   └── PatientContext.jsx   Stores every answer (shared "notebook")
    ├── utils/
    │   └── steps.js             List of the 4 data-collection pages
    ├── components/
    │   ├── icons.jsx             Simple icons (no external library)
    │   ├── ProgressBar.jsx       "Step X of Y" bar
    │   ├── ScreenShell.jsx       Wraps each page (title + Back/Next)
    │   ├── FormControls.jsx      Choice buttons, severity scale, checklists...
    │   └── Timeline.jsx          Builds + renders the symptom timeline
    └── screens/
        ├── Welcome.jsx
        ├── PatientDetails.jsx
        ├── SymptomJourney.jsx
        ├── MedicalHistory.jsx
        ├── DocumentUpload.jsx
        └── Review.jsx
```

---

## 3. Exact steps to run it

You need **Node.js 18+** installed. Check with:

```
node -v
```

If you don't have it, get it from https://nodejs.org first.

Then, inside the `sih-mvp` folder:

```
npm install
npm run dev
```

`npm install` downloads React and the other libraries listed in
`package.json` (only needed once). `npm run dev` starts a local server —
it will open automatically at `http://localhost:5173`. Any file you edit
refreshes the page automatically.

To create an optimized build you could host anywhere:

```
npm run build
```

This creates a `dist/` folder. Preview it with `npm run preview`.

---

## 4. How it works (plain English)

- **`PatientContext.jsx`** is a shared notebook: every page writes its
  answers there, and the Review page reads everything back out — no need
  to pass data manually between pages.
- **`ScreenShell.jsx`** is the picture frame each of the 4 form pages sits
  inside — it draws the progress bar, title, and Back/Next buttons, and
  only moves forward once required fields are filled in.
- **`Timeline.jsx`** is the heart of the "novelty" feature. The function
  `buildTimelineEvents()` reads the Symptom Journey + Medicine answers and
  turns them into a short list of events (e.g. "Symptom started" →
  "Symptoms became worse" → "Medicine taken" → "Current condition"). The
  `<Timeline>` component then draws that list as a connected vertical
  timeline with dots and a line — this rebuilds itself live as the
  patient answers questions on the Symptom Journey page.
- **Document Upload** only records a file's name and type, and shows it as
  "Uploaded" — no OCR or AI runs here, exactly as requested.
- **Review + Doctor Summary** is one page: the top half shows editable
  review cards, and the bottom half is a clean, printable doctor summary
  (the "Print / Save as PDF" button uses the browser's built-in print
  dialog — no extra library needed).

---

## 5. What's mocked (not real yet)

- **"Speak instead of typing" buttons** simulate a 1.5-second recording
  and then fill in placeholder text — no real speech-to-text is wired up.
- **Document upload** stores only the file's name/type in memory — files
  themselves are not uploaded anywhere, and no OCR/AI extraction runs.
- **All data lives only in the browser tab** (`PatientContext.jsx`) and is
  lost on refresh — there is no backend or database yet.

These are natural next steps once a FastAPI backend is added: a real
speech-to-text endpoint, a file-upload endpoint (`multipart/form-data`),
and a `POST /api/patient-cases` endpoint that accepts the same JSON shape
already used by `PatientContext.jsx`.

---

## 6. Important note on medical safety

This app only **collects, organizes, and presents** patient information.
It never diagnoses, never recommends medicine, and never replaces a
doctor's judgment — the Doctor Summary says this explicitly.
=======
# patient-case-system
>>>>>>> 90c7a03b3ccb10b5cd06be1040c67676dd411908
