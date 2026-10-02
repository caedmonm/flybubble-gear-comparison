'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShareLinkButton({
  getTarget,
}: {
  getTarget: () => URL;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState('');
  const [notice, setNotice] = useState('');

  async function share() {
    setBusy(true);
    setCopied(false);
    setFallback('');
    setNotice('');
    const url = getTarget();
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: `${url.pathname}${url.search}` }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error();
      const { path } = await response.json();
      if (typeof path !== 'string' || !/^\/s\/[A-Za-z0-9_-]{12}$/.test(path))
        throw new Error();
      url.pathname = path;
      url.search = '';
      url.hash = '';
    } catch {
      setNotice('Could not create a short link. Please try again.');
      setBusy(false);
      return;
    }
    try {
      await navigator.clipboard.writeText(url.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setFallback(url.href);
    }
    setBusy(false);
  }

  return (
    <div className="share-link-control">
      <Button variant="outline" onClick={share} disabled={busy}>
        {copied ? <Check /> : <Copy />}
        {busy ? 'Creating link…' : copied ? 'Copied' : 'Copy link'}
      </Button>
      {notice && <output>{notice}</output>}
      {fallback && (
        <label className="share-fallback">
          Copy this link
          <input
            aria-label="Shared link"
            readOnly
            value={fallback}
            onFocus={(event) => event.target.select()}
          />
        </label>
      )}
    </div>
  );
}
