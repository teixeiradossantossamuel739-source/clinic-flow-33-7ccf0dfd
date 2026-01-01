-- Function to update professional rating and review count
CREATE OR REPLACE FUNCTION public.update_professional_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof_id uuid;
  avg_rating numeric;
  total_reviews integer;
BEGIN
  -- Get the professional_id from the review
  IF TG_OP = 'DELETE' THEN
    prof_id := OLD.professional_id;
  ELSE
    prof_id := NEW.professional_id;
  END IF;

  -- Calculate new average and count
  SELECT 
    COALESCE(AVG(rating)::numeric(3,2), 5.0),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM public.appointment_reviews
  WHERE professional_id = prof_id;

  -- Update the professionals table
  UPDATE public.professionals
  SET 
    rating = avg_rating,
    review_count = total_reviews,
    updated_at = now()
  WHERE id = prof_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT, UPDATE, DELETE on appointment_reviews
DROP TRIGGER IF EXISTS trigger_update_professional_rating ON public.appointment_reviews;

CREATE TRIGGER trigger_update_professional_rating
AFTER INSERT OR UPDATE OR DELETE ON public.appointment_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_professional_rating();