-- Initial categories (shared by catalog and forum). Safe to re-run.
insert into public.categories (slug, name_en, name_pt, scope, sort_order) values
  ('blue-team',           'Blue Team',                                   'Blue Team',                                      'both',  10),
  ('red-team',            'Red Team',                                    'Red Team',                                       'both',  20),
  ('osint',               'OSINT',                                       'OSINT',                                          'both',  30),
  ('dfir',                'DFIR — Digital Forensics and Incident Response', 'DFIR — Forense Digital e Resposta a Incidentes', 'both',  40),
  ('application-security','Application Security',                        'Segurança de Aplicações',                        'both',  50),
  ('cloud-security',      'Cloud Security',                              'Segurança em Nuvem',                             'both',  60),
  ('threat-intelligence', 'Threat Intelligence',                         'Inteligência de Ameaças',                        'both',  70),
  ('malware-analysis',    'Malware Analysis',                            'Análise de Malware',                             'both',  80),
  ('network-security',    'Network Security',                            'Segurança de Redes',                             'both',  90),
  ('grc',                 'GRC — Governance, Risk and Compliance',       'GRC — Governança, Riscos e Conformidade',        'both', 100),
  ('ai-security',         'AI Security',                                 'Segurança de IA',                                'both', 110),
  ('career-learning',     'Career & Learning',                           'Carreira e Aprendizado',                         'both', 120)
on conflict (slug) do nothing;
