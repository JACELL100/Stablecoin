-- Supabase Migration: Initial Schema for Disaster Relief System
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'donor' CHECK (role IN ('admin', 'ngo', 'donor', 'beneficiary', 'auditor')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'ngo')
        )
    );

-- ============================================
-- WALLETS
-- ============================================

CREATE TABLE public.wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    wallet_address TEXT UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallets" ON public.wallets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own wallets" ON public.wallets
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- CAMPAIGNS
-- ============================================

CREATE TABLE public.campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    disaster_type TEXT NOT NULL CHECK (disaster_type IN ('earthquake', 'flood', 'hurricane', 'wildfire', 'tsunami', 'drought', 'other')),
    region TEXT NOT NULL,
    country TEXT NOT NULL,
    target_amount DECIMAL(18, 2) NOT NULL,
    current_amount DECIMAL(18, 2) DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    beneficiary_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id),
    blockchain_campaign_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
    FOR SELECT USING (status = 'active' OR created_by = auth.uid());

CREATE POLICY "Admins can manage campaigns" ON public.campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'ngo')
        )
    );

-- ============================================
-- BENEFICIARIES
-- ============================================

CREATE TABLE public.beneficiaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    national_id TEXT NOT NULL,
    region TEXT NOT NULL,
    household_size INTEGER DEFAULT 1,
    needs_assessment TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    allocated_amount DECIMAL(18, 2) DEFAULT 0,
    spent_amount DECIMAL(18, 2) DEFAULT 0,
    risk_score DECIMAL(5, 4) DEFAULT 0.0,
    is_whitelisted_on_chain BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(national_id)
);

ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beneficiaries can view own record" ON public.beneficiaries
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage beneficiaries" ON public.beneficiaries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'ngo')
        )
    );

-- ============================================
-- MERCHANTS
-- ============================================

CREATE TABLE public.merchants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_registration TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('food', 'medical', 'shelter', 'utilities', 'transport')),
    location TEXT NOT NULL,
    region TEXT NOT NULL,
    wallet_address TEXT,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    total_received DECIMAL(18, 2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    is_registered_on_chain BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified merchants" ON public.merchants
    FOR SELECT USING (is_verified = true);

CREATE POLICY "Admins can manage merchants" ON public.merchants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'ngo')
        )
    );

-- ============================================
-- FUND ALLOCATIONS
-- ============================================

CREATE TABLE public.fund_allocations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    category_limits JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'distributed', 'revoked')),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    distributed_at TIMESTAMPTZ,
    blockchain_tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fund_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beneficiaries can view own allocations" ON public.fund_allocations
    FOR SELECT USING (
        beneficiary_id IN (
            SELECT id FROM public.beneficiaries WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage allocations" ON public.fund_allocations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'ngo')
        )
    );

-- ============================================
-- TRANSACTIONS
-- ============================================

CREATE TABLE public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('donation', 'distribution', 'spending', 'refund')),
    from_address TEXT,
    to_address TEXT,
    amount DECIMAL(18, 2) NOT NULL,
    category TEXT CHECK (category IN ('food', 'medical', 'shelter', 'utilities', 'transport')),
    campaign_id UUID REFERENCES public.campaigns(id),
    beneficiary_id UUID REFERENCES public.beneficiaries(id),
    merchant_id UUID REFERENCES public.merchants(id),
    reference TEXT,
    blockchain_tx_hash TEXT,
    blockchain_confirmed BOOLEAN DEFAULT false,
    block_number BIGINT,
    gas_used BIGINT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'flagged')),
    fraud_score DECIMAL(5, 4) DEFAULT 0.0,
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Public can view all confirmed transactions (transparency)
CREATE POLICY "Anyone can view confirmed transactions" ON public.transactions
    FOR SELECT USING (blockchain_confirmed = true);

CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (
        from_address IN (SELECT wallet_address FROM public.wallets WHERE user_id = auth.uid())
        OR to_address IN (SELECT wallet_address FROM public.wallets WHERE user_id = auth.uid())
    );

-- ============================================
-- DONATIONS
-- ============================================

CREATE TABLE public.donations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    donor_id UUID REFERENCES public.profiles(id),
    amount DECIMAL(18, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_method TEXT CHECK (payment_method IN ('crypto', 'card', 'bank')),
    transaction_id UUID REFERENCES public.transactions(id),
    is_anonymous BOOLEAN DEFAULT false,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donors can view own donations" ON public.donations
    FOR SELECT USING (donor_id = auth.uid() OR is_anonymous = false);

-- ============================================
-- FRAUD ALERTS
-- ============================================

CREATE TABLE public.fraud_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_id UUID REFERENCES public.transactions(id),
    beneficiary_id UUID REFERENCES public.beneficiaries(id),
    alert_type TEXT NOT NULL CHECK (alert_type IN ('high_frequency', 'unusual_amount', 'suspicious_pattern', 'velocity_breach', 'duplicate_transaction')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    ml_confidence DECIMAL(5, 4),
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view fraud alerts" ON public.fraud_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'ngo', 'auditor')
        )
    );

