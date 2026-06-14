-- ============================================================
-- SVAAS VENTURE OS — Seed Data
-- Creates the SVAAS venture with initial streams and dependencies
-- Run AFTER schema.sql
-- ============================================================

-- Create a default user (will be replaced by auth user on first login)
INSERT INTO users (id, email, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'vidhi@svaas.in', 'Vidhi Vakil')
ON CONFLICT (email) DO NOTHING;

-- Create SVAAS as Venture #1
INSERT INTO ventures (id, owner_id, name, slug, description, launch_start_date, launch_target_days, current_phase, settings) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'SVAAS', 'svaas',
   'Premium botanical wellness brand. Beauty Inside Out. Ritual Wellness. Handmade. Chennai.',
   '2026-04-18', 180, 'P1',
   '{"dream_protection_target": 5, "launch_type": "public_launch"}'
  )
ON CONFLICT (owner_id, slug) DO NOTHING;

-- Create Venture Streams
INSERT INTO venture_streams (id, venture_id, name, slug, display_order, status, current_bottleneck, waiting_on, next_milestone, departments) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000010', 'Legal & Structure', 'legal', 1, 'red', 'Entity not formed (no structure decision made)', 'Founder decision on LLP vs Pvt Ltd', 'LLP formed + COI received', ARRAY['LEGAL', 'COMPLIANCE']),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000010', 'Product & Pilot', 'product', 2, 'red', 'QP not confirmed (blocks licence → everything)', 'Founder to have one conversation with cousin', 'MFR locked + First batch with BMR', ARRAY['PRODUCT', 'COMPLIANCE', 'TESTING', 'SUPPLY CHAIN']),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000010', 'Packaging & Brand', 'packaging', 3, 'yellow', 'Labels blocked by MRP decision + licence number', 'MRP decision (due Day 56), GS1 barcode registration', 'Label content finalized', ARRAY['PACKAGING', 'BRAND']),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000010', 'Digital & Website', 'digital', 4, 'yellow', 'Website build waiting on brand identity lock', 'Photography (needs product samples first)', 'Shopify store live (not public)', ARRAY['DIGITAL', 'MARKETING']),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000010', 'Social & Community', 'social', 5, 'grey', 'Content needs photography + brand lock', 'Product photography (Day 42-63)', 'Instagram profile set up + 30 posts planned', ARRAY['MARKETING', 'CUSTOMER']),
  ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000010', 'Founder OS', 'founder', 6, 'yellow', 'Need to establish weekly review cadence', NULL, 'First weekly review completed', ARRAY['FOUNDER', 'OODLES']),
  ('00000000-0000-0000-0001-000000000007', '00000000-0000-0000-0000-000000000010', 'Finance', 'finance', 7, 'yellow', 'Bank account needs COI (needs entity formed)', 'LLP formation to complete', 'Bank account open + Zoho Books setup', ARRAY['FINANCE'])
ON CONFLICT DO NOTHING;

-- Create Stream Dependencies
INSERT INTO stream_dependencies (venture_id, upstream_stream_id, downstream_stream_id, dependency_type, reason, strength) VALUES
  -- Legal blocks Finance, Packaging, Digital
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0001-000000000007', 'hard_block', 'Finance needs COI for bank account, GST registration', 5),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0001-000000000003', 'soft_block', 'Packaging needs TM symbol, licence number for final labels', 3),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0001-000000000004', 'soft_block', 'Digital needs entity for payment gateway KYC', 2),
  -- Product blocks Packaging, Digital, Social
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0001-000000000003', 'hard_block', 'Packaging needs formula lock for INCI list, samples for photography', 4),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0001-000000000004', 'soft_block', 'Digital needs product photography, pricing decision', 3),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0001-000000000005', 'soft_block', 'Social needs photography, beta results for testimonials', 3),
  -- Packaging blocks Digital, Social
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0001-000000000004', 'soft_block', 'Digital needs final packaging for product page photography', 2),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0001-000000000005', 'enables', 'Social needs brand assets for content creation', 2),
  -- Digital blocks Social
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0001-000000000005', 'soft_block', 'Social needs live website for link-in-bio and conversion', 1)
ON CONFLICT DO NOTHING;

