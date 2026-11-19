export const SUPPORTED_LOCALES = ["pt-BR", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "pt-BR";

export type ResourceType =
  | "tool"
  | "repository"
  | "script"
  | "framework"
  | "documentation"
  | "lab"
  | "ctf_platform"
  | "course"
  | "article";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export type ResourceLanguage = "en" | "pt-BR" | "multilingual" | "other";

export type ResourceStatus = "pending" | "approved" | "rejected" | "archived";

export type ResourcePricingModel = "free" | "freemium" | "paid";

export type ResourceCreditCardRequirement =
  | "yes"
  | "no"
  | "depends"
  | "not_informed";

export type ResourceOptionalTag = "open_source" | "self_hosted";

export type ResourceStandardTag =
  | "free"
  | "freemium"
  | "paid"
  | "no_card"
  | "card_required"
  | "card_depends"
  | "card_not_informed"
  | "open_source"
  | "self_hosted";

export interface CategoryItem {
  slug: string;
  code: string;
  name_pt: string;
  name_en: string;
  description_pt: string;
  description_en: string;
  accent: "cyan" | "indigo" | "emerald" | "violet";
}

export interface FeaturedResourceItem {
  slug: string;
  name: string;
  description_pt: string;
  description_en: string;
  categorySlug: string;
  type: ResourceType;
  url: string;
  language: ResourceLanguage;
  difficulty?: DifficultyLevel;
  authorName: string;
  publishedAt: string;
  status?: ResourceStatus;
  rejectionReason?: string;
  submittedByUsername?: string;
  createdAt?: string;
  pricingModel?: ResourcePricingModel | null;
  requiresCreditCard?: ResourceCreditCardRequirement | null;
  freeTierLimits?: string | null;
  pricingNotes?: string | null;
  tags?: ResourceStandardTag[];
}

export interface FeaturedTopicItem {
  id: string;
  title_pt: string;
  title_en: string;
  categorySlug: string;
  authorUsername: string;
  tags: string[];
  replyCount: number;
  voteCount: number;
  hasAcceptedSolution: boolean;
  updatedAgo_pt: string;
  updatedAgo_en: string;
}

/**
 * Official brand configuration for Vexor.
 */
export const siteConfig = {
  name: "Vexor",
  provisionalName: "Vexor",
  badgeLabel: "CYBERSEC · OPEN SOURCE",
  logoHorizontalPath: "/brand/vexor-logo.png",
  logoIconPath: "/brand/vexor-icon.png",
  githubRepoUrl: "https://github.com",
  defaultLocale: DEFAULT_LOCALE,
  supportedLocales: SUPPORTED_LOCALES,
};

/**
 * The 12 official categories from `supabase/seed.sql`.
 */
export const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    slug: "blue-team",
    code: "DEF-01",
    name_pt: "Blue Team",
    name_en: "Blue Team",
    description_pt:
      "Monitoramento SOC, SIEM, detecção de ameaças, hardening e defesa ativa.",
    description_en:
      "SOC monitoring, SIEM, threat detection, system hardening, and active defense.",
    accent: "cyan",
  },
  {
    slug: "red-team",
    code: "OFF-02",
    name_pt: "Red Team",
    name_en: "Red Team",
    description_pt:
      "Pentest autorizado, simulação de adversários, exploração e segurança ofensiva.",
    description_en:
      "Authorized pentesting, adversary emulation, exploitation, and offensive security.",
    accent: "indigo",
  },
  {
    slug: "osint",
    code: "INT-03",
    name_pt: "OSINT",
    name_en: "OSINT",
    description_pt:
      "Inteligência de fontes abertas, reconhecimento passivo e investigação digital.",
    description_en:
      "Open-source intelligence, passive reconnaissance, and digital investigation.",
    accent: "emerald",
  },
  {
    slug: "dfir",
    code: "FOR-04",
    name_pt: "DFIR — Forense Digital e Resposta a Incidentes",
    name_en: "DFIR — Digital Forensics and Incident Response",
    description_pt:
      "Coleta de evidências, análise de memória/disco, triagem e contenção de incidentes.",
    description_en:
      "Evidence acquisition, memory/disk forensics, triage, and incident containment.",
    accent: "violet",
  },
  {
    slug: "application-security",
    code: "APP-05",
    name_pt: "Segurança de Aplicações",
    name_en: "Application Security",
    description_pt:
      "Desenvolvimento seguro, OWASP, SAST/DAST, revisão de código e APIs.",
    description_en:
      "Secure SDLC, OWASP, SAST/DAST, code review, and API security.",
    accent: "cyan",
  },
  {
    slug: "cloud-security",
    code: "CLD-06",
    name_pt: "Segurança em Nuvem",
    name_en: "Cloud Security",
    description_pt:
      "Arquitetura segura em AWS, Azure, GCP, Kubernetes, IAM e CSPM.",
    description_en:
      "Secure architecture across AWS, Azure, GCP, Kubernetes, IAM, and CSPM.",
    accent: "indigo",
  },
  {
    slug: "threat-intelligence",
    code: "CTI-07",
    name_pt: "Inteligência de Ameaças",
    name_en: "Threat Intelligence",
    description_pt:
      "Análise de TTPs, MITRE ATT&CK, feeds de IOCs e rastreamento de campanhas.",
    description_en:
      "TTP analysis, MITRE ATT&CK mapping, IOC feeds, and campaign tracking.",
    accent: "emerald",
  },
  {
    slug: "malware-analysis",
    code: "MAL-08",
    name_pt: "Análise de Malware",
    name_en: "Malware Analysis",
    description_pt:
      "Engenharia reversa, análise estática e dinâmica, sandboxing e regras YARA.",
    description_en:
      "Reverse engineering, static and dynamic analysis, sandboxing, and YARA rules.",
    accent: "violet",
  },
  {
    slug: "network-security",
    code: "NET-09",
    name_pt: "Segurança de Redes",
    name_en: "Network Security",
    description_pt:
      "Análise de pacotes, IDS/IPS, segmentação, protocolos e tráfego de rede.",
    description_en:
      "Packet analysis, IDS/IPS, network segmentation, protocols, and traffic inspection.",
    accent: "cyan",
  },
  {
    slug: "grc",
    code: "GRC-10",
    name_pt: "GRC — Governança, Riscos e Conformidade",
    name_en: "GRC — Governance, Risk and Compliance",
    description_pt:
      "ISO 27001, NIST CSF, LGPD/GDPR, gestão de riscos, políticas e auditoria.",
    description_en:
      "ISO 27001, NIST CSF, GDPR/LGPD, risk management, policies, and auditing.",
    accent: "indigo",
  },
  {
    slug: "ai-security",
    code: "AIS-11",
    name_pt: "Segurança de IA",
    name_en: "AI Security",
    description_pt:
      "Segurança de LLMs, prompt injection, OWASP Top 10 for LLM e IA aplicada à defesa.",
    description_en:
      "LLM security, prompt injection defense, OWASP Top 10 for LLMs, and AI for defense.",
    accent: "emerald",
  },
  {
    slug: "career-learning",
    code: "EDU-12",
    name_pt: "Carreira e Aprendizado",
    name_en: "Career & Learning",
    description_pt:
      "Trilhas de estudo, certificações, transição de carreira e preparação técnica.",
    description_en:
      "Study roadmaps, certifications, career transition, and technical preparation.",
    accent: "violet",
  },
];