-- ============================================
-- AUDIT EVENTS
-- ============================================

CREATE TABLE public.audit_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL,
    actor_id UUID REFERENCES public.profiles(id),
    target_type TEXT,
    target_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auditors can view audit events" ON public.audit_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'auditor')
        )
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'donor')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update campaign amounts
CREATE OR REPLACE FUNCTION public.update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'donation' AND NEW.blockchain_confirmed = true THEN
        UPDATE public.campaigns 
        SET current_amount = current_amount + NEW.amount
        WHERE id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_donation_confirmed
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW 
    WHEN (NEW.transaction_type = 'donation')
    EXECUTE FUNCTION public.update_campaign_amount();

-- Function to update beneficiary spent amount
CREATE OR REPLACE FUNCTION public.update_beneficiary_spending()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'spending' AND NEW.blockchain_confirmed = true THEN
        UPDATE public.beneficiaries 
        SET spent_amount = spent_amount + NEW.amount
        WHERE id = NEW.beneficiary_id;
        
        UPDATE public.merchants 
        SET total_received = total_received + NEW.amount,
            transaction_count = transaction_count + 1
        WHERE id = NEW.merchant_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_spending_confirmed
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW 
    WHEN (NEW.transaction_type = 'spending')
    EXECUTE FUNCTION public.update_beneficiary_spending();

-- Function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_beneficiaries_updated_at
    BEFORE UPDATE ON public.beneficiaries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_merchants_updated_at
    BEFORE UPDATE ON public.merchants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallets_address ON public.wallets(wallet_address);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_region ON public.campaigns(region);
CREATE INDEX idx_beneficiaries_user_id ON public.beneficiaries(user_id);
CREATE INDEX idx_beneficiaries_status ON public.beneficiaries(verification_status);
CREATE INDEX idx_merchants_category ON public.merchants(category);
CREATE INDEX idx_merchants_region ON public.merchants(region);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_campaign ON public.transactions(campaign_id);
CREATE INDEX idx_transactions_beneficiary ON public.transactions(beneficiary_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_hash ON public.transactions(blockchain_tx_hash);
CREATE INDEX idx_fraud_alerts_unresolved ON public.fraud_alerts(is_resolved) WHERE is_resolved = false;
CREATE INDEX idx_audit_events_actor ON public.audit_events(actor_id);
CREATE INDEX idx_audit_events_created ON public.audit_events(created_at DESC);

-- ============================================
-- VIEWS FOR TRANSPARENCY DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW public.transparency_stats AS
SELECT 
    (SELECT COALESCE(SUM(current_amount), 0) FROM public.campaigns WHERE status = 'active') as total_raised,
    (SELECT COALESCE(SUM(amount), 0) FROM public.transactions WHERE transaction_type = 'distribution' AND blockchain_confirmed = true) as total_distributed,
    (SELECT COUNT(*) FROM public.beneficiaries WHERE verification_status = 'verified') as total_beneficiaries,
    (SELECT COUNT(*) FROM public.merchants WHERE is_verified = true) as total_merchants,
    (SELECT COUNT(*) FROM public.campaigns WHERE status = 'active') as active_campaigns,
    (SELECT COUNT(*) FROM public.transactions WHERE blockchain_confirmed = true) as total_transactions;

-- Grant access to the view
GRANT SELECT ON public.transparency_stats TO anon, authenticated;

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Uncomment to add sample data for testing
/*
INSERT INTO public.campaigns (name, description, disaster_type, region, country, target_amount, status, start_date)
VALUES 
    ('Turkey Earthquake Relief 2024', 'Emergency relief for earthquake victims in southeastern Turkey', 'earthquake', 'Southeastern Anatolia', 'Turkey', 500000.00, 'active', NOW()),
    ('Morocco Earthquake Response', 'Humanitarian aid for affected communities in Morocco', 'earthquake', 'High Atlas', 'Morocco', 350000.00, 'active', NOW()),
    ('Pakistan Flood Relief', 'Support for flood-affected families in Pakistan', 'flood', 'Sindh', 'Pakistan', 750000.00, 'active', NOW());
*/
