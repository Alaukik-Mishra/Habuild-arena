// Schedule: every 5 minutes
// Deploy with: supabase functions deploy process-expired-invites
// Schedule with: supabase functions schedule process-expired-invites --cron "*/5 * * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req: Request): Promise<Response> => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Query expired accepted invites where challenger never checked in
    const { data: expiredInvites, error: queryError } = await supabase
      .from('invites')
      .select('id, from_name, to_name, challenge')
      .eq('status', 'ACCEPTED')
      .lt('checkin_deadline', new Date().toISOString())
      .eq('challenger_checked_in', false);

    if (queryError) {
      throw new Error(`Failed to query expired invites: ${queryError.message}`);
    }

    if (!expiredInvites || expiredInvites.length === 0) {
      return Response.json({ processed: 0 });
    }

    let processed = 0;

    for (const invite of expiredInvites) {
      try {
        // Archive the invite
        const { error: updateError } = await supabase
          .from('invites')
          .update({ status: 'ARCHIVED' })
          .eq('id', invite.id);

        if (updateError) {
          console.error(`Failed to archive invite ${invite.id}:`, updateError.message);
          continue;
        }

        // Notify opponent — they win by default
        const { error: opponentNotifError } = await supabase
          .from('notifications')
          .insert({
            user_id: invite.to_name,
            type: 'default_win',
            invite_id: invite.id,
            payload: {
              challengerName: invite.from_name,
              challengeName: invite.challenge,
              message: 'You won by default — Challenger did not arrive in time',
            },
          });

        if (opponentNotifError) {
          console.error(`Failed to insert opponent notification for invite ${invite.id}:`, opponentNotifError.message);
        }

        // Notify challenger — they forfeited
        const { error: challengerNotifError } = await supabase
          .from('notifications')
          .insert({
            user_id: invite.from_name,
            type: 'default_win',
            invite_id: invite.id,
            payload: {
              opponentName: invite.to_name,
              challengeName: invite.challenge,
              message: 'You forfeited — you did not join within the 1-hour window',
            },
          });

        if (challengerNotifError) {
          console.error(`Failed to insert challenger notification for invite ${invite.id}:`, challengerNotifError.message);
        }

        processed++;
      } catch (err) {
        console.error(`Unexpected error processing invite ${invite.id}:`, err);
      }
    }

    return Response.json({ processed });
  } catch (err) {
    console.error('process-expired-invites fatal error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
});
