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
        const { email, fullName, department, jobTitle } = await req.json();
        console.log('[invite-user] Request received for:', email, fullName);

        if (!email || !fullName) {
            console.log('[invite-user] Missing required fields');
            return new Response(JSON.stringify({ error: 'Email und Name sind erforderlich.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Create Supabase admin client
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

        // Create user with a random password (they'll set their own via email)
        const tempPassword = crypto.randomUUID() + 'Aa1!';
        console.log('[invite-user] Creating auth user...');
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName },
        });

        if (createError) {
            console.error('[invite-user] User creation failed:', createError.message);
            return new Response(JSON.stringify({ error: createError.message }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const userId = userData.user.id;
        console.log('[invite-user] User created:', userId);

        // Update profile with department/job_title
        if (department || jobTitle) {
            const { error: profileError } = await supabaseAdmin.from('profiles').update({
                department: department || null,
                job_title: jobTitle || null,
            }).eq('user_id', userId);
            if (profileError) {
                console.error('[invite-user] Profile update error:', profileError.message);
            }
        }

        // Generate password reset link so user can set their own password
        console.log('[invite-user] Generating recovery link...');
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo: `${req.headers.get('origin') || Deno.env.get('PUBLIC_APP_URL') || 'https://academy.stuntwerk.de'}/auth`,
            },
        });

        if (linkError) {
            console.error('[invite-user] Link generation error:', linkError.message);
        } else {
            console.log('[invite-user] Recovery link generated successfully');
        }

        // Send welcome email via Resend
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        let emailSent = false;

        if (!resendApiKey) {
            console.error('[invite-user] RESEND_API_KEY is not set! Skipping email.');
        } else if (!linkData) {
            console.error('[invite-user] No link data available, skipping email.');
        } else {
            const resetLink = linkData.properties?.action_link || '';
            console.log('[invite-user] Sending email via Resend to:', email);

            const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: Deno.env.get('RESEND_FROM_EMAIL') || 'Stuntwerk Academy <academy@stuntwerk.de>',
                    to: email.toLowerCase(),
                    subject: 'Willkommen bei Stuntwerk Academy',
                    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
    <tr><td align="center" style="padding: 40px 16px;">
      <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="max-width: 520px; width: 100%;">
        <!-- Header with logo -->
        <tr><td style="padding: 24px 32px; text-align: center;">
          <img src="${(Deno.env.get('PUBLIC_APP_URL') || 'https://academy.stuntwerk.de').replace(/\/$/, '')}/stuntwerk-logo.svg" alt="Stuntwerk" width="140" style="display: inline-block; height: auto;" />
        </td></tr>
        <!-- Stuntwerk accent bar -->
        <tr><td style="height: 4px; background: linear-gradient(90deg, #000000, #FFED00); border-radius: 4px 4px 0 0;"></td></tr>
        <!-- Main content card -->
        <tr><td style="background: #ffffff; padding: 36px 32px 32px 32px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 8px 0;">Hallo ${fullName},</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
            Ihr Konto in der Stuntwerk Academy wurde erstellt. Klicken Sie auf den folgenden Button, um Ihr Passwort festzulegen und sich anzumelden:
          </p>
          <a href="${resetLink}" style="display: inline-block; background: #000000; color: #FFED00; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">
            Passwort festlegen
          </a>
          <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 28px 0 0 0;">
            Falls Sie diese E-Mail nicht erwartet haben, können Sie sie ignorieren.
          </p>
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
</html>`,
                }),
            });

            const resendBody = await resendRes.text();
            console.log('[invite-user] Resend response:', resendRes.status, resendBody);

            if (!resendRes.ok) {
                console.error('[invite-user] Resend email failed:', resendRes.status, resendBody);
            } else {
                emailSent = true;
                console.log('[invite-user] Email sent successfully');
            }
        }

        console.log('[invite-user] Done. userId:', userId, 'emailSent:', emailSent);
        return new Response(JSON.stringify({ success: true, userId, emailSent }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[invite-user] Unhandled error:', (err as Error).message);
        return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
