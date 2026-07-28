'use client';
import { useState, useEffect } from 'react';

export default function ContributionForm({ profile }) {
  const [content, setContent] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (!profile?.last_contribution_at) { setCooldownRemaining(0); return; }
    const last = new Date(profile.last_contribution_at);
    const nextAllowed = new Date(last.getTime() + 6*60*60*1000);
    const timer = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, (nextAllowed.getTime() - now.getTime()));
      setCooldownRemaining(Math.ceil(diff / (1000*60))); // minutes
    }, 1000);
    return () => clearInterval(timer);
  }, [profile?.last_contribution_at]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (content.trim().length === 0) return;
    if (content.length > 100) {
      alert('Max 100 characters');
      return;
    }
    const token = (await fetch('/api/get-supabase-token').then(r=>r.json())).access_token;
    const res = await fetch('/api/contributions', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Error');
      return;
    }
    setContent('');
    // Optionally trigger revalidation or rely on realtime
  }

  const disabled = cooldownRemaining > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e)=> setContent(e.target.value)}
        maxLength={100}
        placeholder={disabled ? `Cooldown: ${cooldownRemaining} min` : 'Add your continuation (max 100 chars)'}
        className="w-full rounded border p-2"
        disabled={disabled}
      />
      <div className="flex justify-between items-center">
        <span>{content.length}/100</span>
        <button type="submit" disabled={disabled} className="btn-primary">
          Submit
        </button>
      </div>
    </form>
  );
}
