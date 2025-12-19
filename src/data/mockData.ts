// Mock data for the clinic management system

export interface Specialty {
  id: string;
  name: string;
  description: string;
  icon: string;
  duration: number; // in minutes
  price: number;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  specialtyId: string;
  avatar: string;
  crm: string;
  bio: string;
  rating: number;
  reviewCount: number;
  availableDays: string[];
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  address: string;
  createdAt: string;
  appointmentsCount: number;
  lastVisit: string | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'agendado' | 'confirmado' | 'em-atendimento' | 'concluido' | 'cancelado' | 'falta';
  notes?: string;
  phone: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  appointmentId: string;
  date: string;
  professionalName: string;
  specialty: string;
  diagnosis: string;
  prescription: string;
  notes: string;
}

export const specialties: Specialty[] = [
  {
    id: '1',
    name: 'Clínica Geral',
    description: 'Atendimento médico geral para adultos e idosos',
    icon: 'Stethoscope',
    duration: 30,
    price: 150,
  },
  {
    id: '2',
    name: 'Cardiologia',
    description: 'Diagnóstico e tratamento de doenças do coração',
    icon: 'Heart',
    duration: 45,
    price: 280,
  },
  {
    id: '3',
    name: 'Dermatologia',
    description: 'Cuidados com a pele, cabelos e unhas',
    icon: 'Sparkles',
    duration: 30,
    price: 220,
  },
  {
    id: '4',
    name: 'Pediatria',
    description: 'Atendimento especializado para crianças',
    icon: 'Baby',
    duration: 30,
    price: 180,
  },
  {
    id: '5',
    name: 'Ortopedia',
    description: 'Tratamento de ossos, articulações e músculos',
    icon: 'Bone',
    duration: 40,
    price: 250,
  },
  {
    id: '6',
    name: 'Oftalmologia',
    description: 'Exames e tratamentos para a visão',
    icon: 'Eye',
    duration: 30,
    price: 200,
  },
  {
    id: '7',
    name: 'Ginecologia',
    description: 'Saúde da mulher e acompanhamento',
    icon: 'HeartPulse',
    duration: 40,
    price: 220,
  },
  {
    id: '8',
    name: 'Neurologia',
    description: 'Diagnóstico de doenças do sistema nervoso',
    icon: 'Brain',
    duration: 50,
    price: 320,
  },
];

export const professionals: Professional[] = [
  {
    id: '1',
    name: 'Dra. Ana Carolina Silva',
    specialty: 'Clínica Geral',
    specialtyId: '1',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face',
    crm: 'CRM/SP 123456',
    bio: 'Médica formada pela USP com 15 anos de experiência em clínica geral.',
    rating: 4.9,
    reviewCount: 234,
    availableDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
  },
  {
    id: '2',
    name: 'Dr. Ricardo Mendes',
    specialty: 'Cardiologia',
    specialtyId: '2',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face',
    crm: 'CRM/SP 789012',
    bio: 'Cardiologista especializado em arritmias cardíacas.',
    rating: 4.8,
    reviewCount: 189,
    availableDays: ['Segunda', 'Quarta', 'Sexta'],
  },
  {
    id: '3',
    name: 'Dra. Mariana Costa',
    specialty: 'Dermatologia',
    specialtyId: '3',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&crop=face',
    crm: 'CRM/SP 345678',
    bio: 'Dermatologista com foco em dermatologia estética e clínica.',
    rating: 4.9,
    reviewCount: 312,
    availableDays: ['Terça', 'Quarta', 'Quinta'],
  },
  {
    id: '4',
    name: 'Dr. Paulo Roberto Santos',
    specialty: 'Pediatria',
    specialtyId: '4',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop&crop=face',
    crm: 'CRM/SP 901234',
    bio: 'Pediatra com especialização em neonatologia.',
    rating: 4.7,
    reviewCount: 156,
    availableDays: ['Segunda', 'Terça', 'Quinta', 'Sexta'],
  },
  {
    id: '5',
    name: 'Dr. Fernando Lima',
    specialty: 'Ortopedia',
    specialtyId: '5',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face',
    crm: 'CRM/SP 567890',
    bio: 'Ortopedista especializado em cirurgia do joelho.',
    rating: 4.8,
    reviewCount: 201,
    availableDays: ['Segunda', 'Quarta', 'Sexta'],
  },
  {
    id: '6',
    name: 'Dra. Juliana Ferreira',
    specialty: 'Oftalmologia',
    specialtyId: '6',
    avatar: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=200&h=200&fit=crop&crop=face',
    crm: 'CRM/SP 234567',
    bio: 'Oftalmologista com expertise em cirurgia refrativa.',
    rating: 4.9,
    reviewCount: 278,
    availableDays: ['Terça', 'Quarta', 'Quinta', 'Sexta'],
  },
  {
    id: '7',
    name: 'Dra. Beatriz Oliveira',
    specialty: 'Ginecologia',
    specialtyId: '7',
    avatar: 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=200&h=200&fit=crop&crop=face',
    crm: 'CRM/SP 678901',
    bio: 'Ginecologista e obstetra com 20 anos de experiência.',
    rating: 4.9,
    reviewCount: 423,
    availableDays: ['Segunda', 'Terça', 'Quarta', 'Quinta'],
  },
  {
    id: '8',
    name: 'Dr. André Nascimento',
    specialty: 'Neurologia',
    specialtyId: '8',
    avatar: 'https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=200&h=200&fit=crop&crop=face',
    crm: 'CRM/SP 012345',
    bio: 'Neurologista especializado em doenças neurodegenerativas.',
    rating: 4.8,
    reviewCount: 167,
    availableDays: ['Segunda', 'Quarta', 'Quinta'],
  },
];