/**
 * Curated initial catalog resources aligned with `public.resources` columns,
 * covering all 12 categories and all 9 resource types.
 */
export const FEATURED_RESOURCES: FeaturedResourceItem[] = [
  {
    slug: "owasp-web-security-testing-guide",
    name: "OWASP Web Security Testing Guide (WSTG)",
    description_pt:
      "Guia abrangente e open source para testes de segurança em aplicações web e APIs, mantido pela comunidade OWASP. Cobre metodologia completa de verificação de controles de autenticação, sessão, criptografia, lógica de negócio e injeções.",
    description_en:
      "Comprehensive open-source guide for testing the security of web applications and APIs, maintained by the OWASP community. Covers full verification methodology for authentication, session management, cryptography, business logic, and injection flaws.",
    categorySlug: "application-security",
    type: "documentation",
    url: "https://owasp.org/www-project-web-security-testing-guide/",
    language: "en",
    difficulty: "intermediate",
    authorName: "OWASP Foundation",
    publishedAt: "2026-10-15",
    status: "approved",
  },
  {
    slug: "sigma-detection-rules",
    name: "Sigma — Generic Signature Format for SIEM Systems",
    description_pt:
      "Formato aberto e padronizado de regras de detecção que permite descrever eventos de log relevantes e compartilhar assinaturas entre diferentes SIEMs, EDRs e pipelines de Threat Hunting.",
    description_en:
      "Open signature format that allows security analysts to describe relevant log events and share detection rules across SIEMs, EDRs, and threat hunting pipelines.",
    categorySlug: "blue-team",
    type: "repository",
    url: "https://github.com/SigmaHQ/sigma",
    language: "en",
    difficulty: "intermediate",
    authorName: "SigmaHQ",
    publishedAt: "2026-10-18",
    status: "approved",
  },
  {
    slug: "wireshark-network-analyzer",
    name: "Wireshark",
    description_pt:
      "Analisador de protocolos de rede padrão da indústria para inspeção profunda de pacotes (PCAP), diagnóstico de tráfego, análise de anomalias e investigação forense de rede.",
    description_en:
      "Industry-standard network protocol analyzer for deep packet inspection (PCAP), traffic troubleshooting, anomaly detection, and network forensics.",
    categorySlug: "network-security",
    type: "tool",
    url: "https://www.wireshark.org",
    language: "multilingual",
    difficulty: "beginner",
    authorName: "Wireshark Foundation",
    publishedAt: "2026-10-20",
    status: "approved",
  },
  {
    slug: "velociraptor-dfir",
    name: "Velociraptor",
    description_pt:
      "Plataforma avançada de visibilidade de endpoints, coleta de artefatos forenses em escala e resposta rápida a incidentes baseada na linguagem de consulta VQL (Velociraptor Query Language).",
    description_en:
      "Advanced endpoint visibility, digital forensic artifact collection at scale, and incident response platform powered by VQL (Velociraptor Query Language).",
    categorySlug: "dfir",
    type: "tool",
    url: "https://docs.velociraptor.app",
    language: "en",
    difficulty: "advanced",
    authorName: "Velociraptor Community",
    publishedAt: "2026-10-22",
    status: "approved",
  },
  {
    slug: "mitre-attack-framework",
    name: "MITRE ATT&CK Framework",
    description_pt:
      "Base de conhecimento globalmente acessível de táticas, técnicas e procedimentos (TTPs) de adversários baseada em observações reais, essencial para CTI, Blue Team e Red Team.",
    description_en:
      "Globally accessible knowledge base of adversary tactics, techniques, and procedures (TTPs) based on real-world observations, foundational for CTI, Blue Team, and Red Team.",
    categorySlug: "threat-intelligence",
    type: "framework",
    url: "https://attack.mitre.org",
    language: "en",
    difficulty: "beginner",
    authorName: "MITRE Corporation",
    publishedAt: "2026-10-24",
    status: "approved",
  },
  {
    slug: "yara-pattern-matching",
    name: "YARA",
    description_pt:
      "Ferramenta essencial para pesquisadores de segurança e analistas de malware identificarem e classificarem amostras maliciosas com base em padrões textuais, hexadecimais e condições lógicas.",
    description_en:
      "Essential tool aimed at helping malware researchers identify and classify malware samples using textual, hexadecimal, and logical rule patterns.",
    categorySlug: "malware-analysis",
    type: "tool",
    url: "https://virustotal.github.io/yara/",
    language: "en",
    difficulty: "intermediate",
    authorName: "VirusTotal",
    publishedAt: "2026-10-26",
    status: "approved",
  },
  {
    slug: "owasp-juice-shop-lab",
    name: "OWASP Juice Shop",
    description_pt:
      "Aplicação web moderna intencionalmente vulnerável para treinamentos práticos de AppSec, captura de bandeiras (CTF) e testes de ferramentas SAST/DAST em ambiente controlado.",
    description_en:
      "Intentionally insecure modern web application for hands-on AppSec training, Capture The Flag (CTF) events, and benchmarking SAST/DAST tools in a controlled lab environment.",
    categorySlug: "application-security",
    type: "lab",
    url: "https://owasp.org/www-project-juice-shop/",
    language: "multilingual",
    difficulty: "beginner",
    authorName: "Björn Kimminich / OWASP",
    publishedAt: "2026-10-28",
    status: "approved",
  },
  {
    slug: "prowler-cloud-security",
    name: "Prowler — Cloud Security Posture Management",
    description_pt:
      "Ferramenta open source de segurança em nuvem para AWS, Azure, GCP e Kubernetes. Executa centenas de verificações de hardening, CIS Benchmarks, ISO 27001, GDPR e PCI-DSS.",
    description_en:
      "Open-source cloud security tool for AWS, Azure, GCP, and Kubernetes. Performs hundreds of hardening checks covering CIS Benchmarks, ISO 27001, GDPR, and PCI-DSS.",
    categorySlug: "cloud-security",
    type: "tool",
    url: "https://github.com/prowler-cloud/prowler",
    language: "en",
    difficulty: "intermediate",
    authorName: "Prowler Open Source",
    publishedAt: "2026-10-30",
    status: "approved",
  },
  {
    slug: "osint-framework-directory",
    name: "OSINT Framework & Methodology Guide",
    description_pt:
      "Coleção estruturada de fontes e técnicas de inteligência de fontes abertas (OSINT) voltada para coleta ética de dados públicos, validação de domínios, metadados e pegada digital.",
    description_en:
      "Structured collection of Open-Source Intelligence (OSINT) sources and techniques focused on ethical public data gathering, domain verification, metadata analysis, and digital footprinting.",
    categorySlug: "osint",
    type: "article",
    url: "https://osintframework.com",
    language: "en",
    difficulty: "beginner",
    authorName: "Justin Nordine",
    publishedAt: "2026-11-01",
    status: "approved",
  },
  {
    slug: "nist-cybersecurity-framework-2",
    name: "NIST Cybersecurity Framework (CSF) 2.0",
    description_pt:
      "Guia e framework de referência para governança, gestão de riscos cibernéticos e conformidade (Govern, Identify, Protect, Detect, Respond, Recover) aplicável a organizações de qualquer porte.",
    description_en:
      "Reference framework and guidance for cybersecurity governance, risk management, and compliance (Govern, Identify, Protect, Detect, Respond, Recover) for organizations of all sizes.",
    categorySlug: "grc",
    type: "framework",
    url: "https://www.nist.gov/cyberframework",
    language: "multilingual",
    difficulty: "beginner",
    authorName: "NIST",
    publishedAt: "2026-11-03",
    status: "approved",
  },
  {
    slug: "owasp-top-10-llm-genai",
    name: "OWASP Top 10 for Large Language Model Applications",
    description_pt:
      "Documentação e guia de defesa para os 10 riscos mais críticos em sistemas de IA generativa e LLMs, incluindo Prompt Injection, vazamento de dados sensíveis, supply chain e agência excessiva.",
    description_en:
      "Documentation and defensive guide covering the top 10 most critical security risks in LLM and GenAI applications, including Prompt Injection, sensitive data disclosure, supply chain, and excessive agency.",
    categorySlug: "ai-security",
    type: "course",
    url: "https://genai.owasp.org",
    language: "en",
    difficulty: "intermediate",
    authorName: "OWASP GenAI Security Project",
    publishedAt: "2026-11-05",
    status: "approved",
  },
  {
    slug: "picoctf-learning-platform",
    name: "picoCTF — Cybersecurity Capture The Flag Platform",
    description_pt:
      "Plataforma educacional gratuita de CTF criada pela Carnegie Mellon University com desafios progressivos de engenharia reversa, forense, criptografia, segurança web e exploração binária.",
    description_en:
      "Free educational Capture The Flag platform created by Carnegie Mellon University featuring progressive challenges in reverse engineering, forensics, cryptography, web security, and binary exploitation.",
    categorySlug: "career-learning",
    type: "ctf_platform",
    url: "https://picoctf.org",
    language: "en",
    difficulty: "beginner",
    authorName: "Carnegie Mellon University",
    publishedAt: "2026-11-07",
    status: "approved",
  },
  {
    slug: "atomic-red-team-tests",
    name: "Atomic Red Team — Detection Validation Scripts",
    description_pt:
      "Biblioteca de testes portáteis e scripts mapeados diretamente para o MITRE ATT&CK, permitindo que equipes de segurança testem e validem seus controles de detecção de forma autorizada.",
    description_en:
      "Library of portable tests and scripts mapped directly to MITRE ATT&CK, enabling security teams to test and validate their detection controls in authorized environments.",
    categorySlug: "red-team",
    type: "script",
    url: "https://github.com/redcanaryco/atomic-red-team",
    language: "en",
    difficulty: "intermediate",
    authorName: "Red Canary",
    publishedAt: "2026-11-09",
    status: "approved",
  },
];

/**
 * Forum topics are loaded from real Supabase `public.topics` / `public.posts` records.
 */
export const FEATURED_TOPICS: FeaturedTopicItem[] = [];
