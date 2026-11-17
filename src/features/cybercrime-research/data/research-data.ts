/**
 * VEXOR — Cybercrime Research Seed Data
 *
 * Peer-reviewed demonstrative articles, forensic case studies, technical discussions,
 * and ethical laboratory guidelines.
 */

import type {
  AnalysisLabGuide,
  CaseStudy,
  ResearchArticle,
  TechnicalDiscussion,
} from "../types";

export const RESEARCH_ARTICLES: ResearchArticle[] = [
  {
    id: "cr-art-001",
    slug: "analise-campanha-voidlocker-ransomware",
    title_pt: "Análise da Campanha de Ransomware VoidLocker e Cadeia de Infecção",
    title_en: "VoidLocker Ransomware Campaign & Infection Chain Analysis",
    summary_pt:
      "Desmontagem técnica do payload do VoidLocker, técnicas de evasão de EDR via unhooking de NTDLL e táticas de persistência em ambientes Active Directory.",
    summary_en:
      "Technical disassembly of VoidLocker payload, EDR evasion via NTDLL unhooking, and persistence tactics in Active Directory environments.",
    body_pt: `## Resumo Executivo
A campanha VoidLocker destacou-se pela utilização de técnicas combinadas de injeção em memória e manipulação de chamadas diretas de sistema (Direct Syscalls). O operador obtém acesso inicial através de credenciais de VPN expostas sem MFA e progride para movimento lateral rápido.

## Análise do Payload
O binário principal é compilado em C++ com ofuscação de fluxo de controle (Control Flow Flattening). Durante a execução inicial:
1. **Unhooking de NTDLL**: Lê uma cópia limpa de \`ntdll.dll\` do disco e sobrescreve a seção \`.text\` carregada em memória para neutralizar ganchos (hooks) inseridos por agentes EDR.
2. **Criptografia Híbrida**: Emprega curvas elípticas (Curve25519) para troca de chaves em conjunto com ChaCha20 para cifragem de alto desempenho nos arquivos locais e de rede.
3. **Destruição de Shadow Copies**: Executa comandos \`vssadmin\` via interfaces COM para evitar detecção baseada em chamadas de processo direto.

## Detecção & Regras Defensivas
Recomenda-se o monitoramento de processos não assinados que mapeiam seções da \`ntdll.dll\` a partir do disco, além da auditoria em logs de eventos do Windows (Event ID 4624 tipo 10 e Event ID 7045).`,
    body_en: `## Executive Summary
The VoidLocker campaign distinguished itself by utilizing combined in-memory injection techniques and Direct System Calls. The operator gains initial access via exposed VPN credentials lacking MFA and progresses into rapid lateral movement.

## Payload Analysis
The core binary is compiled in C++ featuring Control Flow Flattening. During initial execution:
1. **NTDLL Unhooking**: Reads a clean copy of \`ntdll.dll\` from disk and overwrites the in-memory \`.text\` section to neutralize API hooks placed by EDR agents.
2. **Hybrid Cryptography**: Employs Curve25519 for key exchange alongside ChaCha20 for high-throughput stream encryption of local and network shares.
3. **Shadow Copy Erasure**: Executes \`vssadmin\` routines through COM interfaces to evade naive command-line parent-child detection.

## Detection & Defensive Engineering
We advise monitoring unsigned processes mapping disk sections of \`ntdll.dll\` into memory, along with strict auditing of Windows Event Logs (Event ID 4624 type 10 and Event ID 7045).`,
    categories: ["malware-ransomware", "threat-actors"],
    domain: "ransomware",
    severity: "critical",
    tlp: "CLEAR",
    author: "c0rtex",
    authorRole: "member",
    authorSpecialty: "Security Researcher",
    publishedAt: "2026-11-04",
    status: "published",
    cves: ["CVE-2026-1932", "CVE-2026-2184"],
    attackTechniques: ["T1059.001", "T1055.012", "T1486"],
    readTimeMinutes: 12,
    references: [
      { title: "MITRE ATT&CK — T1055.012 Process Hollowing", url: "https://attack.mitre.org/techniques/T1055/012/" },
      { title: "CISA Ransomware Advisory AA23-320A", url: "https://www.cisa.gov" },
    ],
    isDemonstrative: true,
  },
  {
    id: "cr-art-002",
    slug: "rastreamento-apt-412-espionagem-infraestrutura",
    title_pt: "Rastreamento do Operador APT-412: Espionagem em Infraestruturas Críticas",
    title_en: "Tracking Threat Actor APT-412: Espionage Operations in Critical Infrastructure",
    summary_pt:
      "Mapeamento de indicadores de comprometimento (IoCs) e infraestrutura de comando e controle (C2) operando sobre túneis DNS e WebSocket criptografados.",
    summary_en:
      "Mapping indicators of compromise (IoCs) and C2 infrastructure operating over encrypted DNS and WebSocket tunnels.",
    body_pt: `## Vetores de Ameaça
O grupo APT-412 tem como alvo concessionárias de energia e redes de telecomunicação na América Latina e Europa Oriental. A atividade observada combina exploração de vulnerabilidades em gateways de borda com beacons customizados em Rust.

## Comunicação C2 & DNS Tunneling
Para evitar firewalls de inspeção profunda (DPI), o beacon fraciona dados sensíveis em subdomínios sob requisições DNS do tipo TXT e HTTPS sobre WebSocket com certificados Let's Encrypt recém-emitidos.`,
    body_en: `## Threat Landscape
APT-412 targets energy grids and telecommunications providers across Latin America and Eastern Europe. Observed intrusions combine edge gateway zero-days with custom Rust-based beacons.

## C2 Protocol & DNS Tunneling
To bypass deep packet inspection (DPI) firewalls, the beacon fragments exfiltrated metadata into TXT DNS queries alongside HTTPS WebSockets backed by fresh Let's Encrypt certificates.`,
    categories: ["threat-actors", "botnets-ddos"],
    domain: "apt",
    severity: "high",
    tlp: "CLEAR",
    author: "sarah_sec",
    authorRole: "moderator",
    authorSpecialty: "Threat Intelligence Lead",
    publishedAt: "2026-10-28",
    status: "published",
    cves: ["CVE-2025-4911"],
    attackTechniques: ["T1071.004", "T1566.002", "T1132"],
    readTimeMinutes: 18,
    references: [
      { title: "MITRE ATT&CK — T1071.004 DNS Application Layer Protocol", url: "https://attack.mitre.org/techniques/T1071/004/" },
    ],
    isDemonstrative: true,
  },
  {
    id: "cr-art-003",
    slug: "engenharia-reversa-stealer-go-desofuscacao",
    title_pt: "Engenharia Reversa de Stealer Multiplataforma em Go com Ofuscação de Strings",
    title_en: "Reverse Engineering Cross-Platform Go Stealer with String Encryption",
    summary_pt:
      "Passo a passo prático de desofuscação e análise de binários compilados em Go, abordando recuperação de símbolos e extração de credenciais de navegadores.",
    summary_en:
      "Hands-on deobfuscation and triage of Go-compiled binaries, recovering symbols and extracting browser credential harvesting routines.",
    body_pt: `## Peculiaridades de Binários em Go
Binários Go frequentemente possuem tamanhos elevados devido à inclusão do runtime e tabelas de tipos internas (\`pclntab\`). Atacantes utilizam ferramentas como Garble para despojar e cifrar strings críticas.

## Técnicas de Análise Estática
Utilizando scripts customizados no Ghidra e Rizin:
1. Reconstrução dos cabeçalhos \`runtime.g\` e localização das rotinas de decodificação XOR.
2. Identificação das rotinas que localizam os arquivos \`Login Data\` e \`Cookies\` baseados no SQLite dos navegadores Chromium.`,
    body_en: `## Nuances of Go Binaries
Go binaries typically have large footprints because of the bundled runtime and \`pclntab\` metadata. Malicious authors leverage tools like Garble to strip symbols and encrypt key literal strings.

## Static Triage Workflows
Using custom Ghidra and Rizin plugins:
1. Reconstruction of the \`runtime.g\` structures and XOR string decryption loops.
2. Isolating routines targeting Chromium SQLite \`Login Data\` and session \`Cookies\`.`,
    categories: ["malware-ransomware", "identity-theft"],
    domain: "malware",
    severity: "medium",
    tlp: "CLEAR",
    author: "nexus_hunter",
    authorRole: "member",
    authorSpecialty: "Reverse Engineer",
    publishedAt: "2026-10-15",
    status: "published",
    attackTechniques: ["T1027.002", "T1555.003", "T1082"],
    readTimeMinutes: 9,
    references: [
      { title: "Ghidra Go Symbol Renamer Framework", url: "https://github.com" },
    ],
    isDemonstrative: true,
  },
  {
    id: "cr-art-004",
    slug: "monitoramento-mercados-dark-web-vazamentos",
    title_pt: "Monitoramento de Mercados na Dark Web: Vazamento de Bancos de Dados e Tokens API",
    title_en: "Dark Web Underground Markets: Database Leakage and API Token Telemetry",
    summary_pt:
      "Levantamento estatístico sobre vazamento de credenciais em fóruns subterrâneos e estratégias preventivas de revogação de tokens de nuvem.",
    summary_en:
      "Statistical survey of credentials leaked across underground forums and automated cloud token revocation workflows.",
    body_pt: `## Dinâmica dos Mercados Ilícitos
Observou-se uma transição dos grandes fóruns abertos na rede Tor para canais privados de mensagens instantâneas e redes de escrow automatizadas via bots.

## Categorias de Dados Mais Comercializadas
- Acessos corporativos RDP e VPN (Initial Access Brokers).
- Arquivos de log de infostealers contendo cookies de autenticação OAuth e AWS Session Tokens.`,
    body_en: `## Market Dynamics
We observed a marked transition from traditional open Tor forums toward private messenger channels coupled with automated cryptocurrency escrow bots.

## Most Traded Data Categories
- Enterprise RDP/VPN credentials provided by Initial Access Brokers.
- Infostealer logs bundle containing active OAuth session cookies and AWS Session Tokens.`,
    categories: ["dark-web-research", "data-breaches", "financial-cybercrime"],
    domain: "darkweb",
    severity: "high",
    tlp: "GREEN",
    author: "c0rtex",
    authorRole: "member",
    authorSpecialty: "Threat Intelligence",
    publishedAt: "2026-10-02",
    status: "published",
    attackTechniques: ["T1552.001", "T1589.001"],
    readTimeMinutes: 14,
    references: [
      { title: "NIST Special Publication 800-63B Authentication Guidelines", url: "https://pages.nist.gov/800-63-3/" },
    ],
    isDemonstrative: true,
  },
  {
    id: "cr-art-005",
    slug: "aitm-phishing-bypass-mfa-tokens-sessao",
    title_pt: "Análise de Kits de Phishing AiTM (Adversary-in-the-Middle) e Roubo de Sessão",
    title_en: "Adversary-in-the-Middle (AiTM) Phishing Kits & Session Hijacking Analysis",
    summary_pt:
      "Estudo detalhado de kits de phishing que atuam como proxy reverso entre a vítima e o provedor de identidade, interceptando cookies de sessão pós-MFA.",
    summary_en:
      "Deep dive into reverse proxy phishing kits intercepting post-MFA authentication cookies in real-time.",
    body_pt: `## Mecanismo de Ação do AiTM
Diferente do phishing tradicional que apenas copia senhas, plataformas como Evilginx funcionam como proxies transparentes, capturando o cookie de sessão \`ESTSAUTH\` após o usuário concluir o segundo fator no provedor legítimo.

## Mitigação
A adoção de MFA resistente a phishing baseada em chaves de segurança FIDO2 / Passkeys vinculadas ao domínio (WebAuthn) anula completamente a eficácia do ataque.`,
    body_en: `## AiTM Mechanics
Unlike credential harvesters, reverse proxy platforms such as Evilginx relay traffic between victim and real identity provider, capturing session cookies like \`ESTSAUTH\` upon successful MFA verification.

## Mitigation
Enforcing FIDO2 / WebAuthn domain-bound passkeys completely immunizes organizations against AiTM interception.`,
    categories: ["phishing-social-engineering", "identity-theft"],
    domain: "fraud",
    severity: "high",
    tlp: "CLEAR",
    author: "sec_analyst_br",
    authorRole: "member",
    authorSpecialty: "DFIR & Identity",
    publishedAt: "2026-11-09",
    status: "published",
    attackTechniques: ["T1566.002", "T1539"],
    readTimeMinutes: 11,
    references: [
      { title: "CISA Fact Sheet: Phishing-Resistant MFA", url: "https://www.cisa.gov" },
    ],
    isDemonstrative: true,
  },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "cs-001",
    slug: "caso-brecha-fintech-aurora-2026",
    title_pt: "Estudo de Caso: Intrusão em Nuvem e Exfiltração na Fintech Aurora",
    title_en: "Case Study: Cloud Intrusion & Exfiltration at Aurora Fintech",
    summary_pt:
      "Autópsia técnica da invasão iniciada por credencial de pipeline CI/CD exposta em repositório público, movimentação lateral no Kubernetes e exfiltração de dados regulados.",
    summary_en:
      "Technical autopsy of a cloud breach initiated via leaked CI/CD pipeline credentials, Kubernetes lateral movement, and financial data exfiltration.",
    threatActor: "FIN-Vortex (Sindicato Financeiro Transnacional)",
    targetSector_pt: "Serviços Financeiros & Meios de Pagamento",
    targetSector_en: "Financial Services & Payment Gateways",
    date: "2026-09-18",
    categories: ["cybercrime-cases", "financial-cybercrime", "data-breaches"],
    severity: "critical",
    context_pt:
      "A Aurora Fintech sofreu um incidente de segurança com impacto em 1.2 milhão de contas. O vetor inicial foi a exposição acidental de um token de service account do AWS IAM em um fork público de repositório no GitHub.",
    context_en:
      "Aurora Fintech suffered a critical security incident impacting 1.2 million account holders. The initial vector was an accidental AWS IAM service account token leak inside a public repository fork.",
    timeline: [
      {
        phase: "Acesso Inicial (Dia 0)",
        date: "2026-09-18 03:14 UTC",
        description_pt: "Atacante utiliza script automatizado de scanner no GitHub e obtém chave de API IAM com privilégios excessivos.",
        description_en: "Adversary uses automated scanner against GitHub, discovering over-privileged IAM API key.",
      },
      {
        phase: "Reconhecimento & Movimento Lateral (Dia 0 + 4h)",
        date: "2026-09-18 07:22 UTC",
        description_pt: "Enumeração de clusters EKS via AWS CLI; extração de segredos do Kubernetes (Kubeconfig e tokens de banco).",
        description_en: "EKS cluster enumeration via AWS CLI; dumped Kubernetes secrets including DB connection strings.",
      },
      {
        phase: "Exfiltração de Dados (Dia 1)",
        date: "2026-09-19 01:05 UTC",
        description_pt: "Execução de cópia de snapshot do Amazon RDS para conta externa controlada pelo atacante.",
        description_en: "Copied encrypted RDS snapshot to external adversary-controlled AWS account via modified KMS policy.",
      },
      {
        phase: "Detecção e Contenção (Dia 1 + 6h)",
        date: "2026-09-19 07:30 UTC",
        description_pt: "Alerta emitido pelo AWS GuardDuty de chamada API anômala a partir de ASN da rede Tor; revogação emergencial de credenciais.",
        description_en: "AWS GuardDuty alert triggered on anomalous KMS policy API call from Tor exit node; emergency credential revocation.",
      },
    ],
    initialVector_pt:
      "Vazamento acidental de chave de acesso de longo prazo (AWS Access Key ID) em pipeline de integração contínua sem escopo de privilégio mínimo.",
    initialVector_en:
      "Accidental exposure of long-lived AWS IAM access key in CI/CD pipeline lacking principle of least privilege.",
    lateralMovement_pt:
      "Utilização de permissões 'iam:PassRole' para assumir perfis de nós gerenciados no Kubernetes EKS e acessar a rede interna da VPC.",
    lateralMovement_en:
      "Abuse of 'iam:PassRole' permissions to assume managed node instance profiles in Kubernetes EKS and reach internal VPC subnets.",
    impact_pt:
      "Exfiltração de 1.2 milhão de cadastros de clientes (nomes, hashes de senhas e transações financeiras). Multa regulatória e dano reputacional mitigado pela transparência imediata.",
    impact_en:
      "Exfiltration of 1.2 million customer records (names, salted password hashes, and ledger logs). Regulatory fines and reputational impact.",
    iocs: [
      { type: "ip", value: "198.51.100.44", notes: "Nó de saída Tor utilizado nas chamadas de API" },
      { type: "sha256", value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", notes: "Script Python de automação de dump de bucket S3" },
      { type: "domain", value: "c2-aurora-sync.xyz", notes: "Domínio utilizado para exfiltração secundária" },
    ],
    ttps: [
      { id: "T1552.001", name: "Credentials in Files", tactic: "Credential Access" },
      { id: "T1530", name: "Data from Cloud Storage Object", tactic: "Collection" },
      { id: "T1078.004", name: "Valid Accounts: Cloud Accounts", tactic: "Initial Access" },
    ],
    mitigations_pt: [
      "Substituição de chaves de longo prazo por IAM Roles temporárias integradas com OIDC (OpenID Connect).",
      "Habilitação de bloqueio de commits com segredos (Secret Scanning com Push Protection).",
      "Segmentação estrita de VPC e políticas de KMS restringindo acesso a contas externas.",
      "Auditoria contínua de configurações de nuvem e monitoramento de logs CloudTrail em tempo real.",
    ],
    mitigations_en: [
      "Replace long-lived IAM keys with temporary short-lived roles via GitHub Actions OIDC.",
      "Enable automated secret scanning with push protection on all version control repositories.",
      "Strict VPC endpoint segmentation and KMS key policy lockouts preventing external account access.",
      "Continuous CloudTrail logging and real-time streaming to central SIEM with automated alert rules.",
    ],
    references: [
      { title: "AWS Security Incident Response Guide", url: "https://docs.aws.amazon.com" },
      { title: "MITRE ATT&CK Cloud Matrix", url: "https://attack.mitre.org/matrices/enterprise/cloud/" },
    ],
    isDemonstrative: true,
  },
  {
    id: "cs-002",
    slug: "caso-operacao-blacksky-botnet-iot",
    title_pt: "Estudo de Caso: Desmantelamento da Botnet IoT BlackSky",
    title_en: "Case Study: Takedown of the BlackSky IoT DDoS Botnet",
    summary_pt:
      "Reconstrução técnica do sequestro de 280 mil roteadores e câmeras IP com senhas padrão para execução de ataques de negação de serviço volumétricos de 1.8 Tbps.",
    summary_en:
      "Forensic breakdown of 280k hijacked IoT routers and IP cameras leveraged for record-breaking 1.8 Tbps volumetric DDoS strikes.",
    threatActor: "BlackSky Syndicate (Operadores CaaS)",
    targetSector_pt: "Provedores de Telecomunicação & Provedores Cloud",
    targetSector_en: "Telecom Providers & Cloud Hosting Providers",
    date: "2026-08-10",
    categories: ["cybercrime-cases", "botnets-ddos", "cyber-law"],
    severity: "high",
    context_pt:
      "A botnet BlackSky operava no modelo Crime-as-a-Service, vendendo 'ataques de estresse' para compradores na internet. Uma força-tarefa internacional de segurança cooperou para neutralizar os servidores de comando.",
    context_en:
      "BlackSky operated as a Crime-as-a-Service DDoS platform selling stresser capacity. An international law enforcement and private sector coalition executed a coordinated infrastructure takedown.",
    timeline: [
      {
        phase: "Varredura Massiva",
        date: "2026-07-01",
        description_pt: "Scan na internet por portas 23 (Telnet) e 8080 com dicionário de senhas padrão de fabricantes de roteadores.",
        description_en: "Internet-wide scan across ports 23 (Telnet) and 8080 testing default vendor credentials.",
      },
      {
        phase: "Ataque Volumétrico de 1.8 Tbps",
        date: "2026-08-02",
        description_pt: "Ataque SYN flood e UDP amplification contra backbone de telecomunicação na Europa.",
        description_en: "Massive SYN flood and UDP amplification targeting European telecommunication backbone.",
      },
      {
        phase: "Apreensão Conjunta (Takedown)",
        date: "2026-08-10",
        description_pt: "Sinking dos domínios dinâmicos C2 e apreensão de servidores centrais pela Europol e parceiros.",
        description_en: "DNS sinkholing of dynamic C2 domains and seizure of hosting servers by international law enforcement.",
      },
    ],
    initialVector_pt: "Exploração de credenciais fracas ou padrão em interfaces Telnet e HTTP de dispositivos embarcados.",
    initialVector_en: "Exploitation of default or hardcoded credentials across embedded Telnet and HTTP administration interfaces.",
    lateralMovement_pt: "Scripts em shell de autopropagação que infectavam vizinhos de sub-rede (/24) automaticamente.",
    lateralMovement_en: "Self-propagating shell scripts performing automated local subnet (/24) horizontal scanning.",
    impact_pt: "Interrupção temporária de serviços de conectividade em 3 países da UE. Prejuízo operacional estimado em € 4.5 milhões.",
    impact_en: "Temporary outage across regional telecom providers in 3 EU nations; estimated downtime cost of €4.5M.",
    iocs: [
      { type: "ip", value: "203.0.113.89", notes: "Servidor de controle C2 da botnet" },
      { type: "domain", value: "c2-blacksky-net.org", notes: "Domínio com DNS dinâmico sinkholed" },
      { type: "sha256", value: "c4ca4238a0b923820dcc509a6f75849b00000000000000000000000000000000", notes: "Binário ELF MIPS do loader BlackSky" },
    ],
    ttps: [
      { id: "T1110.001", name: "Password Guessing", tactic: "Credential Access" },
      { id: "T1498", name: "Network Denial of Service", tactic: "Impact" },
      { id: "T1584.005", name: "Botnet Infrastructure", tactic: "Resource Development" },
    ],
    mitigations_pt: [
      "Bloqueio de portas de gerenciamento Telnet/SSH na borda WAN de operadoras.",
      "Exigência de troca obrigatória de senha no primeiro login de dispositivos residenciais.",
      "Implementação de filtros BCP 38 (Anti-Spoofing) por provedores de trânsito IP.",
    ],
    mitigations_en: [
      "Inbound WAN filtering of Telnet/SSH management ports by internet service providers.",
      "Mandatory password change enforced upon initial router setup.",
      "Adoption of BCP 38 anti-spoofing ingress filters across Tier 1 and Tier 2 transit networks.",
    ],
    references: [
      { title: "Europol EC3 Joint Action Day Report", url: "https://www.europol.europa.eu" },
    ],
    isDemonstrative: true,
  },
];