export const patients: Patient[] = [
  {
    id: '1',
    name: 'Maria José da Silva',
    email: 'maria.silva@email.com',
    phone: '(11) 99999-1234',
    cpf: '123.456.789-00',
    birthDate: '1985-03-15',
    address: 'Rua das Flores, 123 - São Paulo/SP',
    createdAt: '2023-01-15',
    appointmentsCount: 12,
    lastVisit: '2024-12-10',
  },
  {
    id: '2',
    name: 'João Pedro Santos',
    email: 'joao.santos@email.com',
    phone: '(11) 98888-5678',
    cpf: '987.654.321-00',
    birthDate: '1990-07-22',
    address: 'Av. Paulista, 456 - São Paulo/SP',
    createdAt: '2023-03-20',
    appointmentsCount: 8,
    lastVisit: '2024-12-15',
  },
  {
    id: '3',
    name: 'Ana Beatriz Oliveira',
    email: 'ana.oliveira@email.com',
    phone: '(11) 97777-9012',
    cpf: '456.789.123-00',
    birthDate: '1978-11-08',
    address: 'Rua Augusta, 789 - São Paulo/SP',
    createdAt: '2023-06-10',
    appointmentsCount: 15,
    lastVisit: '2024-12-18',
  },
  {
    id: '4',
    name: 'Carlos Eduardo Lima',
    email: 'carlos.lima@email.com',
    phone: '(11) 96666-3456',
    cpf: '321.654.987-00',
    birthDate: '1982-05-30',
    address: 'Rua Oscar Freire, 321 - São Paulo/SP',
    createdAt: '2023-08-05',
    appointmentsCount: 6,
    lastVisit: '2024-11-28',
  },
  {
    id: '5',
    name: 'Fernanda Costa',
    email: 'fernanda.costa@email.com',
    phone: '(11) 95555-7890',
    cpf: '789.123.456-00',
    birthDate: '1995-09-12',
    address: 'Rua Haddock Lobo, 654 - São Paulo/SP',
    createdAt: '2024-01-12',
    appointmentsCount: 4,
    lastVisit: '2024-12-05',
  },
  {
    id: '6',
    name: 'Roberto Almeida',
    email: 'roberto.almeida@email.com',
    phone: '(11) 94444-1234',
    cpf: '654.987.321-00',
    birthDate: '1970-02-28',
    address: 'Av. Brasil, 987 - São Paulo/SP',
    createdAt: '2024-02-20',
    appointmentsCount: 9,
    lastVisit: '2024-12-12',
  },
  {
    id: '7',
    name: 'Patricia Mendes',
    email: 'patricia.mendes@email.com',
    phone: '(11) 93333-5678',
    cpf: '147.258.369-00',
    birthDate: '1988-12-05',
    address: 'Rua Consolação, 147 - São Paulo/SP',
    createdAt: '2024-04-08',
    appointmentsCount: 3,
    lastVisit: '2024-11-20',
  },
  {
    id: '8',
    name: 'Lucas Martins',
    email: 'lucas.martins@email.com',
    phone: '(11) 92222-9012',
    cpf: '369.258.147-00',
    birthDate: '2015-06-18',
    address: 'Rua Pamplona, 258 - São Paulo/SP',
    createdAt: '2024-05-15',
    appointmentsCount: 7,
    lastVisit: '2024-12-16',
  },
];

