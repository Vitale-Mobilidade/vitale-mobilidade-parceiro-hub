-- Additive editorial planning. Existing articles, offers and writers are unchanged.
ALTER TABLE public.editorial_articles ADD COLUMN foundation_required boolean NOT NULL DEFAULT false;

CREATE TABLE public.editorial_briefs (
  article_id uuid PRIMARY KEY REFERENCES public.editorial_articles(id) ON DELETE CASCADE,
  video_id text NOT NULL REFERENCES public.editorial_videos(youtube_id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'qa_failed', 'ready')),
  archetype text NOT NULL CHECK (archetype IN (
    'direct_comparison', 'product_review', 'real_world_test', 'buying_guide',
    'audience_need', 'education', 'market_price', 'curated_list', 'use_comparison')),
  primary_intent text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  quality_report jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(quality_report) = 'object'),
  article_revision integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX editorial_briefs_archetype_status_idx ON public.editorial_briefs(archetype, status);
ALTER TABLE public.editorial_briefs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.editorial_briefs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.editorial_briefs TO service_role;

-- The old published articles retain their current status and rendering. New articles
-- explicitly marked foundation_required cannot bypass revision-matched QA.
CREATE OR REPLACE FUNCTION public.editorial_article_before_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE brief_state record;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'article identity is immutable';
  END IF;
  IF (NEW.title, NEW.slug, NEW.summary, NEW.blocks, NEW.faq) IS DISTINCT FROM
     (OLD.title, OLD.slug, OLD.summary, OLD.blocks, OLD.faq) THEN
    IF OLD.foundation_required AND OLD.status = 'published' THEN
      RAISE EXCEPTION 'unpublish foundation article before editing';
    END IF;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
  END IF;
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF NEW.slug IS NULL OR length(btrim(NEW.title)) < 3 OR jsonb_array_length(NEW.blocks) = 0 THEN
      RAISE EXCEPTION 'article needs title, slug and body before publication';
    END IF;
    IF NEW.foundation_required THEN
      SELECT status, article_revision, quality_report INTO brief_state FROM public.editorial_briefs WHERE article_id = NEW.id;
      IF brief_state.status IS DISTINCT FROM 'ready' OR brief_state.article_revision IS DISTINCT FROM OLD.revision OR
         brief_state.quality_report->>'articleQaPass' IS DISTINCT FROM 'true' OR NEW.validation_errors <> '[]'::jsonb THEN
        RAISE EXCEPTION 'editorial brief and current QA are required before publication';
      END IF;
    END IF;
    NEW.published_at := now();
  END IF;
  NEW.revision := OLD.revision + 1;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
