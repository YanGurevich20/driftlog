'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function idFromEmail(email: string): string {
  return encodeURIComponent(normalizeEmail(email));
}

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Basic client validation
    const candidate = normalizeEmail(email);
    const isValid = /.+@.+\..+/.test(candidate);
    if (!isValid) {
      setError('Please enter a valid email.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await setDoc(
        doc(db, 'waitlist', idFromEmail(candidate)),
        {
          email: candidate,
          createdAt: serverTimestamp(),
          source: 'landing',
        },
        { merge: false }
      );
      setSubmitted(true);
    } catch {
      setError('Failed to join the waitlist. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <h2 className="text-2xl font-semibold">You&apos;re on the list!</h2>
          <p className="text-muted-foreground">We&apos;ll email you when a spot opens.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-center">Beta is full</h2>
          <p className="text-muted-foreground text-center">
            Join the waitlist and we’ll notify you as soon as a spot opens up.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Join the Waitlist'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


