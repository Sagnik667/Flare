import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Shield, FileText, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';

export const ResponderInfo = () => {
  const navigate = useNavigate();

  const steps = [
    {
      icon: <UserPlus className="h-6 w-6 text-accent" />,
      title: "1. Create Account",
      description: "Register a standard account with your basic contact information. All volunteers start with a secure standard profile."
    },
    {
      icon: <LogIn className="h-6 w-6 text-accent" />,
      title: "2. Log In",
      description: "Log into the Flare system using your registered email and password credentials to access the user command center."
    },
    {
      icon: <FileText className="h-6 w-6 text-accent" />,
      title: "3. Submit Application",
      description: "Navigate to the 'Become Responder' tab on your dashboard. Provide your home coordinates, service range, and upload a valid ID document."
    },
    {
      icon: <CheckCircle2 className="h-6 w-6 text-success" />,
      title: "4. Admin Verification",
      description: "Our administrative team will review your physical address and credentials. Once approved, your profile transitions to a Volunteer Responder."
    }
  ];

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-6 px-4">
      <Card className="w-full max-w-2xl bg-bg-surface border border-border shadow-2xl p-8 relative overflow-hidden text-left">
        <div className="absolute top-0 left-0 h-1.5 w-full bg-accent" />

        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-accent-light" />
          </div>
          <h2 className="text-2xl font-display font-bold text-text-primary">
            Become a Safety Responder
          </h2>
          <p className="text-sm text-text-secondary mt-1 max-w-md">
            Join the Flare network to receive emergency SOS alerts near your location and help protect your community.
          </p>
        </div>

        <div className="space-y-6 mb-8">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest border-b border-border pb-2">
            Onboarding Workflow
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-3 items-start bg-bg-raised/30 p-4 border border-border/50 rounded-lg">
                <div className="shrink-0 mt-1">{step.icon}</div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary">{step.title}</h4>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 border-t border-border pt-6">
          <Button
            onClick={() => navigate('/register')}
            className="flex-1"
          >
            Create Account
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/login')}
            className="flex-1"
          >
            Log In
          </Button>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-text-secondary hover:text-accent transition-colors font-medium">
            ← Back to Home Page
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ResponderInfo;
