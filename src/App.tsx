import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SpecialtiesPage from "./pages/SpecialtiesPage";
import ProfessionalsPage from "./pages/ProfessionalsPage";
import BookingPage from "./pages/BookingPage";
import BookingSuccessPage from "./pages/BookingSuccessPage";
import MinhasConsultas from "./pages/MinhasConsultas";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAgenda from "./pages/admin/AdminAgenda";
import AdminPatients from "./pages/admin/AdminPatients";
import AdminServices from "./pages/admin/AdminServices";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminProfessionals from "./pages/admin/AdminProfessionals";
import ProfessionalDashboard from "./pages/admin/ProfessionalDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/especialidades" element={<SpecialtiesPage />} />
          <Route path="/profissionais" element={<ProfessionalsPage />} />
          <Route path="/agendar" element={<BookingPage />} />
          <Route path="/agendamento-sucesso" element={<BookingSuccessPage />} />
          <Route path="/minhas-consultas" element={<MinhasConsultas />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/agenda" element={<AdminAgenda />} />
          <Route path="/admin/pacientes" element={<AdminPatients />} />
          <Route path="/admin/servicos" element={<AdminServices />} />
          <Route path="/admin/profissionais" element={<AdminProfessionals />} />
          <Route path="/admin/profissionais/:id" element={<ProfessionalDashboard />} />
          <Route path="/admin/relatorios" element={<AdminReports />} />
          <Route path="/admin/configuracoes" element={<AdminSettings />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
