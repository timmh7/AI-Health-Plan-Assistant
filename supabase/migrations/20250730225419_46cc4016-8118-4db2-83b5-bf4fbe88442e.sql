-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create insurance companies table
CREATE TABLE public.insurance_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create insurance plans table
CREATE TABLE public.insurance_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL, -- 'HMO', 'PPO', 'EPO', 'POS'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user insurance selections table
CREATE TABLE public.user_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES public.insurance_companies(id),
  plan_id UUID NOT NULL REFERENCES public.insurance_plans(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_insurance ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Insurance companies are viewable by everyone (public data)
CREATE POLICY "Insurance companies are viewable by everyone" 
ON public.insurance_companies 
FOR SELECT 
USING (true);

-- Insurance plans are viewable by everyone (public data)
CREATE POLICY "Insurance plans are viewable by everyone" 
ON public.insurance_plans 
FOR SELECT 
USING (true);

-- User insurance policies
CREATE POLICY "Users can view their own insurance" 
ON public.user_insurance 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own insurance selection" 
ON public.user_insurance 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insurance selection" 
ON public.user_insurance 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_insurance_updated_at
BEFORE UPDATE ON public.user_insurance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample insurance companies
INSERT INTO public.insurance_companies (name, logo_url) VALUES
('Blue Cross Blue Shield', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Blue_Cross_Blue_Shield_Association_logo.svg/512px-Blue_Cross_Blue_Shield_Association_logo.svg.png'),
('Aetna', 'https://logos-world.net/wp-content/uploads/2021/02/Aetna-Logo.png'),
('Cigna', 'https://logos-world.net/wp-content/uploads/2020/12/Cigna-Logo.png'),
('UnitedHealthcare', 'https://logos-world.net/wp-content/uploads/2021/02/UnitedHealth-Group-Logo.png'),
('Kaiser Permanente', 'https://logos-world.net/wp-content/uploads/2021/02/Kaiser-Permanente-Logo.png'),
('Anthem', 'https://logos-world.net/wp-content/uploads/2021/02/Anthem-Logo.png');

-- Insert sample insurance plans
INSERT INTO public.insurance_plans (company_id, name, plan_type, description) VALUES
-- Blue Cross Blue Shield plans
((SELECT id FROM public.insurance_companies WHERE name = 'Blue Cross Blue Shield'), 'Blue Advantage HMO', 'HMO', 'Comprehensive HMO plan with local provider network'),
((SELECT id FROM public.insurance_companies WHERE name = 'Blue Cross Blue Shield'), 'Blue Options PPO', 'PPO', 'Flexible PPO plan with nationwide coverage'),
((SELECT id FROM public.insurance_companies WHERE name = 'Blue Cross Blue Shield'), 'Blue Focus EPO', 'EPO', 'Cost-effective EPO plan with regional coverage'),

-- Aetna plans
((SELECT id FROM public.insurance_companies WHERE name = 'Aetna'), 'Aetna Better Health HMO', 'HMO', 'Value-focused HMO with preventive care emphasis'),
((SELECT id FROM public.insurance_companies WHERE name = 'Aetna'), 'Aetna Open Access PPO', 'PPO', 'Premium PPO with extensive provider choices'),
((SELECT id FROM public.insurance_companies WHERE name = 'Aetna'), 'Aetna Whole Health EPO', 'EPO', 'Integrated EPO plan with wellness programs'),

-- Cigna plans
((SELECT id FROM public.insurance_companies WHERE name = 'Cigna'), 'Cigna Connect HMO', 'HMO', 'Modern HMO with digital health tools'),
((SELECT id FROM public.insurance_companies WHERE name = 'Cigna'), 'Cigna Total Care PPO', 'PPO', 'Comprehensive PPO with global coverage'),

-- UnitedHealthcare plans
((SELECT id FROM public.insurance_companies WHERE name = 'UnitedHealthcare'), 'UnitedHealth Choice HMO', 'HMO', 'Affordable HMO with care coordination'),
((SELECT id FROM public.insurance_companies WHERE name = 'UnitedHealthcare'), 'UnitedHealth Options PPO', 'PPO', 'Full-service PPO with wellness benefits'),

-- Kaiser Permanente plans
((SELECT id FROM public.insurance_companies WHERE name = 'Kaiser Permanente'), 'Kaiser HMO', 'HMO', 'Integrated care HMO with Kaiser facilities'),
((SELECT id FROM public.insurance_companies WHERE name = 'Kaiser Permanente'), 'Kaiser Deductible HMO', 'HMO', 'Lower premium HMO with higher deductible'),

-- Anthem plans
((SELECT id FROM public.insurance_companies WHERE name = 'Anthem'), 'Anthem Pathway HMO', 'HMO', 'Basic HMO coverage with essential benefits'),
((SELECT id FROM public.insurance_companies WHERE name = 'Anthem'), 'Anthem Freedom PPO', 'PPO', 'Premium PPO with maximum flexibility');