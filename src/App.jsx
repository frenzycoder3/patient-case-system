import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { PatientProvider } from './context/PatientContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { IconLeaf } from './components/icons'
import LanguageSwitcher from './components/LanguageSwitcher'
import LanguageSelect from './screens/LanguageSelect'
import VoiceIntro from './screens/VoiceIntro'
import ProtectedRoute from './components/ProtectedRoute'

import Welcome from './screens/Welcome'
import Consent from './screens/Consent'
import PatientDetails from './screens/PatientDetails'
import SymptomJourney from './screens/SymptomJourney'
import MedicalHistory from './screens/MedicalHistory'
import DocumentUpload from './screens/DocumentUpload'
import Review from './screens/Review'
import DoctorLogin from './screens/DoctorLogin'
import DoctorDashboard from './screens/DoctorDashboard'
import DoctorReportView from './screens/DoctorReportView'

function PatientHeader() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <header className="app-header print-hide">
      <div className="app-header__mark">
        <IconLeaf width={18} height={18} />
      </div>
      <div className="app-header__titles">
        <div className="app-header__title">{t('brand.title')}</div>
        <div className="app-header__subtitle">{t('brand.subtitle')}</div>
      </div>
      <LanguageSwitcher />
      {/* Dev reset button removed */}
      <button type="button" className="doctor-login-link doctor-login-link--header" onClick={() => navigate('/doctor/login')}>
        {t('welcome.doctorLink')}
      </button>
    </header>
  )
}

function DoctorHeader() {
  const { doctor, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/doctor/login')
  }

  return (
    <header className="app-header app-header--doctor print-hide">
      <div className="app-header__mark">
        <IconLeaf width={18} height={18} />
      </div>
      <div className="app-header__titles">
        <div className="app-header__title">Arogya Katha — Doctor Portal</div>
        <div className="app-header__subtitle">{doctor ? `${doctor.name} · ${doctor.role}` : 'Clinical Dashboard'}</div>
      </div>
      {doctor && (
        <button type="button" className="doctor-logout-btn" onClick={handleLogout}>
          Log out
        </button>
      )}
    </header>
  )
}

function AppShell() {
  const location = useLocation()
  const isDoctorRoute = location.pathname.startsWith('/doctor')
  const { hasStoredLanguage } = useLanguage()

  // Allow forcing first-run screens from the URL for testing in other browsers
  // Example: open http://localhost:5173/?resetFirstRun=1 to clear stored flags
    // removed URL-based reset: first-run state is intentionally not persisted

  // Keep the voice intro flag in-memory so a reload brings the user back
  // to the language selection and voice intro flow (per your request).
  const [voiceIntroDone, setVoiceIntroDone] = useState(false)

  // Gate the patient-facing app behind a one-time language choice,
  // followed by a one-time voice intro. The doctor portal skips both.
  if (!isDoctorRoute && !hasStoredLanguage) {
    return <LanguageSelect onDone={() => {}} />
  }

  if (!isDoctorRoute && !voiceIntroDone) {
    return <VoiceIntro onDone={() => setVoiceIntroDone(true)} />
  }

  return (
    <div className="app">
      {isDoctorRoute ? <DoctorHeader /> : <PatientHeader />}

      <main className="app-body">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/consent" element={<Consent />} />
          <Route path="/patient-details" element={<PatientDetails />} />
          <Route path="/symptom-journey" element={<SymptomJourney />} />
          <Route path="/medical-history" element={<MedicalHistory />} />
          <Route path="/documents" element={<DocumentUpload />} />
          <Route path="/review" element={<Review />} />

          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/report/:reportId"
            element={
              <ProtectedRoute>
                <DoctorReportView />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <PatientProvider>
          <HashRouter>
            <AppShell />
          </HashRouter>
        </PatientProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
