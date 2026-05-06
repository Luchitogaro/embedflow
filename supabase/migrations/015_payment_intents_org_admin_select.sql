-- Permitir que owners/admins lean intents de su organización (historial en dashboard billing).

CREATE POLICY "Org billing admins select payment intents"
  ON public.payment_intents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.org_id = payment_intents.org_id
        AND u.role IN ('owner', 'admin')
    )
  );

COMMENT ON POLICY "Org billing admins select payment intents" ON public.payment_intents IS
  'UI billing history (EmbedFlow dashboard): sólo owner/admin del org ven intents APPROVED.';
