import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AdminLayout, AgentLayout, PatientLayout } from './components/Layouts'

const Home = lazy(() => import('./pages/patient/Home'))
const Medications = lazy(() => import('./pages/patient/Medications'))
const MedicationDetail = lazy(() => import('./pages/patient/MedicationDetail'))
const Pharmacies = lazy(() => import('./pages/patient/Pharmacies'))
const PharmacyDetail = lazy(() => import('./pages/patient/PharmacyDetail'))
const Garde = lazy(() => import('./pages/patient/Garde'))
const PharmaMap = lazy(() => import('./pages/patient/PharmaMap'))
const PrescriptionUpload = lazy(() => import('./pages/patient/PrescriptionUpload'))
const Prescriptions = lazy(() => import('./pages/patient/Prescriptions'))
const PrescriptionDetail = lazy(() => import('./pages/patient/PrescriptionDetail'))
const Missions = lazy(() => import('./pages/patient/Missions'))
const MissionTracking = lazy(() => import('./pages/patient/MissionTracking'))
const Treatments = lazy(() => import('./pages/patient/Treatments'))
const History = lazy(() => import('./pages/patient/History'))
const Cmu = lazy(() => import('./pages/patient/Cmu'))
const Insurance = lazy(() => import('./pages/patient/Insurance'))
const News = lazy(() => import('./pages/patient/News'))
const NewsArticle = lazy(() => import('./pages/patient/NewsArticle'))
const Tips = lazy(() => import('./pages/patient/Tips'))
const Alerts = lazy(() => import('./pages/patient/Alerts'))
const Vigilance = lazy(() => import('./pages/patient/Vigilance'))
const Scan = lazy(() => import('./pages/patient/Scan'))
const Assistant = lazy(() => import('./pages/patient/Assistant'))
const Legal = lazy(() => import('./pages/patient/Legal'))
const Ordre = lazy(() => import('./pages/patient/Ordre'))
const HealthServices = lazy(() => import('./pages/patient/HealthServices'))
const Emergency = lazy(() => import('./pages/patient/Emergency'))
const Family = lazy(() => import('./pages/patient/Family'))
const Profile = lazy(() => import('./pages/patient/Profile'))
const Notifications = lazy(() => import('./pages/patient/Notifications'))
const NotFound = lazy(() => import('./pages/patient/NotFound'))

const AgentDashboard = lazy(() => import('./pages/agent/AgentDashboard'))
const AgentMissions = lazy(() => import('./pages/agent/AgentMissions'))
const AgentMission = lazy(() => import('./pages/agent/AgentMission'))
const AgentEarnings = lazy(() => import('./pages/agent/AgentEarnings'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminMissions = lazy(() => import('./pages/admin/AdminMissions'))
const AdminPrescriptions = lazy(() => import('./pages/admin/AdminPrescriptions'))
const AdminAgents = lazy(() => import('./pages/admin/AdminAgents'))
const AdminPharmacies = lazy(() => import('./pages/admin/AdminPharmacies'))
const AdminFraud = lazy(() => import('./pages/admin/AdminFraud'))
const AdminData = lazy(() => import('./pages/admin/AdminData'))
const AdminContent = lazy(() => import('./pages/admin/AdminContent'))
const AdminSecurity = lazy(() => import('./pages/admin/AdminSecurity'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="grid min-h-dvh place-items-center text-sm text-slate-400">Chargement…</div>}>
      <Routes>
        <Route element={<PatientLayout />}>
          <Route index element={<Home />} />
          <Route path="medicaments" element={<Medications />} />
          <Route path="medicaments/:id" element={<MedicationDetail />} />
          <Route path="pharmacies" element={<Pharmacies />} />
          <Route path="pharmacies/:id" element={<PharmacyDetail />} />
          <Route path="garde" element={<Garde />} />
          <Route path="carte" element={<PharmaMap />} />
          <Route path="ordonnance" element={<PrescriptionUpload />} />
          <Route path="ordonnances" element={<Prescriptions />} />
          <Route path="ordonnances/:id" element={<PrescriptionDetail />} />
          <Route path="missions" element={<Missions />} />
          <Route path="missions/:id" element={<MissionTracking />} />
          <Route path="traitements" element={<Treatments />} />
          <Route path="historique" element={<History />} />
          <Route path="cmu" element={<Cmu />} />
          <Route path="assurances" element={<Insurance />} />
          <Route path="actualites" element={<News />} />
          <Route path="actualites/:id" element={<NewsArticle />} />
          <Route path="conseils" element={<Tips />} />
          <Route path="alertes" element={<Alerts />} />
          <Route path="vigilance" element={<Vigilance />} />
          <Route path="scan" element={<Scan />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="reglementation" element={<Legal />} />
          <Route path="ordre" element={<Ordre />} />
          <Route path="sante" element={<HealthServices />} />
          <Route path="urgences" element={<Emergency />} />
          <Route path="famille" element={<Family />} />
          <Route path="profil" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="agent" element={<AgentLayout />}>
          <Route index element={<AgentDashboard />} />
          <Route path="missions" element={<AgentMissions />} />
          <Route path="missions/:id" element={<AgentMission />} />
          <Route path="revenus" element={<AgentEarnings />} />
        </Route>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="missions" element={<AdminMissions />} />
          <Route path="ordonnances" element={<AdminPrescriptions />} />
          <Route path="agents" element={<AdminAgents />} />
          <Route path="pharmacies" element={<AdminPharmacies />} />
          <Route path="fraude" element={<AdminFraud />} />
          <Route path="data" element={<AdminData />} />
          <Route path="contenus" element={<AdminContent />} />
          <Route path="securite" element={<AdminSecurity />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
