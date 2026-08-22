import { createBrowserRouter } from "react-router";

// Home page
import HomePage from "./components/home/HomePage";

// Auth pages
import PatientLogin from "./components/auth/PatientLogin";
import DoctorLogin from "./components/auth/DoctorLogin";
import AdminLogin from "./components/auth/AdminLogin";
import Register from "./components/auth/Register";

// Layouts
import AdminLayout from "./components/layout/AdminLayout";
import DoctorLayout from "./components/layout/DoctorLayout";
import PatientLayout from "./components/layout/PatientLayout";

// Patient pages
import PatientHome from "./components/patient/PatientHome";
import BookDoctors from "./components/patient/BookDoctors";
import BookSlot from "./components/patient/BookSlot";
import QueueTracker from "./components/patient/QueueTracker";
import PatientAppointments from "./components/patient/PatientAppointments";
import PrescriptionHistory from "./components/patient/PrescriptionHistory";
import PatientProfile from "./components/patient/PatientProfile";

// Doctor pages
import DoctorQueue from "./components/doctor/DoctorQueue";
import EMRWorksheet from "./components/doctor/EMRWorksheet";
import DoctorCalendar from "./components/doctor/DoctorCalendar";
import DoctorAnalytics from "./components/doctor/DoctorAnalytics";
import DoctorProfile from "./components/doctor/DoctorProfile";

// Admin pages
import AdminDashboard from "./components/admin/AdminDashboard";
import TokenQueuePanel from "./components/admin/TokenQueuePanel";
import WalkIn from "./components/admin/WalkIn";
import AdminAppointments from "./components/admin/AdminAppointments";
import PatientsManagement from "./components/admin/PatientsManagement";
import DoctorsManagement from "./components/admin/DoctorsManagement";
import ScheduleManagement from "./components/admin/ScheduleManagement";
import Billing from "./components/admin/Billing";
import Reports from "./components/admin/Reports";
import AuditLog from "./components/admin/AuditLog";
import ClinicSettings from "./components/admin/ClinicSettings";

export const router = createBrowserRouter([
  // Home page
  { path: "/", Component: HomePage },

  // Auth routes
  { path: "/auth/patient", Component: PatientLogin },
  { path: "/login", Component: PatientLogin },
  { path: "/auth/doctor", Component: DoctorLogin },
  { path: "/auth/admin", Component: AdminLogin },
  { path: "/auth/register", Component: Register },

  // Public booking
  { path: "/book", Component: BookDoctors },
  { path: "/book/:doctorId", Component: BookSlot },

  // Patient portal
  {
    path: "/patient",
    Component: PatientLayout,
    children: [
      { index: true, Component: PatientHome },
      { path: "appointments", Component: PatientAppointments },
      { path: "queue", Component: QueueTracker },
      { path: "history", Component: PrescriptionHistory },
      { path: "profile", Component: PatientProfile },
    ],
  },

  // Doctor portal
  {
    path: "/doctor",
    Component: DoctorLayout,
    children: [
      { index: true, Component: DoctorQueue },
      { path: "consult/:visitId", Component: EMRWorksheet },
      { path: "calendar", Component: DoctorCalendar },
      { path: "analytics", Component: DoctorAnalytics },
      { path: "profile", Component: DoctorProfile },
    ],
  },

  // Admin portal
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "queue", Component: TokenQueuePanel },
      { path: "walkin", Component: WalkIn },
      { path: "appointments", Component: AdminAppointments },
      { path: "patients", Component: PatientsManagement },
      { path: "doctors", Component: DoctorsManagement },
      { path: "schedule", Component: ScheduleManagement },
      { path: "billing", Component: Billing },
      { path: "reports", Component: Reports },
      { path: "audit", Component: AuditLog },
      { path: "settings", Component: ClinicSettings },
    ],
  },
]);
