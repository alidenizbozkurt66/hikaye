'use client';
import { useState } from 'react';

export default function VoteButtons({ contributionId, currentScore, userVote }) {
  const [localVote, setLocalVote] = useState(userVote || 0);
  const [score, setScore] = useState(currentScore);

  async function sendVote(newVote) {
    const payload = { contribution_id: contributionId, vote: newVote === localVote ? 0 : newVote };
    const delta = (payload.vote - localVote);
    setLocalVote(payload.vote);
    setScore(prev => prev + delta);

    const token = (await fetch('/api/get-supabase-token').then(r=>r.json())).access_token;
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Vote failed');
      setLocalVote(userVote || 0);
      setScore(currentScore);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => sendVote(1)} className={`p-1 ${localVote === 1 ? 'text-green-600' : ''}`}>▲</button>
      <div>{score}</div>
      <button onClick={() => sendVote(-1)} className={`p-1 ${localVote === -1 ? 'text-red-600' : ''}`}>▼</button>
    </div>
  );
}
