// Historical one-off migration endpoint intentionally disabled.
//
// This app is now the commercial multi-club base. Keeping a callable migration
// that can purge production entities or re-apply Defensa y Justicia identity is
// unsafe for cloned customer instances. The original implementation remains
// recoverable from Base44 checkpoints / git history if an audit ever requires it.

Deno.serve(async () => {
  return Response.json(
    {
      success: false,
      disabled: true,
      error: 'La migración histórica Defensa → Nueva está deshabilitada permanentemente en la base comercial.',
    },
    { status: 410 },
  );
});
