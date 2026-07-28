import { NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token);
    if (userErr || !userData.user) return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    const userId = userData.user.id;

    const body = await req.json();
    const contribution_id = body.contribution_id;
    const vote = body.vote; // -1,0,1
    if (![ -1, 0, 1 ].includes(vote)) return NextResponse.json({ error: 'Invalid vote' }, { status: 400 });

    const { data, error } = await supabaseServer.rpc('process_vote', {
      p_voter: userId,
      p_contribution_id: contribution_id,
      p_new_vote: vote
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, result: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
