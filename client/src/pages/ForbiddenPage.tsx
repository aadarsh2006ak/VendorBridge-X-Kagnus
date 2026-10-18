import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-surface border border-border-default rounded-2xl p-8 space-y-5">
        <div className="w-14 h-14 rounded-full bg-red-950/60 border border-danger/40 flex items-center justify-center mx-auto text-danger">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-primary">Access Restricted (403)</h1>
          <p className="text-sm text-secondary">
            Your user role does not have authorization to view this module.
          </p>
        </div>
        <div className="pt-2">
          <Link to="/dashboard">
            <Button variant="outline" size="md" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForbiddenPage;
