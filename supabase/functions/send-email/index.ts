import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        
        const token = authHeader.replace(/^Bearer\s+/, '');
        const { type, to, data = {} } = await req.json();
        const resendApiKey = Deno.env.get('RESEND_API_KEY');

        if (!resendApiKey) {
            return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
             return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // Verify the user making the request
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !authData.user) {
             return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Verify the user is an admin
        const { data: roleData } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', authData.user.id)
            .eq('role', 'admin')
            .single();

        if (!roleData) {
             return new Response(JSON.stringify({ error: 'Forbidden: Requires admin role' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        let subject = '';
        let bodyContent = '';

        const appUrl = (data.appUrl || Deno.env.get('PUBLIC_APP_URL') || 'https://academy.stuntwerk.de').replace(/\/$/, '');

        switch (type) {
            case 'reminder': {
                const courses = (data.courses || []) as string[];
                const courseList = courses.map(c => `<li style="margin: 0 0 8px 0; padding-left: 8px;">${c}</li>`).join('');
                subject = 'Erinnerung: Offene Schulungen';
                bodyContent = `
              <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 8px 0;">Hallo ${data.name},</p>
              <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                Sie haben noch offene Schulungen. Bitte schließen Sie die folgenden Kurse ab:
              </p>
              <ul style="font-size: 15px; color: #1e293b; line-height: 1.8; padding-left: 20px; margin: 0 0 28px 0;">
                ${courseList}
              </ul>
              <a href="${appUrl}/dashboard" style="display: inline-block; background: #000000; color: #FFED00; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">
                Zu meinen Kursen
              </a>`;
                break;
            }

            case 'completion': {
                subject = `Glückwunsch: ${data.courseTitle} abgeschlossen!`;
                bodyContent = `
              <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 8px 0;">Hallo ${data.name},</p>
              <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                Sie haben den Kurs <strong style="color: #1e293b;">${data.courseTitle}</strong> erfolgreich abgeschlossen. Ihr Zertifikat steht jetzt zum Download bereit.
              </p>
              <a href="${appUrl}/certificates" style="display: inline-block; background: #000000; color: #FFED00; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">
                Zertifikat ansehen
              </a>`;
                break;
            }

            case 'custom': {
                subject = data.subject || 'Nachricht von Stuntwerk Academy';
                bodyContent = `
              <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 8px 0;">Hallo ${data.name || 'Mitarbeitende'},</p>
              <div style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0; white-space: pre-wrap;">
                ${data.body}
              </div>
              <a href="${appUrl}/dashboard" style="display: inline-block; background: #000000; color: #FFED00; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">
                Zum Dashboard
              </a>`;
                break;
            }

            default:
                return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
        }

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
    <tr><td align="center" style="padding: 40px 16px;">
      <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="max-width: 520px; width: 100%;">
        <!-- Header with logo -->
        <tr><td style="padding: 24px 32px; text-align: center;">
          <img src="${appUrl}/stuntwerk-logo.svg" alt="Stuntwerk" width="140" style="display: inline-block; height: auto;" />
        </td></tr>
        <!-- Stuntwerk accent bar -->
        <tr><td style="height: 4px; background: linear-gradient(90deg, #000000, #FFED00); border-radius: 4px 4px 0 0;"></td></tr>
        <!-- Main content card -->
        <tr><td style="background: #ffffff; padding: 36px 32px 32px 32px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          ${bodyContent}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding: 24px 32px; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0;">
            Stuntwerk Academy &mdash; Interne Schulungsplattform
          </p>
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 4px 0 0 0;">
            &copy; ${new Date().getFullYear()} Stuntwerk
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: Deno.env.get('RESEND_FROM_EMAIL') || 'Stuntwerk Academy <academy@stuntwerk.de>',
                to: to.toLowerCase(),
                subject,
                html,
            }),
        });

        const result = await res.json();
        if (!res.ok) {
            return new Response(JSON.stringify({ error: result }), {
                status: res.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, id: result.id }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
