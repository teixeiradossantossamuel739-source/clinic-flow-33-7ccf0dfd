import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Clock, Calendar } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  rental_value_cents: number;
  is_active: boolean;
}

interface Professional {
  id: string;
  name: string;
  profession: string;
  room_id: string | null;
}

interface Schedule {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface RoomOccupancyReportProps {
  rooms: Room[];
  professionals: Professional[];
  schedules: Schedule[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom', short: 'D' },
  { value: 1, label: 'Seg', short: 'S' },
  { value: 2, label: 'Ter', short: 'T' },
  { value: 3, label: 'Qua', short: 'Q' },
  { value: 4, label: 'Qui', short: 'Q' },
  { value: 5, label: 'Sex', short: 'S' },
  { value: 6, label: 'Sáb', short: 'S' },
];

const formatCurrency = (cents: number) => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatTime = (time: string) => {
  return time.slice(0, 5);
};

const calculateHoursFromSchedule = (startTime: string, endTime: string): number => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH * 60 + endM - startH * 60 - startM) / 60;
};

export function RoomOccupancyReport({ rooms, professionals, schedules }: RoomOccupancyReportProps) {
  const activeRooms = rooms.filter(r => r.is_active);

  const getRoomProfessionals = (roomId: string) => {
    return professionals.filter(p => p.room_id === roomId);
  };

  const getProfessionalSchedules = (professionalId: string) => {
    return schedules.filter(s => s.professional_id === professionalId && s.is_active);
  };

  const calculateRoomOccupancy = (roomId: string) => {
    const roomProfessionals = getRoomProfessionals(roomId);
    let totalHours = 0;

    roomProfessionals.forEach(prof => {
      const profSchedules = getProfessionalSchedules(prof.id);
      profSchedules.forEach(schedule => {
        totalHours += calculateHoursFromSchedule(schedule.start_time, schedule.end_time);
      });
    });

    // Assume max 10 hours/day * 6 days = 60 hours/week potential
    const maxHours = 60;
    const percentage = Math.min((totalHours / maxHours) * 100, 100);

    return { totalHours, percentage };
  };

  const getScheduleDays = (professionalId: string) => {
    const profSchedules = getProfessionalSchedules(professionalId);
    const days = [...new Set(profSchedules.map(s => s.day_of_week))].sort();
    return days;
  };

  const getScheduleTimeRange = (professionalId: string) => {
    const profSchedules = getProfessionalSchedules(professionalId);
    if (profSchedules.length === 0) return null;

    const startTimes = profSchedules.map(s => s.start_time).sort();
    const endTimes = profSchedules.map(s => s.end_time).sort();

    return {
      start: formatTime(startTimes[0]),
      end: formatTime(endTimes[endTimes.length - 1]),
    };
  };

  if (activeRooms.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Relatório de Ocupação</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeRooms.map((room) => {
          const roomProfessionals = getRoomProfessionals(room.id);
          const { totalHours, percentage } = calculateRoomOccupancy(room.id);

          return (
            <Card key={room.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(room.rental_value_cents)}/mês
                    </p>
                  </div>
                  <Badge variant={roomProfessionals.length > 0 ? "default" : "secondary"}>
                    {roomProfessionals.length} funcionário{roomProfessionals.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {roomProfessionals.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum funcionário vinculado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roomProfessionals.map((prof) => {
                      const days = getScheduleDays(prof.id);
                      const timeRange = getScheduleTimeRange(prof.id);

                      return (
                        <div key={prof.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{prof.name}</p>
                              <p className="text-xs text-muted-foreground">{prof.profession}</p>
                            </div>
                          </div>

                          {days.length > 0 ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1">
                                {days.map((day) => (
                                  <Badge key={day} variant="outline" className="text-xs">
                                    {DAYS_OF_WEEK.find(d => d.value === day)?.label}
                                  </Badge>
                                ))}
                              </div>
                              {timeRange && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {timeRange.start} - {timeRange.end}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Sem horários cadastrados
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Occupancy Stats */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Taxa de Ocupação</span>
                    <span className="text-sm font-medium">{percentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalHours.toFixed(1)}h semanais
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{activeRooms.length}</p>
              <p className="text-sm text-muted-foreground">Salas Ativas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {professionals.filter(p => p.room_id).length}
              </p>
              <p className="text-sm text-muted-foreground">Funcionários Vinculados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {activeRooms.filter(r => getRoomProfessionals(r.id).length > 0).length}
              </p>
              <p className="text-sm text-muted-foreground">Salas Ocupadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {activeRooms.filter(r => getRoomProfessionals(r.id).length === 0).length}
              </p>
              <p className="text-sm text-muted-foreground">Salas Livres</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
