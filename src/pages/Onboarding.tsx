import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AuthGuard } from '@/components/AuthGuard';
import { useNavigate } from 'react-router-dom';

interface InsuranceCompany {
  id: string;
  name: string;
  logo_url: string;
}

interface InsurancePlan {
  id: string;
  name: string;
  plan_type: string;
  description: string;
}

const Onboarding = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  // 1. On render fetch all companies from our current database
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Helper function to grab companies
  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error loading insurance companies",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Helper function to grab insurance company's plans
  const fetchPlans = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('insurance_plans')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Error loading insurance plans",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // 2. Set the selected company and then fetch the corresponding plans
  const handleCompanySelect = async (companyId: string) => {
    setSelectedCompany(companyId);
    setSelectedPlan('');
    await fetchPlans(companyId);
    setStep(2);
  };

  // 3. Complete user's insurance plan setup by:
  //    1. Creating or updating the user's plans in supabase
  //    2. Redirecting to dashboard accordingly or display error message
  const handleComplete = async () => {
    if (!user || !selectedCompany || !selectedPlan) return;

    try {
      setLoading(true);

      // Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name,
        }, {
          onConflict: 'user_id',
        });

      if (profileError) throw profileError;

      // Create or update insurance selection
      const { error: insuranceError } = await supabase
        .from('user_insurance')
        .upsert({
          user_id: user.id,
          company_id: selectedCompany,
          plan_id: selectedPlan,
          }, {
            onConflict: 'user_id',
        });

      if (insuranceError) throw insuranceError;

      toast({
        title: "Welcome to OwnCare!",
        description: "Your profile has been set up successfully.",
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Setup failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center shadow-[var(--shadow-healthcare)]">
              <span className="text-xl font-bold text-primary-foreground">OC</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Set up your profile</h1>
              <p className="text-muted-foreground">Help us personalize your healthcare experience</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-8 h-px ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          {/* Step 1: Insurance Company */}
          {step === 1 && (
            <Card className="shadow-[var(--shadow-card)] border-0 bg-gradient-to-br from-card to-card/50">
              <CardHeader className="text-center">
                <CardTitle>Select your insurance company</CardTitle>
                <CardDescription>
                  Choose your current health insurance provider
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleCompanySelect(company.id)} // Handle storing company when selected
                      className="p-6 border-2 border-border rounded-lg hover:border-primary hover:shadow-[var(--shadow-hover)] transition-[var(--transition-healthcare)] text-left space-y-3"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={company.logo_url}
                          alt={company.name}
                          className="w-10 h-10 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <h3 className="font-semibold text-foreground">{company.name}</h3>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Insurance Plan */}
          {step === 2 && (
            <Card className="shadow-[var(--shadow-card)] border-0 bg-gradient-to-br from-card to-card/50">
              <CardHeader className="text-center">
                <CardTitle>Select your insurance plan</CardTitle>
                <CardDescription>
                  Choose your specific plan with {selectedCompanyData?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedCompanyData && (
                  <div className="flex items-center justify-center space-x-3 p-4 bg-accent rounded-lg">
                    <img
                      src={selectedCompanyData.logo_url}
                      alt={selectedCompanyData.name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="font-medium text-accent-foreground">{selectedCompanyData.name}</span>
                  </div>
                )}

                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose your insurance plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="text-left">
                          <div className="font-medium">{plan.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {plan.plan_type} • {plan.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    variant="healthcare"
                    onClick={handleComplete}
                    disabled={!selectedPlan || loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                        Setting up...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default Onboarding;