/**
 * VEXOR — Cybercrime Research Two Main Pillars
 *
 * Pillar 1: Cybercrime Investigation (Digital forensics, incident reconstruction, telemetry)
 * Pillar 2: Underground Intelligence (Criminal monetization, supply chain, markets)
 */

import type { ResearchPillar } from "../types";

export const RESEARCH_PILLARS: ResearchPillar[] = [
  {
    id: "investigation",
    title_pt: "Cybercrime Investigation",
    title_en: "Cybercrime Investigation",
    subtitle_pt: "Investigação técnica, forense digital e reconstrução de incidentes",
    subtitle_en: "Technical investigation, digital forensics, and incident reconstruction",
    description_pt:
      "Focado na análise minuciosa de ataques reais, exames periciais em artefatos e sistemas comprometidos, telemetria forense e documentação de IoCs para resposta e prevenção eficazes.",
    description_en:
      "Focused on detailed forensic dissection of real-world intrusions, artifact examinations, telemetry extraction, and IoC attribution to build resilient defensive measures.",
    icon: "🔬",
    topics_pt: [
      "Análise e dessecação de ataques reais",
      "Investigação forense digital (DFIR)",
      "Cadeia de custódia e análise de evidências",
      "Rastreamento de indicadores de comprometimento (IoCs)",
      "Engenharia reversa de malware em ambiente isolado",
      "Reconstrução cronológica de incidentes",
      "Técnicas modernas de contenção e erradicação",
      "Modelagem defensiva e mitigação proativa",
    ],
    topics_en: [
      "Real-world attack analysis & autopsy",
      "Digital Forensics & Incident Response (DFIR)",
      "Chain of custody & evidence preservation",
      "Indicators of Compromise (IoCs) hunting",
      "Malware reverse engineering in isolated sandboxes",
      "Chronological intrusion timeline reconstruction",
      "Containment, eradication, and response playbooks",
      "Proactive threat mitigation and detection engineering",
    ],
  },
  {
    id: "underground",
    title_pt: "Underground Intelligence",
    title_en: "Underground Intelligence",
    subtitle_pt: "Economia do submundo digital, sindicatos criminosos e operações",
    subtitle_en: "Underground economy, cybercrime syndicates, and illicit ecosystems",
    description_pt:
      "Focado na compreensão dos modelos econômicos e organizacionais do cibercrime contemporâneo, relações entre operadores, táticas de extorsão e cadeias de suprimento ilícitas.",
    description_en:
      "Focused on understanding the business models, market dynamics, and operational structures of modern cybercrime syndicates, monetization schemes, and criminal supply chains.",
    icon: "🌐",
    topics_pt: [
      "Mercados clandestinos e modelos econômicos",
      "Fóruns fechados e Initial Access Brokers (IABs)",
      "Ransomware-as-a-Service (RaaS) e operadores afiliados",
      "Crime-as-a-Service (CaaS) e modularização de ataques",
      "Operações de fraude financeira e lavagem em criptoativos",
      "Monetização de dados vazados e credenciais",
      "Relações e cisões entre grupos criminosos",
      "Táticas, Técnicas e Procedimentos (TTPs) no MITRE ATT&CK",
    ],
    topics_en: [
      "Dark web marketplaces and revenue models",
      "Closed underground forums & Initial Access Brokers (IABs)",
      "Ransomware-as-a-Service (RaaS) and affiliate dynamics",
      "Crime-as-a-Service (CaaS) modular infrastructure",
      "Financial fraud networks & crypto asset laundering",
      "Credential theft monetization and info-stealer telemetry",
      "Inter-syndicate partnerships and threat actor splits",
      "MITRE ATT&CK Tactics, Techniques, and Procedures (TTPs)",
    ],
  },
];