export const TECHNICAL_DISCUSSIONS: TechnicalDiscussion[] = [
  {
    id: "cr-disc-001",
    title_pt: "Métodos modernos de bypass de EDR baseados em chamadas diretas de sistema (Direct Syscalls)",
    title_en: "Modern EDR evasion methods leveraging Direct System Calls and TartarusGate",
    body_pt:
      "Gostaria de abrir uma discussão técnica sobre a eficácia de técnicas como SysWhispers3 e TartarusGate contra EDRs modernos que utilizam telemetria via kernel callbacks e ETW-Ti. Quais assinaturas comportamentais têm se mostrado mais resilientes para detecção defensiva?",
    body_en:
      "Opening a technical discussion on the defensive resilience against SysWhispers3 and TartarusGate. How are threat intelligence teams leveraging ETW-Ti and kernel callbacks to spot unhooking patterns?",
    author: "c0rtex",
    authorRole: "member",
    authorSpecialty: "Security Researcher",
    category: "malware-ransomware",
    repliesCount: 8,
    voteCount: 24,
    lastActivityAt: "2026-11-12T09:30:00Z",
    tags: ["edr", "syscalls", "detection-engineering", "windows-internals"],
    linkedCves: ["CVE-2026-1932"],
  },
  {
    id: "cr-disc-002",
    title_pt: "Como operadores de RaaS gerenciam negociações de resgate e prevenção de vazamento de chaves",
    title_en: "How RaaS cartels manage victim chat negotiation portals and prevent key leakage",
    body_pt:
      "Analisando os portais de negociação dos grupos LockBit e BlackCat, nota-se o uso de sessões isoladas com provas de descriptografia baseadas em zero-knowledge. Como podemos utilizar metadados de chat para enriquecer perfis de atores de ameaça?",
    body_en:
      "Analyzing victim negotiation portals from major RaaS syndicates shows sophisticated proof-of-decryption verification. How can forensic teams leverage negotiation chat artifacts for attribution?",
    author: "sarah_sec",
    authorRole: "moderator",
    authorSpecialty: "Threat Intelligence Lead",
    category: "threat-actors",
    repliesCount: 14,
    voteCount: 31,
    lastActivityAt: "2026-11-11T20:15:00Z",
    tags: ["raas", "negotiation", "threat-intelligence", "attribution"],
  },
  {
    id: "cr-disc-003",
    title_pt: "Evolução dos Info-Stealers em 2026: Bypass de App-Bound Encryption no Windows",
    title_en: "Infostealer evolution in 2026: Navigating App-Bound Encryption on Windows 11",
    body_pt:
      "Com a introdução do App-Bound Encryption no Chrome 127+, como as novas variantes de Lumma e Vidar estão contornando a proteção de credenciais? Vamos documentar as abordagens defensivas baseadas em AppLocker e WDAC.",
    body_en:
      "With Chrome 127+ App-Bound Encryption rollouts, how are Lumma and Vidar variants attempting to bypass credential storage protections? Let us document defensive policies using AppLocker and WDAC.",
    author: "nexus_hunter",
    authorRole: "member",
    authorSpecialty: "Reverse Engineer",
    category: "identity-theft",
    repliesCount: 19,
    voteCount: 42,
    lastActivityAt: "2026-11-12T07:45:00Z",
    tags: ["infostealer", "app-bound-encryption", "chromium", "wdac"],
  },
];

