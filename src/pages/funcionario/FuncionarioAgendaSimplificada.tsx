import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FuncionarioLayout } from '@/components/layout/FuncionarioLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ListTodo, InboxIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { usePendingRequests, type PendingRequest } from '@/hooks/usePendingRequests';
import { RequestCard } from '@/components/funcionario/RequestCard';
import { DayScheduleView } from '@/components/funcionario/DayScheduleView';
import { InfoBanner } from '@/components/funcionario/InfoBanner';

type ViewMode = 'requests' | 'daySchedule';

export default function FuncionarioAgendaSimplificada() {
  const { user } = useAuth();
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('requests');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | undefined>(undefined);
  
  // Dialogs state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'accept' | 'reject';
    requestId: string;
    patientName: string;
  } | null>(null);
  const [suggestDialog, setSuggestDialog] = useState<{
    open: boolean;
    time: string;
    requestId: string;
    patientName: string;
  } | null>(null);

  // Fetch professional ID
  useEffect(() => {
    if (user) {
      fetchProfessionalId();
    }
  }, [user]);

  async function fetchProfessionalId() {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfessionalId(data.id);
      }
    } catch (error) {
      console.error('Error fetching professional ID:', error);
      toast.error('Erro ao carregar dados');
    }
  }

  const { 
    requests, 
    isLoading, 
    acceptRequest, 
    rejectRequest,
    suggestNewTime 
  } = usePendingRequests(professionalId);

  // Handlers
  const handleAcceptClick = (id: string) => {
    const request = requests.find(r => r.id === id);
    if (request) {
      setConfirmDialog({
        open: true,
        type: 'accept',
        requestId: id,
        patientName: request.patient_name
      });
    }
  };

  const handleRejectClick = (id: string) => {
    const request = requests.find(r => r.id === id);
    if (request) {
      setConfirmDialog({
        open: true,
        type: 'reject',
        requestId: id,
        patientName: request.patient_name
      });
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    
    if (confirmDialog.type === 'accept') {
      await acceptRequest(confirmDialog.requestId);
    } else {
      await rejectRequest(confirmDialog.requestId);
    }
    
    setConfirmDialog(null);
  };

  const handleViewSchedule = (date: Date, request: PendingRequest) => {
    setSelectedDate(date);
    setSelectedRequest(request);
    setViewMode('daySchedule');
  };

  const handleSlotSelect = (time: string, status: string) => {
    if (status !== 'available' || !selectedRequest) return;
    
    setSuggestDialog({
      open: true,
      time,
      requestId: selectedRequest.id,
      patientName: selectedRequest.patient_name
    });
  };

  const handleSuggestConfirm = async () => {
    if (!suggestDialog) return;
    
    await suggestNewTime(suggestDialog.requestId, suggestDialog.time);
    setSuggestDialog(null);
    setViewMode('requests');
    setSelectedRequest(undefined);
  };

  const handleBackToRequests = () => {
    setViewMode('requests');
    setSelectedRequest(undefined);
  };

  // Loading state
  if (!professionalId) {
    return (
      <FuncionarioLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-12 w-full" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </FuncionarioLayout>
    );
  }

  return (
    <FuncionarioLayout>
      <div className="space-y-6">
        {/* Header with tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">Minha Agenda</h1>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="requests" className="gap-2">
                <ListTodo className="h-4 w-4" />
                Solicitações
                {requests.length > 0 && (
                  <span className="ml-1 bg-warning text-warning-foreground text-xs px-2 py-0.5 rounded-full">
                    {requests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="daySchedule" className="gap-2">
                <Calendar className="h-4 w-4" />
                Agenda do Dia
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'requests' ? (
          <RequestsView 
            requests={requests}
            isLoading={isLoading}
            onAccept={handleAcceptClick}
            onReject={handleRejectClick}
            onViewSchedule={handleViewSchedule}
          />
        ) : (
          <DayScheduleView
            date={selectedDate}
            professionalId={professionalId}
            selectedRequest={selectedRequest}
            onSlotSelect={handleSlotSelect}
            onBack={handleBackToRequests}
          />
        )}
      </div>

      {/* Confirm Accept/Reject Dialog */}
      <AlertDialog 
        open={confirmDialog?.open ?? false} 
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.type === 'accept' 
                ? 'Confirmar Consulta?' 
                : 'Recusar Solicitação?'
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.type === 'accept' 
                ? `Você está confirmando a consulta com ${confirmDialog?.patientName}. O paciente será notificado.`
                : `Você está recusando a solicitação de ${confirmDialog?.patientName}. Esta ação não pode ser desfeita.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              className={confirmDialog?.type === 'reject' ? 'bg-destructive hover:bg-destructive/90' : 'bg-success hover:bg-success/90'}
            >
              {confirmDialog?.type === 'accept' ? 'Confirmar' : 'Recusar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suggest Time Dialog */}
      <AlertDialog 
        open={suggestDialog?.open ?? false} 
        onOpenChange={(open) => !open && setSuggestDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sugerir Este Horário?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está sugerindo o horário <strong>{suggestDialog?.time}</strong> para{' '}
              <strong>{suggestDialog?.patientName}</strong>. O paciente será notificado sobre a alteração.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuggestConfirm}>
              Sugerir Horário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FuncionarioLayout>
  );
}

// Subcomponent for requests view
interface RequestsViewProps {
  requests: PendingRequest[];
  isLoading: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onViewSchedule: (date: Date, request: PendingRequest) => void;
}

function RequestsView({ requests, isLoading, onAccept, onReject, onViewSchedule }: RequestsViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <InboxIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Nenhuma solicitação pendente</h3>
              <p className="text-muted-foreground mt-1">
                Quando novos agendamentos chegarem, você verá aqui.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <InfoBanner 
        message={`Você tem ${requests.length} solicitação${requests.length > 1 ? 'ões' : ''} aguardando sua resposta`}
        variant="warning"
      />
      
      <div className="space-y-3">
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            onAccept={onAccept}
            onReject={onReject}
            onViewSchedule={onViewSchedule}
          />
        ))}
      </div>
    </div>
  );
}