-- Create initial milestones
INSERT INTO milestones (id, venture_id, title, day_target, phase, gate_criteria, status) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000010', 'Foundation Set', 30, 'P0',
   '[{"description":"LLP formed + COI received","met":false},{"description":"PAN obtained","met":false},{"description":"Bank account open","met":false},{"description":"Trademark filed (both names)","met":false},{"description":"Domain purchased","met":true},{"description":"Oodles service agreement signed","met":false},{"description":"QP cousin confirmed","met":false},{"description":"Founder Decision Log started","met":true}]',
   'at_risk'),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000010', 'Compliance In Motion', 60, 'P1',
   '[{"description":"GST registered","met":false},{"description":"Manufacturing room prepared","met":false},{"description":"Equipment procured and installed","met":false},{"description":"Licence application submitted","met":false},{"description":"Regulatory consultant engaged","met":false},{"description":"MFR locked for all 3 SKUs","met":false},{"description":"SOP-MFG-001 and 002 written","met":false},{"description":"Ingredient vendor master built","met":false}]',
   'upcoming'),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000010', 'Soft Launch Ready', 105, 'P3-P4',
   '[{"description":"Beta Round 1 complete (15 testers)","met":false},{"description":"Go/no-go criteria assessed","met":false},{"description":"Fragrance evaluation done","met":false},{"description":"Labels finalised","met":false},{"description":"Packaging printed and assembled","met":false},{"description":"200 units hair oil in FG","met":false},{"description":"Shopify live (not public)","met":false},{"description":"First 30 Instagram posts planned","met":false}]',
   'upcoming'),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000010', 'Soft Launch Live', 120, 'P5',
   '[{"description":"First 50 orders dispatched","met":false},{"description":"Instagram launch content posted","met":false},{"description":"15 micro-influencers seeded","met":false},{"description":"First corporate gifting pitch sent","met":false},{"description":"Returns process tested","met":false},{"description":"First 50 customers tagged as Founding Customers","met":false}]',
   'upcoming'),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-000000000010', 'Public Launch Live', 180, 'P5',
   '[{"description":"Shopify publicly discoverable","met":false},{"description":"First paid Instagram campaign live","met":false},{"description":"Retail pitch formally made","met":false},{"description":"100 total customers reached","met":false},{"description":"Monthly revenue Rs.30,000-60,000","met":false}]',
   'upcoming')
ON CONFLICT DO NOTHING;

-- Create initial decisions
INSERT INTO decisions (id, venture_id, title, context, options, default_option, default_rationale, deadline, status, impact_score, streams_affected, tasks_affected, estimated_delay_days, cascade_depth) VALUES
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000010',
   'Business Structure', 'LLP vs Private Limited vs Proprietorship', 
   '[{"label":"LLP","description":"Simple, cheap, IP protection, scales to Pvt Ltd later"},{"label":"Private Limited","description":"Better for fundraising, more compliance"},{"label":"Proprietorship","description":"Simplest but no IP separation"}]',
   'LLP', 'Cheapest, protects IP, converts to Pvt Ltd later if needed', '2026-04-25', 'pending', 87, 3, 27, 40, 4),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000010',
   'Launch MRP', '₹499 vs ₹599 vs ₹699. SVAAS at ₹599 = ₹5.99/ml. Target COGS: <₹140/unit.',
   '[{"label":"₹499","description":"Accessible, lower margin"},{"label":"₹599","description":"Middle positioning, best margins"},{"label":"₹699","description":"Premium positioning"}]',
   '₹599', 'Middle positioning between Indulekha and Kama. D2C contribution ₹380/unit.', '2026-06-15', 'pending', 54, 2, 12, 9, 2),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000010',
   'Launch SKU Count', 'Launch with 1 SKU vs 3 SKUs vs 5+',
   '[{"label":"1 SKU (Hair Oil only)","description":"Maximum focus"},{"label":"3 SKUs (Oil + 2 Bath Salts)","description":"Ecosystem feel, gifting potential"},{"label":"5+ SKUs","description":"Full range but high operational load"}]',
   '3 SKUs (Oil + 2 Bath Salts)', 'Ecosystem feel without excessive complexity. Bath salts simple to produce.', '2026-06-10', 'pending', 38, 2, 8, 6, 2),
  ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000010',
   'Packaging Finalization', 'Use existing 1100 PET bottles vs order new amber PET',
   '[{"label":"Use existing bottles + new labels","description":"Fastest, uses sunk inventory"},{"label":"Order new amber PET","description":"Premium but 4-6 week delay"},{"label":"Hybrid: existing for soft, amber for public","description":"Best of both"}]',
   'Hybrid: existing for soft, amber for public', 'No delay to soft launch, premium for public launch.', '2026-06-20', 'pending', 35, 2, 9, 0, 2),
  ('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000010',
   'Fragrance Direction', 'Preserve authentic smell vs adjust vs redesign',
   '[{"label":"Preserve + minor EO adjustment","description":"Increase bergamot/lavender, authentic with better first impression"},{"label":"Significant redesign","description":"Complete EO overhaul, risk losing character"},{"label":"Keep as-is","description":"Position honestly, no formula change"}]',
   'Preserve + minor EO adjustment', 'Respects Rule #9. Minor adjustments without compromising identity.', '2026-06-25', 'pending', 18, 1, 5, 0, 1)
ON CONFLICT DO NOTHING;
