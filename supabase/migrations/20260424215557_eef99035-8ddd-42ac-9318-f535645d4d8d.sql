CREATE POLICY "No direct lead reads"
ON public.quiz_leads
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "No direct lead creates"
ON public.quiz_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "No direct lead edits"
ON public.quiz_leads
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct lead deletes"
ON public.quiz_leads
FOR DELETE
TO anon, authenticated
USING (false);

CREATE POLICY "No direct event reads"
ON public.quiz_events
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "No direct event creates"
ON public.quiz_events
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "No direct event edits"
ON public.quiz_events
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct event deletes"
ON public.quiz_events
FOR DELETE
TO anon, authenticated
USING (false);