import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VisitorGuard } from "@/components/auth/VisitorGuard";
import QuickAccessPage from "./pages/QuickAccessPage";
import HomePage from "./pages/HomePage";
import SpecialtiesPage from "./pages/SpecialtiesPage";
import ProfessionalsPage from "./pages/ProfessionalsPage";
import BookingPage from "./pages/BookingPage";
import BookingSuccessPage from "./pages/BookingSuccessPage";
import MinhasConsultas from "./pages/MinhasConsultas";
import AuthPage from "./pages/AuthPage";
import SetupPage from "./pages/SetupPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAgenda from "./pages/admin/AdminAgenda";
import AdminPatients from "./pages/admin/AdminPatients";
import AdminServices from "./pages/admin/AdminServices";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminProfessionals from "./pages/admin/AdminProfessionals";
import ProfessionalDashboard from "./pages/admin/ProfessionalDashboard";
import FuncionarioDashboard from "./pages/funcionario/FuncionarioDashboard";
import FuncionarioAgenda from "./pages/funcionario/FuncionarioAgenda";
import FuncionarioFinanceiro from "./pages/funcionario/FuncionarioFinanceiro";
import FuncionarioDisponibilidade from "./pages/funcionario/FuncionarioDisponibilidade";
import FuncionarioPerfil from "./pages/funcionario/FuncionarioPerfil";
import FuncionarioPacientes from "./pages/funcionario/FuncionarioPacientes";
import FuncionarioConfiguracoes from "./pages/funcionario/FuncionarioConfiguracoes";
import ConfirmAppointment from "./pages/ConfirmAppointment";
import MeuPerfil from "./pages/MeuPerfil";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// App component with AuthProvider wrapping all routes
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Quick Access Gate - Initial screen for visitors */}
            <Route path="/" element={<QuickAccessPage />} />
            
            {/* Auth Routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/confirmar-presenca" element={<ConfirmAppointment />} />
            
            {/* Public Routes - Protected by VisitorGuard */}
            <Route path="/home" element={<VisitorGuard><HomePage /></VisitorGuard>} />
            <Route path="/especialidades" element={<VisitorGuard><SpecialtiesPage /></VisitorGuard>} />
            <Route path="/profissionais" element={<VisitorGuard><ProfessionalsPage /></VisitorGuard>} />
            <Route path="/agendar" element={<VisitorGuard><BookingPage /></VisitorGuard>} />
            <Route path="/agendamento-sucesso" element={<VisitorGuard><BookingSuccessPage /></VisitorGuard>} />
            <Route path="/minhas-consultas" element={<VisitorGuard><MinhasConsultas /></VisitorGuard>} />
            <Route path="/meu-perfil" element={<VisitorGuard><MeuPerfil /></VisitorGuard>} />
            
            {/* Admin Routes - Admin only */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/agenda"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAgenda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pacientes"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPatients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/servicos"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminServices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/funcionarios"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminProfessionals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/profissionais/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ProfessionalDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/relatorios"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/configuracoes"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/relatorios"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/configuracoes"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            
            {/* Funcionario Routes */}
            <Route
              path="/funcionario"
              element={
                <ProtectedRoute allowedRoles={['funcionario', 'admin']}>
                  <FuncionarioDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/funcionario/agenda"
              element={
                <ProtectedRoute allowedRoles={['funcionario', 'admin']}>
                  <FuncionarioAgenda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/funcionario/financeiro"
              element={
                <ProtectedRoute allowedRoles={['funcionario', 'admin']}>
                  <FuncionarioFinanceiro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/funcionario/disponibilidade"
              element={
                <ProtectedRoute allowedRoles={['funcionario', 'admin']}>
                  <FuncionarioDisponibilidade />
                </ProtectedRoute>
              }
            />
            <Route
              path="/funcionario/perfil"
              element={
                <ProtectedRoute allowedRoles={['funcionario', 'admin']}>
                  <FuncionarioPerfil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/funcionario/pacientes"
              element={
                <ProtectedRoute allowedRoles={['funcionario', 'admin']}>
                  <FuncionarioPacientes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/funcionario/configuracoes"
              element={
                <ProtectedRoute allowedRoles={['funcionario', 'admin']}>
                  <FuncionarioConfiguracoes />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