export const ANALYSIS_LAB_GUIDES: AnalysisLabGuide[] = [
  {
    id: "lab-001",
    slug: "montagem-laboratorio-isolado-analise-malware",
    title_pt: "Guia Metodológico: Construção de Laboratório Seguro e Isolado para Triagem de Malware",
    title_en: "Methodology Guide: Building a Hardened Isolated Sandbox for Safe Malware Triage",
    level: "beginner",
    category: "malware-ransomware",
    summary_pt:
      "Roteiro passo a passo para configuração de hipervisores com redes internas isoladas (host-only), simulação de internet via INetSim/FakeNet e captura de tráfego com Wireshark.",
    summary_en:
      "Step-by-step hardened hypervisor setup with host-only network isolation, INetSim/FakeNet services, and Wireshark telemetry capture.",
    methodology_pt: `1. **Segregação Física ou Lógica de Rede**: Utilize adaptador Host-Only sem roteamento para o gateway corporativo ou doméstico.
2. **Ambiente Não Persistente**: Configure discos virtuais em modo Snapshot imutável para retorno instantâneo ao estado limpo após cada execução.
3. **Simulador de Serviços Web**: Execute o INetSim ou FakeNet-NG em uma VM auxiliar na mesma rede interna para responder a requisições HTTP, DNS e NTP.
4. **Instrumentação de Telemetria**: Instale Sysmon com configuração de segurança estrita e ProcMon configurado com filtros pré-armazenados.`,
    methodology_en: `1. **Physical or Logical Network Segregation**: Enforce Host-Only virtual adapters with zero routing toward production or residential gateways.
2. **Immutable Snapshots**: Configure virtual disks in non-persistent snapshot mode for instant clean resets after each specimen run.
3. **Faked Network Services**: Run INetSim or FakeNet-NG on a sibling VM within the isolated network to respond to HTTP, DNS, and NTP requests.
4. **Telemetry Instrumentation**: Install Sysmon backed by high-coverage configuration templates alongside ProcMon filtered profiles.`,
    opsecRules_pt: [
      "NUNCA compartilhe diretórios ou área de transferência bidirecional entre o Host e o Guest.",
      "Desative adaptadores de rede reais antes de carregar artefatos suspeitos no hipervisor.",
      "Trabalhe sempre com amostras protegidas por senha (ex: zip cifrado com senha 'infected') para evitar execuções acidentais.",
      "Não faça uploads de amostras proprietárias para serviços públicos de verificação que compartilhem amostras abertamente.",
    ],
    opsecRules_en: [
      "NEVER enable bidirectional clipboard or shared folders between Host and Guest virtual machines.",
      "Disconnect physical host network interfaces prior to extracting live artifacts inside the virtual sandbox.",
      "Always store specimens inside password-protected archives (e.g. 'infected') to prevent accidental execution.",
      "Do not submit proprietary or customer-sensitive telemetry to public scanning portals that distribute binaries openly.",
    ],
    tools: [
      { name: "REMnux", purpose: "Distribuição Linux pré-configurada para engenharia reversa e análise forense", isSandboxedOnly: true },
      { name: "Flare-VM", purpose: "Ambiente Windows configurado pelo Mandiant com ferramentas de desmontagem e debugging", isSandboxedOnly: true },
      { name: "FakeNet-NG", purpose: "Simulador de serviços de rede para interceptação de tráfego C2", isSandboxedOnly: true },
      { name: "Wireshark", purpose: "Analisador de protocolos e telemetria de rede", isSandboxedOnly: false },
    ],
    safetyWarning_pt:
      "ATENÇÃO: A análise de artefatos maliciosos reais deve ocorrer exclusivamente em ambientes controlados e isolados. O Vexor não fornece códigos maliciosos prontos para execução nem incentiva testes em redes desautorizadas.",
    safetyWarning_en:
      "WARNING: Active malware triage must occur strictly within isolated lab environments. Vexor does not supply weaponized payloads nor condone testing against unauthorized infrastructure.",
  },
  {
    id: "lab-002",
    slug: "coleta-forense-memoria-volatilidade",
    title_pt: "Guia Forense: Coleta e Análise de Memória RAM com Volatility 3",
    title_en: "Forensics Guide: Live RAM Acquisition and Volatility 3 Triage",
    level: "intermediate",
    category: "cybercrime-cases",
    summary_pt:
      "Procedimentos de preservação de evidências voláteis em resposta a incidentes, extração de dumps de memória e detecção de processos ocultos e injeção de DLLs.",
    summary_en:
      "Live evidence preservation workflows in incident response, memory dumping techniques, and hidden process hunting via Volatility 3.",
    methodology_pt: `1. **Aquisição Não Invasiva**: Utilize ferramentas como WinPmem ou dump via hypervisor snapshot para preservar o arquivo de memória sem alterar o estado do sistema operacional.
2. **Cálculo de Hash Criptográfico**: Gere imediatamente os hashes SHA-256 do arquivo \`.raw\` para preservar a cadeia de custódia.
3. **Análise com Volatility 3**:
   - \`windows.pslist\` vs \`windows.psscan\` para identificar processos desvinculados da lista ativa (EPROCESS).
   - \`windows.malfind\` para identificar páginas de memória com permissões PAGE_EXECUTE_READWRITE contendo cabeçalhos MZ/PE injetados.
   - \`windows.netscan\` para identificar sockets de rede abertos no momento da coleta.`,
    methodology_en: `1. **Non-Invasive Acquisition**: Leverage WinPmem or hypervisor snapshots to acquire memory dumps without perturbing running OS state.
2. **Cryptographic Hashing**: Calculate SHA-256 hashes of the \`.raw\` image immediately to maintain unbroken chain of custody.
3. **Volatility 3 Triage**:
   - Correlate \`windows.pslist\` and \`windows.psscan\` to expose unlinked processes.
   - Run \`windows.malfind\` targeting PAGE_EXECUTE_READWRITE pages concealing injected MZ/PE headers.
   - Execute \`windows.netscan\` to reconstruct open network connections at capture time.`,
    opsecRules_pt: [
      "Nunca desligue a máquina antes de coletar a memória volátil, sob pena de perda irreparável de chaves criptográficas e conexões ativas.",
      "Registre data, hora UTC e dados do operador em termo formal de custódia.",
      "Trabalhe sempre em cópias do dump de memória, preservando a imagem original como somente leitura.",
    ],
    opsecRules_en: [
      "Never reboot or power down the target host before dumping RAM; critical cryptographic keys and active sessions will be lost.",
      "Document timestamps (UTC), operator identity, and hardware specs in a formal chain of custody document.",
      "Always work on verified copies of the raw dump, leaving original evidence write-protected.",
    ],
    tools: [
      { name: "Volatility 3", purpose: "Framework líder para análise forense de memória volátil", isSandboxedOnly: false },
      { name: "WinPmem", purpose: "Driver open-source de aquisição de memória física em Windows", isSandboxedOnly: true },
      { name: "MemProcFS", purpose: "Visualizador de memória mapeado como sistema de arquivos virtual", isSandboxedOnly: false },
    ],
    safetyWarning_pt:
      "A perícia digital deve respeitar os termos legais da organização e a legislação de proteção de dados aplicável. Não realize interceptações de memória em dispositivos sem autorização formal por escrito.",
    safetyWarning_en:
      "Digital forensics must strictly adhere to regulatory statutes and organizational mandates. Do not acquire memory from systems without explicit written consent.",
  },
];
