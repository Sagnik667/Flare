import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { ShieldAlert, Home } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-6 px-4">
      <Card className="max-w-md w-full text-center p-8 border-border bg-bg-surface flex flex-col items-center">
        <ShieldAlert className="h-16 w-16 text-sos mb-4 animate-bounce" />
        <h2 className="text-3xl font-display font-black text-text-primary mb-2">404 - Not Found</h2>
        <p className="text-xs text-text-secondary leading-relaxed mb-6">
          The safety command coordinates or endpoint path you requested could not be resolved.
        </p>
        <Button onClick={() => navigate('/')} icon={Home}>
          Back to Safety Home
        </Button>
      </Card>
    </div>
  );
};

export default NotFound;
