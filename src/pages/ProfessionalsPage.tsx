import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { supabase } from '@/integrations/supabase/client';
import { Star, Calendar, ArrowRight, Loader2, User } from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  profession: string;
  specialty_id: string;
  bio: string | null;
  crm: string | null;
  avatar_url: string | null;
  rating: number | null;
  review_count: number | null;
}

interface ProfessionalReviewStats {
  professional_id: string;
  avg_rating: number;
  total_reviews: number;
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [reviewStats, setReviewStats] = useState<Record<string, ProfessionalReviewStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch professionals
      const { data: profData } = await supabase
        .from('professionals')
        .select('id, name, profession, specialty_id, bio, crm, avatar_url, rating, review_count')
        .eq('is_active', true)
        .order('name');

      // Fetch review stats
      const { data: reviewData } = await supabase
        .from('appointment_reviews')
        .select('professional_id, rating');

      if (profData) {
        setProfessionals(profData);
      }

      // Calculate review stats per professional
      if (reviewData) {
        const stats: Record<string, { total: number; sum: number }> = {};
        reviewData.forEach((review) => {
          if (!review.professional_id) return;
          if (!stats[review.professional_id]) {
            stats[review.professional_id] = { total: 0, sum: 0 };
          }
          stats[review.professional_id].total += 1;
          stats[review.professional_id].sum += review.rating;
        });

        const formattedStats: Record<string, ProfessionalReviewStats> = {};
        Object.entries(stats).forEach(([profId, data]) => {
          formattedStats[profId] = {
            professional_id: profId,
            avg_rating: data.sum / data.total,
            total_reviews: data.total,
          };
        });
        setReviewStats(formattedStats);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const getReviewStats = (profId: string) => {
    return reviewStats[profId] || null;
  };

  const specialtyNames: Record<string, string> = {
    clinico_geral: 'Clínico Geral',
    cardiologia: 'Cardiologia',
    dermatologia: 'Dermatologia',
    ortopedia: 'Ortopedia',
    pediatria: 'Pediatria',
    ginecologia: 'Ginecologia',
    neurologia: 'Neurologia',
    oftalmologia: 'Oftalmologia',
    psiquiatria: 'Psiquiatria',
    nutricao: 'Nutrição',
    fisioterapia: 'Fisioterapia',
    odontologia: 'Odontologia',
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="py-16 bg-clinic-surface">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold mb-4">Nossos Profissionais</h1>
            <p className="text-lg text-clinic-text-secondary">
              Conheça a equipe de especialistas dedicados a cuidar da sua saúde 
              com excelência, ética e carinho.
            </p>
          </div>
        </div>
      </section>

      {/* Professionals Grid */}
      <section className="py-16">
        <div className="container">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-clinic-primary" />
            </div>
          ) : professionals.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 text-clinic-text-muted opacity-50" />
              <p className="text-clinic-text-secondary">Nenhum profissional disponível no momento.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {professionals.map((professional) => {
                const stats = getReviewStats(professional.id);
                const displayRating = stats?.avg_rating || professional.rating || 0;
                const displayReviewCount = stats?.total_reviews || professional.review_count || 0;

                return (
                  <div
                    key={professional.id}
                    className="bg-background border border-clinic-border-subtle rounded-2xl overflow-hidden hover:shadow-clinic-lg transition-all hover-lift"
                  >
                    <div className="aspect-[4/3] relative bg-muted">
                      {professional.avatar_url ? (
                        <img
                          src={professional.avatar_url}
                          alt={professional.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-16 w-16 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 text-background">
                        <p className="font-semibold text-lg">{professional.name}</p>
                        <p className="text-sm opacity-80">
                          {professional.profession} • {specialtyNames[professional.specialty_id] || professional.specialty_id}
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-5 space-y-4">
                      {/* Rating Section */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          {displayReviewCount > 0 ? (
                            <>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= Math.round(displayRating)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-muted-foreground/30'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-medium ml-1">{displayRating.toFixed(1)}</span>
                              <span className="text-clinic-text-muted">
                                ({displayReviewCount} {displayReviewCount === 1 ? 'avaliação' : 'avaliações'})
                              </span>
                            </>
                          ) : (
                            <span className="text-clinic-text-muted text-xs">Sem avaliações ainda</span>
                          )}
                        </div>
                      </div>

                      {professional.crm && (
                        <p className="text-sm text-clinic-text-muted">{professional.crm}</p>
                      )}
                      
                      {professional.bio && (
                        <p className="text-sm text-clinic-text-secondary line-clamp-2">
                          {professional.bio}
                        </p>
                      )}

                      <Link to={`/agendar?profissional=${professional.id}`}>
                        <Button variant="clinic" className="w-full" size="sm">
                          <Calendar className="h-4 w-4" />
                          Agendar Consulta
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-clinic-surface">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Pronto para agendar?</h2>
            <p className="text-clinic-text-secondary mb-6">
              Escolha o profissional ideal para você e agende sua consulta 
              de forma rápida e prática.
            </p>
            <Link to="/agendar">
              <Button variant="clinic" size="lg">
                Agendar Agora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
