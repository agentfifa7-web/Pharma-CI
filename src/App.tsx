import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AdminLayout, AgentLayout, PatientLayout } from './components/Layouts'

import Home from './pages/patient/Home'
import Medications from './pages/patient/Medications'
import MedicationDetail from './pages/patient/MedicationDetail'
import Pharmacies from './pages/patient/Pharmacies'
import PharmacyDetail from './pages/patient/PharmacyDetail'
import Garde from './pages/patient/Garde'
import PharmaMap from './pages/patient/PharmaMap'
import PrescriptionUpload from './pages/patient/PrescriptionUpload'
import Prescriptions from './pages/patient/Prescriptions'
import PrescriptionDetail from './pages/patient/PrescriptionDetail'
import Missions from './pages/patient/Missions'
import MissionTracking from './pages/patient/MissionTracking'
import Treatments from './pages/patient/Treatments'
import History from './pages/patient/History'
import Cmu from './pages/patient/Cmu'
import Insurance from './pages/patient/Insurance'
import News from './pages/patient/News'
import NewsArticle from './pages/patient/NewsArticle'
import Tips from './pages/patient/Tips'
import Alerts from './pages/patient/Alerts'
import Vigilance from './pages/patient/Vigilance'
import Scan from './pages/patient/Scan'
import Assistant from './pages/patient/Assistant'
import Legal from './pages/patient/Legal'
import Ordre from './pages/patient/Ordre'
import HealthServices from './pages/patient/HealthServices'
import Emergency from './pages/patient/Emergency'
import Family from './pages/patient/Family'
import Profile from './pages/patient/Profile'
import Notifications from './pages/patient/Notifications'
import NotFound from './pages/patient/NotFound'

import AgentDashboard from './pages/agent/AgentDashboard'
import AgentMissions from './pages/agent/AgentMissions'
import AgentMission from './pages/agent/AgentMission'
import AgentEarnings from './pages/agent/AgentEarnings'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMissions from './pages/admin/AdminMissions'
import AdminPrescriptions from './pages/admin/AdminPrescriptions'
import AdminAgents from './pages/admin/AdminAgents'
import AdminPharmacies from './pages/admin/AdminPharmacies'
import AdminFraud from './pages/admin/AdminFraud'
import AdminData from './pages/admin/AdminData'
import AdminContent from './pages/admin/AdminContent'
import AdminSecurity from './pages/admin/AdminSecurity'

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
