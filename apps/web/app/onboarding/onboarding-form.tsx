'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export function OnboardingForm() {
  useEffect(() => { window.localStorage.removeItem('be-human:onboarding-draft:v1'); }, []);
  return <div className="setup-form">
    <p>Start by adding a plan item in your private space. You can add an optional capacity check-in when it helps you plan.</p>
    <p>Be Human does not assess sleep, finances, or relationships from a short setup form. Missing context stays unknown.</p>
    <div className="form-actions"><Link className="button ghost" href="/">Back</Link><Link className="button primary" href="/login">Sign in or create an account</Link></div>
  </div>;
}