export const appointments: Appointment[] = [
  {
    id: '1',
    patientId: '1',
    patientName: 'Maria José da Silva',
    professionalId: '1',
    professionalName: 'Dra. Ana Carolina Silva',
    specialty: 'Clínica Geral',
    date: '2024-12-19',
    time: '09:00',
    status: 'confirmado',
    phone: '(11) 99999-1234',
  },
  {
    id: '2',
    patientId: '2',
    patientName: 'João Pedro Santos',
    professionalId: '2',
    professionalName: 'Dr. Ricardo Mendes',
    specialty: 'Cardiologia',
    date: '2024-12-19',
    time: '09:30',
    status: 'agendado',
    phone: '(11) 98888-5678',
  },
  {
    id: '3',
    patientId: '3',
    patientName: 'Ana Beatriz Oliveira',
    professionalId: '3',
    professionalName: 'Dra. Mariana Costa',
    specialty: 'Dermatologia',
    date: '2024-12-19',
    time: '10:00',
    status: 'em-atendimento',
    phone: '(11) 97777-9012',
  },
  {
    id: '4',
    patientId: '4',
    patientName: 'Carlos Eduardo Lima',
    professionalId: '5',
    professionalName: 'Dr. Fernando Lima',
    specialty: 'Ortopedia',
    date: '2024-12-19',
    time: '10:30',
    status: 'agendado',
    phone: '(11) 96666-3456',
  },
  {
    id: '5',
    patientId: '5',
    patientName: 'Fernanda Costa',
    professionalId: '7',
    professionalName: 'Dra. Beatriz Oliveira',
    specialty: 'Ginecologia',
    date: '2024-12-19',
    time: '11:00',
    status: 'confirmado',
    phone: '(11) 95555-7890',
  },
  {
    id: '6',
    patientId: '6',
    patientName: 'Roberto Almeida',
    professionalId: '8',
    professionalName: 'Dr. André Nascimento',
    specialty: 'Neurologia',
    date: '2024-12-19',
    time: '14:00',
    status: 'agendado',
    phone: '(11) 94444-1234',
  },
  {
    id: '7',
    patientId: '7',
    patientName: 'Patricia Mendes',
    professionalId: '1',
    professionalName: 'Dra. Ana Carolina Silva',
    specialty: 'Clínica Geral',
    date: '2024-12-19',
    time: '14:30',
    status: 'confirmado',
    phone: '(11) 93333-5678',
  },
  {
    id: '8',
    patientId: '8',
    patientName: 'Lucas Martins',
    professionalId: '4',
    professionalName: 'Dr. Paulo Roberto Santos',
    specialty: 'Pediatria',
    date: '2024-12-19',
    time: '15:00',
    status: 'agendado',
    phone: '(11) 92222-9012',
  },
  {
    id: '9',
    patientId: '1',
    patientName: 'Maria José da Silva',
    professionalId: '6',
    professionalName: 'Dra. Juliana Ferreira',
    specialty: 'Oftalmologia',
    date: '2024-12-20',
    time: '09:00',
    status: 'agendado',
    phone: '(11) 99999-1234',
  },
  {
    id: '10',
    patientId: '2',
    patientName: 'João Pedro Santos',
    professionalId: '2',
    professionalName: 'Dr. Ricardo Mendes',
    specialty: 'Cardiologia',
    date: '2024-12-20',
    time: '10:00',
    status: 'agendado',
    phone: '(11) 98888-5678',
  },
];

export const timeSlots: TimeSlot[] = [
  { id: '1', time: '08:00', available: true },
  { id: '2', time: '08:30', available: true },
  { id: '3', time: '09:00', available: false },
  { id: '4', time: '09:30', available: true },
  { id: '5', time: '10:00', available: true },
  { id: '6', time: '10:30', available: false },
  { id: '7', time: '11:00', available: true },
  { id: '8', time: '11:30', available: true },
  { id: '9', time: '14:00', available: true },
  { id: '10', time: '14:30', available: false },
  { id: '11', time: '15:00', available: true },
  { id: '12', time: '15:30', available: true },
  { id: '13', time: '16:00', available: true },
  { id: '14', time: '16:30', available: false },
  { id: '15', time: '17:00', available: true },
  { id: '16', time: '17:30', available: true },
];

export const dashboardStats = {
  todayAppointments: 12,
  confirmedAppointments: 8,
  pendingConfirmations: 4,
  cancelledToday: 1,
  totalPatients: 847,
  newPatientsThisMonth: 32,
  monthlyRevenue: 45680,
  weeklyRevenue: 12450,
  appointmentsThisWeek: 56,
  averageRating: 4.8,
};

export const weeklyAppointmentsData = [
  { day: 'Seg', appointments: 14, revenue: 3200 },
  { day: 'Ter', appointments: 18, revenue: 4100 },
  { day: 'Qua', appointments: 12, revenue: 2800 },
  { day: 'Qui', appointments: 16, revenue: 3600 },
  { day: 'Sex', appointments: 20, revenue: 4500 },
  { day: 'Sáb', appointments: 8, revenue: 1800 },
];

export const specialtyDistribution = [
  { name: 'Clínica Geral', value: 28, color: '#8fc3db' },
  { name: 'Cardiologia', value: 18, color: '#6badc7' },
  { name: 'Dermatologia', value: 15, color: '#4d97b3' },
  { name: 'Pediatria', value: 14, color: '#2f819f' },
  { name: 'Outros', value: 25, color: '#c4dce6' },
];
