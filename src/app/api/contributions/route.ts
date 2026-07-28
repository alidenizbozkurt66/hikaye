import { NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const content = (body.content || '').trim();
    const is_official = !!body.is_official;

    if (!content || content.length === 0) return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    if (content.length > 100) return NextResponse.json({ error: 'Content too long (max 100 chars)' }, { status: 400 });

    // Get current user from Authorization header via Supabase JWT (must be provided by client)
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    // Verify token and get user id
    const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token);
    if (userErr || !userData.user) return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    const userId = userData.user.id;

    // only admins allowed to create official parts - placeholder check: username === 'admin'
    if (is_official) {
      const { data: profile } = await supabaseServer.from('profiles').select('id, username').eq('id', userId).single();
      const isAdmin = profile && profile.username === 'admin';
      if (!isAdmin) return NextResponse.json({ error: 'Unauthorized to create official parts' }, { status: 403 });
    }

    // cooldown enforcement (6 hours)
    const { data: p, error: pErr } = await supabaseServer.from('profiles').select('last_contribution_at, streak').eq('id', userId).single();
    if (pErr) {
      // if profile not found, create one (basic)
      await supabaseServer.from('profiles').insert({ id: userId, username: userData.user.email || userId }).select();
    }

    const last = p?.last_contribution_at;
    if (last && !is_official) {
      const lastTs = new Date(last);
      const now = new Date();
      const hoursSince = (now.getTime() - lastTs.getTime()) / (1000*60*60);
      if (hoursSince < 6) return NextResponse.json({ error: `Cooldown: you must wait ${Math.ceil(6 - hoursSince)} hour(s)` }, { status: 429 });
    }

    // insert contribution
    const { data: created, error: insertErr } = await supabaseServer.from('contributions').insert({
      user_id: userId,
      content,
      is_official: is_official ? true : false
    }).select('*').single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    // Update profile: streak logic + last_contribution_at
    const now = new Date();
    let newStreak = 1;
    if (p && p.last_contribution_at) {
      const lastDate = new Date(p.last_contribution_at);
      const diffHours = (now.getTime() - lastDate.getTime()) / (1000*60*60);
      if (diffHours <= 24) newStreak = (p.streak || 0) + 1;
      else newStreak = 1;
    }
    await supabaseServer.from('profiles').update({ last_contribution_at: now.toISOString(), streak: newStreak }).eq('id', userId);

    return NextResponse.json({ ok: true, contribution: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
