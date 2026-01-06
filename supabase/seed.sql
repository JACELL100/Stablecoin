-- Supabase Seed Data for Disaster Relief System
-- Run this after the migration to populate test data

-- ============================================
-- SAMPLE CAMPAIGNS
-- ============================================

INSERT INTO public.campaigns (id, name, description, disaster_type, region, country, target_amount, current_amount, status, start_date, beneficiary_count)
VALUES 
    (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Turkey-Syria Earthquake Relief 2024',
        'Emergency humanitarian response for communities affected by the devastating earthquake in southeastern Turkey and northern Syria. Funds will support shelter, food, medical supplies, and reconstruction efforts.',
        'earthquake',
        'Southeastern Anatolia',
        'Turkey',
        500000.00,
        324750.00,
        'active',
        NOW() - INTERVAL '30 days',
        1250
    ),
    (
        'b2c3d4e5-f678-90ab-cdef-123456789012',
        'Morocco Earthquake Humanitarian Response',
        'Supporting affected villages in the High Atlas mountains with emergency supplies, temporary shelter, and medical care following the devastating earthquake.',
        'earthquake',
        'High Atlas Region',
        'Morocco',
        350000.00,
        198500.00,
        'active',
        NOW() - INTERVAL '45 days',
        890
    ),
    (
        'c3d4e5f6-7890-abcd-ef12-345678901234',
        'Pakistan Monsoon Flood Relief',
        'Providing assistance to families displaced by severe monsoon flooding in Sindh and Punjab provinces. Includes clean water, food supplies, and temporary housing.',
        'flood',
        'Sindh Province',
        'Pakistan',
        750000.00,
        567000.00,
        'active',
        NOW() - INTERVAL '60 days',
        3200
    ),
    (
        'd4e5f678-90ab-cdef-1234-567890123456',
        'Hawaii Wildfire Recovery Fund',
        'Supporting Maui residents affected by the devastating wildfires with housing assistance, essential supplies, and community rebuilding.',
        'wildfire',
        'Maui Island',
        'USA',
        1000000.00,
        823000.00,
        'active',
        NOW() - INTERVAL '90 days',
        1500
    ),
    (
        'e5f67890-abcd-ef12-3456-789012345678',
        'Bangladesh Cyclone Relief',
        'Emergency response for coastal communities impacted by Cyclone Mocha. Providing immediate relief and long-term recovery support.',
        'hurricane',
        'Chittagong Division',
        'Bangladesh',
        250000.00,
        250000.00,
        'completed',
        NOW() - INTERVAL '180 days',
        2100
    );

-- ============================================
-- SAMPLE MERCHANTS
-- ============================================

INSERT INTO public.merchants (id, business_name, business_registration, category, location, region, wallet_address, is_verified, total_received, transaction_count)
VALUES
    (
        'f6789012-3456-7890-abcd-ef1234567890',
        'Local Food Market - Antakya',
        'TR-2024-FM-001',
        'food',
        '123 Main Street, Antakya',
        'Southeastern Anatolia',
        '0x1234567890123456789012345678901234567890',
        true,
        45600.00,
        324
    ),
    (
        '67890123-4567-8901-bcde-f12345678901',
        'Community Medical Clinic',
        'TR-2024-MC-002',
        'medical',
        '456 Health Ave, Gaziantep',
        'Southeastern Anatolia',
        '0x2345678901234567890123456789012345678901',
        true,
        78900.00,
        156
    ),
    (
        '78901234-5678-9012-cdef-123456789012',
        'Shelter Supply Store',
        'TR-2024-SS-003',
        'shelter',
        '789 Construction Rd, Kahramanmaras',
        'Southeastern Anatolia',
        '0x3456789012345678901234567890123456789012',
        true,
        123400.00,
        89
    ),
    (
        '89012345-6789-0123-def0-234567890123',
        'Utility Payment Center',
        'TR-2024-UP-004',
        'utilities',
        '321 Service St, Antakya',
        'Southeastern Anatolia',
        '0x4567890123456789012345678901234567890123',
        true,
        34500.00,
        567
    ),
    (
        '90123456-7890-1234-ef01-345678901234',
        'Regional Transport Co.',
        'TR-2024-RT-005',
        'transport',
        '654 Transit Blvd, Gaziantep',
        'Southeastern Anatolia',
        '0x5678901234567890123456789012345678901234',
        true,
        21300.00,
        234
    );

-- ============================================
-- SAMPLE TRANSACTIONS (for transparency demo)
-- ============================================

INSERT INTO public.transactions (id, transaction_type, from_address, to_address, amount, category, campaign_id, blockchain_tx_hash, blockchain_confirmed, status, created_at)
VALUES
    (
        'tx-00000001-0000-0000-0000-000000000001',
        'donation',
        '0xDonor1234567890123456789012345678901234',
        '0xCampaign234567890123456789012345678901',
        50000.00,
        NULL,
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '0xabc123def456789012345678901234567890abcdef123456789012345678901234',
        true,
        'confirmed',
        NOW() - INTERVAL '29 days'
    ),
    (
        'tx-00000001-0000-0000-0000-000000000002',
        'distribution',
        '0xCampaign234567890123456789012345678901',
        '0xBeneficiary12345678901234567890123456',
        500.00,
        'food',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '0xbcd234ef5678901234567890123456789012bcdef2345678901234567890123456',
        true,
        'confirmed',
        NOW() - INTERVAL '28 days'
    ),
    (
        'tx-00000001-0000-0000-0000-000000000003',
        'spending',
        '0xBeneficiary12345678901234567890123456',
        '0x1234567890123456789012345678901234567890',
        75.50,
        'food',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '0xcde345f67890123456789012345678901234cdef34567890123456789012345678',
        true,
        'confirmed',
        NOW() - INTERVAL '27 days'
    ),
    (
        'tx-00000001-0000-0000-0000-000000000004',
        'spending',
        '0xBeneficiary12345678901234567890123456',
        '0x2345678901234567890123456789012345678901',
        120.00,
        'medical',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '0xdef456078901234567890123456789012345def456789012345678901234567890',
        true,
        'confirmed',
        NOW() - INTERVAL '26 days'
    ),
    (
        'tx-00000001-0000-0000-0000-000000000005',
        'donation',
        '0xDonor2345678901234567890123456789012345',
        '0xCampaign234567890123456789012345678901',
        100000.00,
        NULL,
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '0xef5670189012345678901234567890123456ef567890123456789012345678901',
        true,
        'confirmed',
        NOW() - INTERVAL '20 days'
    );

-- ============================================
-- SPENDING STATISTICS BY CATEGORY
-- ============================================

-- Note: In production, these would be calculated from actual transactions
-- This is sample data for the transparency dashboard

CREATE TABLE IF NOT EXISTS public.spending_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id),
    category TEXT NOT NULL,
    total_amount DECIMAL(18, 2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.spending_analytics (campaign_id, category, total_amount, transaction_count, period_start, period_end)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'food', 756000.00, 4532, NOW() - INTERVAL '30 days', NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'medical', 423000.00, 1245, NOW() - INTERVAL '30 days', NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'shelter', 312000.00, 456, NOW() - INTERVAL '30 days', NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'utilities', 234000.00, 2134, NOW() - INTERVAL '30 days', NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'transport', 165000.00, 1567, NOW() - INTERVAL '30 days', NOW());
