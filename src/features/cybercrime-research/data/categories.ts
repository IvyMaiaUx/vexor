/**
 * VEXOR — Official Cybercrime Research Categories
 *
 * The 10 official taxonomies established for the Vexor community.
 */

import type { ResearchCategory } from "../types";

export const RESEARCH_CATEGORIES: ResearchCategory[] = [
  {
    id: "cat-malware-ransomware",
    slug: "malware-ransomware",
    name_pt: "Malware & Ransomware",
    name_en: "Malware & Ransomware",
    description_pt:
      "Engenharia reversa de artefatos maliciosos, técnicas de evasão de EDR, operadores de ransomware e mecanismos criptográficos de extorsão.",
    description_en:
      "Reverse engineering of malicious binaries, EDR evasion techniques, ransomware operators, and cryptographic extortion mechanisms.",
    icon: "🦠",
    itemCount: 14,
    pillar: "investigation",
  },
  {
    id: "cat-phishing-social-engineering",
    slug: "phishing-social-engineering",
    name_pt: "Phishing & Engenharia Social",
    name_en: "Phishing & Social Engineering",
    description_pt:
      "Kits de phishing corporativo, vetores de spear-phishing por IA, bypass de MFA via AiTM (Adversary-in-the-Middle) e campanhas de personificação.",
    description_en:
      "Enterprise phishing kits, AI-driven spear-phishing vectors, AiTM (Adversary-in-the-Middle) MFA bypass, and targeted impersonation campaigns.",
    icon: "🎣",
    itemCount: 9,
    pillar: "both",
  },
  {
    id: "cat-data-breaches",
    slug: "data-breaches",
    name_pt: "Vazamento de Dados",
    name_en: "Data Breaches",
    description_pt:
      "Investigação de exfiltração de dados corporativos, bancos relacionais expostos, credenciais vazadas e análise de impacto em privacidade.",
    description_en:
      "Investigation into corporate exfiltration pipelines, exposed databases, credential dumps, and privacy impact assessments.",
    icon: "🔓",
    itemCount: 12,
    pillar: "investigation",
  },
  {
    id: "cat-dark-web-research",
    slug: "dark-web-research",
    name_pt: "Pesquisa em Dark Web",
    name_en: "Dark Web Research",
    description_pt:
      "Mapeamento de mercados clandestinos, fóruns subterrâneos de compra e venda de acessos (IABs), monitoramento de canais Tor e I2P.",
    description_en:
      "Mapping underground marketplaces, initial access broker (IAB) communities, and telemetry monitoring across Tor and I2P hidden services.",
    icon: "🕵️",
    itemCount: 11,
    pillar: "underground",
  },
  {
    id: "cat-financial-cybercrime",
    slug: "financial-cybercrime",
    name_pt: "Cibercrime Financeiro & Fraudes",
    name_en: "Financial Cybercrime",
    description_pt:
      "Fraudes em transferências bancárias instantâneas, banking trojans, redes de lavagem de dinheiro cripto e esquemas de romance/pig butchering.",
    description_en:
      "Instant banking fraud, banking trojans, cryptocurrency laundering syndicates, and organized pig-butchering/investment fraud operations.",
    icon: "💳",
    itemCount: 8,
    pillar: "underground",
  },
  {
    id: "cat-botnets-ddos",
    slug: "botnets-ddos",
    name_pt: "Botnets & Ataques DDoS",
    name_en: "Botnets & DDoS",
    description_pt:
      "Arquiteturas de botnets IoT baseadas em Mirai, redes de proxies residenciais ilícitas, serviços de Booter/Stresser e volumetria de negação de serviço.",
    description_en:
      "Mirai-based IoT botnet architectures, illicit residential proxy networks, Booter/Stresser operations, and volumetric DDoS mitigation.",
    icon: "🤖",
    itemCount: 7,
    pillar: "investigation",
  },
  {
    id: "cat-identity-theft",
    slug: "identity-theft",
    name_pt: "Roubo de Identidade & Contas",
    name_en: "Identity Theft",
    description_pt:
      "Info-stealers (RedLine, Lumma, Vidar), roubo de tokens de sessão de navegadores, credential stuffing e clonagem de identidade digital.",
    description_en:
      "Info-stealers (RedLine, Lumma, Vidar), browser session cookie hijacking, credential stuffing attacks, and digital identity fraud.",
    icon: "🪪",
    itemCount: 10,
    pillar: "both",
  },
  {
    id: "cat-cybercrime-cases",
    slug: "cybercrime-cases",
    name_pt: "Estudos de Casos Criminais",
    name_en: "Cybercrime Cases",
    description_pt:
      "Autópsias completas de incidentes notórios, cronologias de invasão, reconstrução forense de brechas reais e resposta a incidentes.",
    description_en:
      "Complete post-mortems of notorious security incidents, attack timelines, digital forensics reconstructions, and incident response learnings.",
    icon: "📁",
    itemCount: 15,
    pillar: "investigation",
  },
  {
    id: "cat-cyber-law",
    slug: "cyber-law",
    name_pt: "Direito Cibernético & Legislação",
    name_en: "Cyber Law & Policy",
    description_pt:
      "Cooperação jurídica internacional (MLAT), apreensões conjuntas de infraestrutura, legislação de proteção de dados e limites éticos da perícia.",
    description_en:
      "Cross-border legal cooperation (MLAT), law enforcement infrastructure takedowns, data privacy statutes, and ethical boundaries of forensics.",
    icon: "⚖️",
    itemCount: 6,
    pillar: "both",
  },
  {
    id: "cat-threat-actors",
    slug: "threat-actors",
    name_pt: "Atores de Ameaça & Grupos APT",
    name_en: "Threat Actors & APTs",
    description_pt:
      "Perfis táticos de grupos patrocinados por Estados e sindicatos do crime organizado, mapeamento de TTPs no MITRE ATT&CK e infraestrutura C2.",
    description_en:
      "Tactical dossiers on state-sponsored actors and organized cybercrime syndicates, MITRE ATT&CK TTP mapping, and command-and-control tracking.",
    icon: "🎯",
    itemCount: 13,
    pillar: "underground",
  },
];

export function getCategoryBySlug(slug: string): ResearchCategory | undefined {
  return RESEARCH_CATEGORIES.find((c) => c.slug === slug);
}
