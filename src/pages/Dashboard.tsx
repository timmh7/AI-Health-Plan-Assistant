import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AuthGuard } from '@/components/AuthGuard';
import { useNavigate } from 'react-router-dom';

// Defined type for user profile
type UserProfile = {
  full_name: string;
  email: string;
  company_name: string;
  company_logo_url: string;
  plan_name: string;
  plan_type: string;
  plan_number: string;
}

const Dashboard = () => {
  // Dashboard variables
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile on render
  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUserSOB(user.id);
    }
  }, [user]);

  // Helper function that sends user's SOB URL for processing
  const fetchUserSOB = async (userId: string) => {
    try {
      // Step 1: Query for sob_url
      const { data, error } = await supabase
        .from("user_insurance")
        .select(`
          insurance_plans (
            sob_url
          )
        `)
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      // Step 2: Extract the URL
      const sobUrl = (data.insurance_plans as any)?.sob_url;
      console.log("sobURL: " + sobUrl)
      if (!sobUrl) throw new Error("No SOB URL found for user");

      // Step 3: Send PDF URL for parsing
      console.log("Now attempting to parse PDF...")
      const resp = await fetch('http://localhost:3001/api/extract-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfUrl: sobUrl }),
      });

      if (!resp.ok) throw new Error('Failed to extract PDF');

      const result = await resp.json();
      console.log('Extraction result:', result);

        // TODO: Parse JSON and send to your chatbot context
    } catch (err) {
      console.error("Error fetching user SOB:", err);
    }
  };


  const fetchUserProfile = async () => {
    try {
      // First, get user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user?.id)
        .single();

      // Error handling for getting profile
      if (profileError && profileError.code === 'PGRST116') {
        console.log("No profile found, redirecting to onboarding...");
        navigate('/onboarding');
        return;
      } else if (profileError) {
         throw profileError;
      }

      // Second, get user's insurance
      const { data: insuranceData, error: insuranceError } = await supabase
        .from('user_insurance')
        .select(`
          insurance_companies (
            name,
            logo_url
          ),
          insurance_plans (
            plan_name,
            plan_type,
            plan_number
          )
        `)
        .eq('user_id', user?.id) // user_insurance.user_id = user.id
        .single();

      // Handle errors
      if (insuranceError && insuranceError.code === 'PGRST116') {
        navigate('/onboarding');
        return;
      } else if (insuranceError) {
        throw insuranceError;
      } else if (!insuranceData) {
        navigate('/onboarding');
        return;
      }

      // helper function to set the user's dashboard profile + insurance
      setProfile({
        full_name: profileData.full_name || 'User',
        email: profileData.email || user?.email || '',
        company_name: (insuranceData.insurance_companies as any).name,
        company_logo_url: (insuranceData.insurance_companies as any).logo_url,
        plan_name: (insuranceData.insurance_plans as any).plan_name,
        plan_type: (insuranceData.insurance_plans as any).plan_type,
        plan_number: (insuranceData.insurance_plans as any).plan_number,
        //plan_description: (insuranceData.insurance_plans as any).description,
      });

    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error loading profile",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign out failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleChangePlan = () => {
    navigate('/onboarding');
  };

  const handleStartChat = () => {
    navigate('/chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        {/* Header */}
        <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center shadow-[var(--shadow-healthcare)]">
                <span className="text-sm font-bold text-primary-foreground">OC</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">OwnCare</h1>
                <p className="text-sm text-muted-foreground">Healthcare Plan Advisor</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              Welcome back, {profile?.full_name}!
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your personalized healthcare dashboard is ready. Ask questions about your plan, 
              find providers, or get help understanding your benefits.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Card */}
            <Card className="shadow-[var(--shadow-card)] border-0 bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Your Profile</span>
                </CardTitle>
                <CardDescription>Your account and personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{profile?.full_name}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Insurance Card */}
            <Card className="shadow-[var(--shadow-card)] border-0 bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Your Insurance Plan</span>
                  <Button variant="outline" size="sm" onClick={handleChangePlan}>
                    Change Plan
                  </Button>
                </CardTitle>
                <CardDescription>Your current healthcare coverage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={profile?.company_logo_url}
                    alt={profile?.company_name}
                    className="w-12 h-12 object-contain rounded-lg bg-background p-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <h3 className="font-semibold">{profile?.company_name}</h3>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">{profile?.plan_name}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">Plan Number: {profile?.plan_number}</p>
                    <Badge variant="secondary">{profile?.plan_type}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Chat Card */}
          <Card className="shadow-[var(--shadow-card)] border-0 bg-gradient-to-br from-primary/5 via-card to-card">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Ask About Your Plan</CardTitle>
              <CardDescription className="text-lg">
                Get instant answers about your healthcare benefits, coverage, and more
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-primary text-xl">🏥</span>
                  </div>
                  <p className="font-medium">Find Providers</p>
                  <p className="text-muted-foreground">Locate in-network doctors and specialists</p>
                </div>
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-primary text-xl">💊</span>
                  </div>
                  <p className="font-medium">Check Coverage</p>
                  <p className="text-muted-foreground">Understand your benefits and costs</p>
                </div>
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-primary text-xl">📋</span>
                  </div>
                  <p className="font-medium">Plan Details</p>
                  <p className="text-muted-foreground">Get help with claims and procedures</p>
                </div>
              </div>
              
              <Button 
                variant="healthcare" 
                size="lg" 
                onClick={handleStartChat}
                className="px-8"
              >
                Start Conversation
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Dashboard;