SET search_path TO databridge, public;

INSERT INTO legacy_accounts (name, industry, annual_revenue, billing_city, sync_status) VALUES
    ('Acme Corporation',       'Manufacturing', 5200000.00, 'Warsaw',    'pending'),
    ('Globex Industries',      'Technology',    8750000.00, 'Krakow',    'pending'),
    ('Initech Solutions',      'Technology',    1200000.00, 'Wroclaw',   'pending'),
    ('Umbrella Holdings',      'Biotech',       9999000.00, 'Gdansk',    'pending'),
    ('Stark Enterprises',      'Energy',       12500000.00, 'Poznan',    'pending'),
    ('Wayne Industries',       'Defense',      15000000.00, 'Warsaw',    'pending'),
    ('Cyberdyne Systems',      'Technology',    3400000.00, 'Lodz',      'pending'),
    ('Hooli Corp',             'Technology',    6200000.00, 'Katowice',  'pending'),
    ('Pied Piper Labs',        'Technology',     450000.00, 'Lublin',    'pending'),
    ('Massive Dynamic',        'R&D',          22000000.00, 'Warsaw',    'pending');

-- Seed legacy_contacts for a subset of accounts.
-- contacts via NULL initially. After first sync, external_id will be filled.
-- For the seed, we insert contacts without account linkage; once SF assigns
-- IDs, we can backfill account_external_id via MuleSoft logic.
INSERT INTO legacy_contacts (first_name, last_name, email) VALUES
    ('Anna',      'Kowalska',   'anna.kowalska@acme.example'),
    ('Jan',       'Nowak',      'jan.nowak@acme.example'),
    ('Piotr',     'Lewandowski','piotr.lewandowski@globex.example'),
    ('Katarzyna', 'Wojcik',     'katarzyna.wojcik@initech.example'),
    ('Tomasz',    'Kaminski',   'tomasz.kaminski@umbrella.example'),
    ('Magdalena', 'Zielinska',  'magdalena.zielinska@stark.example'),
    ('Krzysztof', 'Szymanski',  'krzysztof.szymanski@wayne.example'),
    ('Agnieszka', 'Wozniak',    'agnieszka.wozniak@cyberdyne.example');

SELECT COUNT(*) AS accounts_count FROM legacy_accounts;
SELECT COUNT(*) AS contacts_count FROM legacy_contacts;