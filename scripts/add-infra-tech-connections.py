#!/usr/bin/env python3
"""
Add Infrastructure and Technological issue connections to issue-issue-connections.json
"""
import json
from pathlib import Path

# Paths
ROOT = Path(__file__).parent.parent
DATA_FILE = ROOT / "public" / "data.json"
CONNECTIONS_FILE = ROOT / "issue-issue-connections.json"

# Read existing data
with open(DATA_FILE, 'r') as f:
    data = json.load(f)

with open(CONNECTIONS_FILE, 'r') as f:
    connections_data = json.load(f)

# Comprehensive Infrastructure and Technological connections
new_connections = [
    # INFRASTRUCTURE
    {
        "issueId": "transit-death-spirals",
        "issueName": "Transit Death Spirals",
        "connectedTo": [
            {
                "targetId": "commercial-real-estate-doom-loop-and-downtown-collapse",
                "targetName": "Commercial Real Estate Doom Loop and Downtown Collapse",
                "relationshipType": "reinforcing",
                "reasoning": "Empty offices eliminate commuters; transit loses revenue; service cuts make downtown less accessible; doom loop"
            },
            {
                "targetId": "climate-change-acceleration",
                "targetName": "Climate Change Acceleration",
                "relationshipType": "causal",
                "reasoning": "Transit collapse forces car dependence; emissions increase as public transportation fails"
            },
            {
                "targetId": "housing-impossibility-crisis",
                "targetName": "Housing Impossibility Crisis",
                "relationshipType": "reinforcing",
                "reasoning": "Transit-oriented development fails; transit-accessible housing becomes worthless; sprawl intensifies"
            },
            {
                "targetId": "municipal-bond-apocalypse",
                "targetName": "Municipal Bond Apocalypse",
                "relationshipType": "causal",
                "reasoning": "Transit agency debt becomes unpayable; bond defaults spread through public finance system"
            },
            {
                "targetId": "remote-work-revolution",
                "targetName": "Remote Work Revolution",
                "relationshipType": "causal",
                "reasoning": "Permanent work-from-home destroys commuter demand; ridership never recovers"
            }
        ]
    },
    {
        "issueId": "infrastructure-underwater-trillions",
        "issueName": "Infrastructure Underwater Trillions",
        "connectedTo": [
            {
                "targetId": "west-antarctic-ice-cliff-collapse",
                "targetName": "West Antarctic Ice Cliff Collapse",
                "relationshipType": "causal",
                "reasoning": "Rapid sea level rise submerges coastal infrastructure worth trillions; ports, roads, utilities worthless"
            },
            {
                "targetId": "climate-insurance-collapse-and-managed-retreat-wars",
                "targetName": "Climate Insurance Collapse and Managed Retreat Wars",
                "relationshipType": "reinforcing",
                "reasoning": "Uninsurable infrastructure accelerates abandonment; stranded assets crash property values"
            },
            {
                "targetId": "municipal-bond-apocalypse",
                "targetName": "Municipal Bond Apocalypse",
                "relationshipType": "causal",
                "reasoning": "Coastal cities' infrastructure base destroyed; tax revenue collapses; bond defaults cascade"
            },
            {
                "targetId": "climate-refugee-floods",
                "targetName": "Climate Refugee Floods",
                "relationshipType": "causal",
                "reasoning": "Infrastructure destruction forces mass evacuation; millions displaced as cities uninhabitable"
            },
            {
                "targetId": "nuclear-plant-crisis-cascade",
                "targetName": "Nuclear Plant Crisis Cascade",
                "relationshipType": "causal",
                "reasoning": "Coastal nuclear plants flood; multiple Fukushima-scale disasters contaminate regions"
            }
        ]
    },
    {
        "issueId": "infrastructure-subsidence-collapse",
        "issueName": "Infrastructure Subsidence Collapse",
        "connectedTo": [
            {
                "targetId": "boreal-permafrost-carbon-pulse",
                "targetName": "Boreal Permafrost Carbon Pulse",
                "relationshipType": "causal",
                "reasoning": "Thawing permafrost undermines buildings, roads, pipelines across Arctic; infrastructure collapses"
            },
            {
                "targetId": "water-scarcity-wars",
                "targetName": "Water Scarcity Wars",
                "relationshipType": "causal",
                "reasoning": "Aquifer depletion causes ground subsidence; cities sink; infrastructure destroyed"
            },
            {
                "targetId": "climate-refugee-floods",
                "targetName": "Climate Refugee Floods",
                "relationshipType": "sequential",
                "reasoning": "Subsiding cities become uninhabitable; populations forced to relocate"
            },
            {
                "targetId": "just-in-time-supply-chain-collapse",
                "targetName": "Just-in-Time Supply Chain Collapse",
                "relationshipType": "causal",
                "reasoning": "Roads and rail infrastructure fail; logistics networks break; supply chains cannot function"
            }
        ]
    },
    {
        "issueId": "chip-manufacturing-monopolies",
        "issueName": "Chip Manufacturing Monopolies",
        "connectedTo": [
            {
                "targetId": "ai-compute-resource-wars",
                "targetName": "AI Compute Resource Wars",
                "relationshipType": "causal",
                "reasoning": "TSMC/ASML/Nvidia monopolies create GPU scarcity; nations treat chips as strategic weapons"
            },
            {
                "targetId": "taiwan-invasion-crisis",
                "targetName": "Taiwan Invasion Crisis",
                "relationshipType": "causal",
                "reasoning": "TSMC concentration in Taiwan makes chip supply existential; China invasion risk threatens global tech"
            },
            {
                "targetId": "splinternet-and-data-localization-wars",
                "targetName": "Splinternet and Data Localization Wars",
                "relationshipType": "reinforcing",
                "reasoning": "Chip export controls fragment technology globally; tech sovereignty battles intensify"
            },
            {
                "targetId": "ai-job-displacement-tsunami",
                "targetName": "AI Job Displacement Tsunami",
                "relationshipType": "causal",
                "reasoning": "Chip monopolies determine who can build AI; concentration of automation power in few nations"
            },
            {
                "targetId": "cyber-cold-war",
                "targetName": "Cyber Cold War",
                "relationshipType": "reinforcing",
                "reasoning": "Semiconductor supply becomes primary geopolitical weapon; chip wars are new cold war"
            }
        ]
    },
    {
        "issueId": "digital-chain-of-custody-wars",
        "issueName": "Digital Chain of Custody Wars",
        "connectedTo": [
            {
                "targetId": "deepfake-reality-crisis",
                "targetName": "Deepfake Reality Crisis",
                "relationshipType": "sequential",
                "reasoning": "Deepfakes force complete redesign of evidence systems with blockchain/cryptographic verification"
            },
            {
                "targetId": "post-truth-governance",
                "targetName": "Post-Truth Governance",
                "relationshipType": "causal",
                "reasoning": "When digital evidence cannot be trusted, legal systems collapse into power-based adjudication"
            },
            {
                "targetId": "election-integrity-collapse",
                "targetName": "Election Integrity Collapse",
                "relationshipType": "causal",
                "reasoning": "Inability to verify digital evidence undermines electoral legitimacy; disputed elections"
            },
            {
                "targetId": "state-sponsored-hacking-epidemic",
                "targetName": "State-Sponsored Hacking Epidemic",
                "relationshipType": "reinforcing",
                "reasoning": "State actors compromise chain of custody systems; evidence manipulation becomes warfare"
            }
        ]
    },
    {
        "issueId": "grid-modernization-battles",
        "issueName": "Grid Modernization Battles",
        "connectedTo": [
            {
                "targetId": "renewable-energy-nimbyism",
                "targetName": "Renewable Energy NIMBYism",
                "relationshipType": "thematic",
                "reasoning": "Both involve infrastructure opposition; renewable plants need transmission lines locals resist"
            },
            {
                "targetId": "grid-collapse-cascades",
                "targetName": "Grid Collapse Cascades",
                "relationshipType": "sequential",
                "reasoning": "Delayed grid modernization creates instability; aging infrastructure fails catastrophically"
            },
            {
                "targetId": "ai-compute-resource-wars",
                "targetName": "AI Compute Resource Wars",
                "relationshipType": "causal",
                "reasoning": "Data center loads require massive grid upgrades; modernization battles delay AI expansion"
            },
            {
                "targetId": "climate-change-acceleration",
                "targetName": "Climate Change Acceleration",
                "relationshipType": "causal",
                "reasoning": "Grid modernization delays prevent renewable integration; fossil fuel dependence continues"
            }
        ]
    },
    {
        "issueId": "remote-work-revolution",
        "issueName": "Remote Work Revolution",
        "connectedTo": [
            {
                "targetId": "commercial-real-estate-doom-loop-and-downtown-collapse",
                "targetName": "Commercial Real Estate Doom Loop and Downtown Collapse",
                "relationshipType": "causal",
                "reasoning": "Permanent work-from-home destroys office demand; downtown real estate becomes stranded asset"
            },
            {
                "targetId": "transit-death-spirals",
                "targetName": "Transit Death Spirals",
                "relationshipType": "causal",
                "reasoning": "No commuters means no transit revenue; service collapses without ridership"
            },
            {
                "targetId": "loneliness-epidemic",
                "targetName": "Loneliness Epidemic",
                "relationshipType": "causal",
                "reasoning": "Work-from-home eliminates casual social interaction; professional isolation compounds loneliness"
            },
            {
                "targetId": "surveillance-state-expansion",
                "targetName": "Surveillance State Expansion",
                "relationshipType": "sequential",
                "reasoning": "Remote work enables comprehensive employee surveillance; keystroke tracking becomes normal"
            },
            {
                "targetId": "offshoring-acceleration",
                "targetName": "Offshoring Acceleration",
                "relationshipType": "causal",
                "reasoning": "Remote work proves jobs don't need local presence; offshoring to cheaper labor markets accelerates"
            }
        ]
    },

    # TECHNOLOGICAL ISSUES
    {
        "issueId": "algorithmic-bias-perpetuation",
        "issueName": "Algorithmic Bias Perpetuation",
        "connectedTo": [
            {
                "targetId": "ai-job-displacement-tsunami",
                "targetName": "AI Job Displacement Tsunami",
                "relationshipType": "reinforcing",
                "reasoning": "AI hiring systems create feedback loops excluding displaced workers from remaining jobs"
            },
            {
                "targetId": "gig-economy-serfdom",
                "targetName": "Gig Economy Serfdom",
                "relationshipType": "reinforcing",
                "reasoning": "Gig platform algorithms discriminate in task assignment and pay; reinforce inequalities"
            },
            {
                "targetId": "racial-reckoning-cycles",
                "targetName": "Racial Reckoning Cycles",
                "relationshipType": "causal",
                "reasoning": "Algorithmic bias in policing, hiring, lending perpetuates structural racism; triggers backlash"
            },
            {
                "targetId": "facial-recognition-bans",
                "targetName": "Facial Recognition Bans",
                "relationshipType": "sequential",
                "reasoning": "Proven bias in facial recognition drives prohibition movements; tech companies resist"
            },
            {
                "targetId": "predatory-lending-lawsuits",
                "targetName": "Predatory Lending Lawsuits",
                "relationshipType": "causal",
                "reasoning": "Algorithmic lending discrimination creates legal liability; class action lawsuits proliferate"
            }
        ]
    },
    {
        "issueId": "tech-worker-suicide-wave",
        "issueName": "Tech Worker Suicide Wave",
        "connectedTo": [
            {
                "targetId": "ai-job-displacement-tsunami",
                "targetName": "AI Job Displacement Tsunami",
                "relationshipType": "causal",
                "reasoning": "Irony of coders replaced by their own AI creations drives specific mental health crisis"
            },
            {
                "targetId": "mental-health-apocalypse",
                "targetName": "Mental Health Apocalypse",
                "relationshipType": "thematic",
                "reasoning": "Tech worker suicides are canary in coal mine for broader job loss mental health crisis"
            },
            {
                "targetId": "student-debt-slavery",
                "targetName": "Student Debt Slavery",
                "relationshipType": "reinforcing",
                "reasoning": "Tech workers lose jobs but keep debt; worthless CS degrees drive despair and suicide"
            },
            {
                "targetId": "gig-economy-serfdom",
                "targetName": "Gig Economy Serfdom",
                "relationshipType": "sequential",
                "reasoning": "Displaced tech workers forced into gig platforms; professional identity destruction"
            },
            {
                "targetId": "deaths-of-despair-epidemic",
                "targetName": "Deaths of Despair Epidemic",
                "relationshipType": "thematic",
                "reasoning": "Tech worker suicides are subset of broader despair deaths; same economic devastation"
            }
        ]
    },
    {
        "issueId": "cryptocurrency-crime-economy",
        "issueName": "Cryptocurrency Crime Economy",
        "connectedTo": [
            {
                "targetId": "ransomware-pandemic",
                "targetName": "Ransomware Pandemic",
                "relationshipType": "reinforcing",
                "reasoning": "Crypto enables untraceable ransomware payments; ransom money funds more attacks"
            },
            {
                "targetId": "human-trafficking-networks",
                "targetName": "Human Trafficking Networks",
                "relationshipType": "causal",
                "reasoning": "Cryptocurrency enables untraceable payments for trafficking; darknet markets proliferate"
            },
            {
                "targetId": "money-laundering-havens",
                "targetName": "Money Laundering Havens",
                "relationshipType": "sequential",
                "reasoning": "Crypto replaces traditional havens; DeFi enables instant laundering at scale"
            },
            {
                "targetId": "sanctions-evasion-networks",
                "targetName": "Sanctions Evasion Networks",
                "relationshipType": "causal",
                "reasoning": "Crypto allows sanctioned nations and entities to bypass financial restrictions"
            }
        ]
    },
    {
        "issueId": "supply-chain-cyber-attacks",
        "issueName": "Supply Chain Cyber Attacks",
        "connectedTo": [
            {
                "targetId": "state-sponsored-hacking-epidemic",
                "targetName": "State-Sponsored Hacking Epidemic",
                "relationshipType": "thematic",
                "reasoning": "States compromise software supply chains (SolarWinds) to infiltrate targets at scale"
            },
            {
                "targetId": "critical-infrastructure-attacks",
                "targetName": "Critical Infrastructure Attacks",
                "relationshipType": "causal",
                "reasoning": "Supply chain compromises enable infrastructure attacks; backdoors in ubiquitous software"
            },
            {
                "targetId": "just-in-time-supply-chain-collapse",
                "targetName": "Just-in-Time Supply Chain Collapse",
                "relationshipType": "causal",
                "reasoning": "Cyber attacks on logistics software paralyze supply chains; JIT systems cannot function"
            },
            {
                "targetId": "chip-manufacturing-monopolies",
                "targetName": "Chip Manufacturing Monopolies",
                "relationshipType": "reinforcing",
                "reasoning": "Hardware supply chain compromises (chip backdoors) drive domestic production mandates"
            },
            {
                "targetId": "cyber-cold-war",
                "targetName": "Cyber Cold War",
                "relationshipType": "thematic",
                "reasoning": "Supply chain attacks are primary weapon of cyber warfare; interdependence weaponized"
            }
        ]
    },
    {
        "issueId": "cyber-insurance-collapse",
        "issueName": "Cyber Insurance Collapse",
        "connectedTo": [
            {
                "targetId": "ransomware-pandemic",
                "targetName": "Ransomware Pandemic",
                "relationshipType": "sequential",
                "reasoning": "Ransomware claims bankrupt insurers; businesses cannot get coverage; attacks worsen"
            },
            {
                "targetId": "critical-infrastructure-attacks",
                "targetName": "Critical Infrastructure Attacks",
                "relationshipType": "causal",
                "reasoning": "Infrastructure cyber losses exceed insurable amounts; insurance market fails"
            },
            {
                "targetId": "climate-insurance-collapse-and-managed-retreat-wars",
                "targetName": "Climate Insurance Collapse and Managed Retreat Wars",
                "relationshipType": "thematic",
                "reasoning": "Both represent insurance market failure from catastrophic risk; cyber and climate uninsurable"
            },
            {
                "targetId": "healthcare-access-collapse",
                "targetName": "Healthcare Access Collapse",
                "relationshipType": "causal",
                "reasoning": "Hospital ransomware attacks uninsurable; healthcare providers cannot afford operations"
            }
        ]
    },
    {
        "issueId": "cyber-cold-war",
        "issueName": "Cyber Cold War",
        "connectedTo": [
            {
                "targetId": "state-sponsored-hacking-epidemic",
                "targetName": "State-Sponsored Hacking Epidemic",
                "relationshipType": "thematic",
                "reasoning": "State hacking is primary weapon of cyber warfare; both describe same geopolitical conflict"
            },
            {
                "targetId": "chip-manufacturing-monopolies",
                "targetName": "Chip Manufacturing Monopolies",
                "relationshipType": "reinforcing",
                "reasoning": "Semiconductor supply becomes primary geopolitical weapon; chip wars are cyber cold war"
            },
            {
                "targetId": "splinternet-and-data-localization-wars",
                "targetName": "Splinternet and Data Localization Wars",
                "relationshipType": "reinforcing",
                "reasoning": "Cyber conflict fragments internet along national boundaries; digital cold war architecture"
            },
            {
                "targetId": "supply-chain-cyber-attacks",
                "targetName": "Supply Chain Cyber Attacks",
                "relationshipType": "thematic",
                "reasoning": "Supply chain attacks are primary cyber warfare tactic; infrastructure interdependence weaponized"
            },
            {
                "targetId": "ai-compute-resource-wars",
                "targetName": "AI Compute Resource Wars",
                "relationshipType": "reinforcing",
                "reasoning": "AI capabilities become military advantage; compute wars are cyber cold war dimension"
            }
        ]
    },
    {
        "issueId": "facial-recognition-bans",
        "issueName": "Facial Recognition Bans",
        "connectedTo": [
            {
                "targetId": "algorithmic-bias-perpetuation",
                "targetName": "Algorithmic Bias Perpetuation",
                "relationshipType": "causal",
                "reasoning": "Proven racial bias in facial recognition drives prohibition movements; tech companies resist"
            },
            {
                "targetId": "surveillance-state-expansion",
                "targetName": "Surveillance State Expansion",
                "relationshipType": "reinforcing",
                "reasoning": "Ban movements fight surveillance creep; governments deploy facial recognition despite bans"
            },
            {
                "targetId": "police-militarization-escalation",
                "targetName": "Police Militarization Escalation",
                "relationshipType": "causal",
                "reasoning": "Police facial recognition enables mass surveillance; bans limit authoritarian policing tools"
            },
            {
                "targetId": "china-surveillance-export",
                "targetName": "China Surveillance Export",
                "relationshipType": "thematic",
                "reasoning": "Western bans contrast with Chinese deployment; facial recognition becomes freedom battleground"
            }
        ]
    },
    {
        "issueId": "great-firewall-expansion",
        "issueName": "Great Firewall Expansion",
        "connectedTo": [
            {
                "targetId": "splinternet-and-data-localization-wars",
                "targetName": "Splinternet and Data Localization Wars",
                "relationshipType": "thematic",
                "reasoning": "China's firewall is template for global internet balkanization; other nations copy model"
            },
            {
                "targetId": "censorship-industrial-complex",
                "targetName": "Censorship Industrial Complex",
                "relationshipType": "causal",
                "reasoning": "Firewall technology exported globally; censorship becomes commercial industry"
            },
            {
                "targetId": "vpn-crackdown-wars",
                "targetName": "VPN Crackdown Wars",
                "relationshipType": "sequential",
                "reasoning": "Firewall expansion drives VPN adoption; government crackdowns intensify; cat-and-mouse"
            },
            {
                "targetId": "authoritarian-tech-export",
                "targetName": "Authoritarian Tech Export",
                "relationshipType": "thematic",
                "reasoning": "Firewall technology sold to authoritarian regimes worldwide; digital authoritarianism spreads"
            }
        ]
    },
    {
        "issueId": "vpn-crackdown-wars",
        "issueName": "VPN Crackdown Wars",
        "connectedTo": [
            {
                "targetId": "great-firewall-expansion",
                "targetName": "Great Firewall Expansion",
                "relationshipType": "causal",
                "reasoning": "Firewall expansion drives VPN adoption; crackdowns attempt to block circumvention"
            },
            {
                "targetId": "splinternet-and-data-localization-wars",
                "targetName": "Splinternet and Data Localization Wars",
                "relationshipType": "sequential",
                "reasoning": "Data localization laws make VPNs illegal; users criminalized for accessing foreign services"
            },
            {
                "targetId": "censorship-industrial-complex",
                "targetName": "Censorship Industrial Complex",
                "relationshipType": "reinforcing",
                "reasoning": "VPN crackdowns create market for sophisticated circumvention; arms race escalates"
            },
            {
                "targetId": "surveillance-state-expansion",
                "targetName": "Surveillance State Expansion",
                "relationshipType": "reinforcing",
                "reasoning": "VPN bans enable comprehensive internet surveillance; privacy becomes illegal"
            }
        ]
    },
    {
        "issueId": "advertising-surveillance-complex",
        "issueName": "Advertising Surveillance Complex",
        "connectedTo": [
            {
                "targetId": "attention-economy-crisis",
                "targetName": "Attention Economy Crisis",
                "relationshipType": "thematic",
                "reasoning": "Both describe same exploitative system; surveillance enables attention capture and manipulation"
            },
            {
                "targetId": "social-media-addiction-crisis",
                "targetName": "Social Media Addiction Crisis",
                "relationshipType": "reinforcing",
                "reasoning": "Surveillance data enables personalized addiction; behavior tracking optimizes engagement"
            },
            {
                "targetId": "surveillance-state-expansion",
                "targetName": "Surveillance State Expansion",
                "relationshipType": "causal",
                "reasoning": "Commercial surveillance infrastructure repurposed for state surveillance; data sharing proliferates"
            },
            {
                "targetId": "data-broker-economy",
                "targetName": "Data Broker Economy",
                "relationshipType": "thematic",
                "reasoning": "Advertising surveillance creates data broker market; personal information commodified"
            }
        ]
    },
    {
        "issueId": "digital-trade-wars",
        "issueName": "Digital Trade Wars",
        "connectedTo": [
            {
                "targetId": "splinternet-and-data-localization-wars",
                "targetName": "Splinternet and Data Localization Wars",
                "relationshipType": "causal",
                "reasoning": "App store blocking and cloud seizures trigger retaliatory tariffs; economic decoupling"
            },
            {
                "targetId": "chip-manufacturing-monopolies",
                "targetName": "Chip Manufacturing Monopolies",
                "relationshipType": "reinforcing",
                "reasoning": "Semiconductor export controls are primary digital trade war weapon; tech decoupling"
            },
            {
                "targetId": "cyber-cold-war",
                "targetName": "Cyber Cold War",
                "relationshipType": "thematic",
                "reasoning": "Digital trade wars are economic dimension of cyber conflict; trade restrictions weaponized"
            },
            {
                "targetId": "great-firewall-expansion",
                "targetName": "Great Firewall Expansion",
                "relationshipType": "causal",
                "reasoning": "Foreign service blocking triggers trade retaliation; digital protectionism proliferates"
            }
        ]
    },
    {
        "issueId": "censorship-industrial-complex",
        "issueName": "Censorship Industrial Complex",
        "connectedTo": [
            {
                "targetId": "great-firewall-expansion",
                "targetName": "Great Firewall Expansion",
                "relationshipType": "causal",
                "reasoning": "Firewall technology exported globally; censorship becomes profitable commercial industry"
            },
            {
                "targetId": "splinternet-and-data-localization-wars",
                "targetName": "Splinternet and Data Localization Wars",
                "relationshipType": "sequential",
                "reasoning": "Splinternet enables nations to enforce local content controls via commercial censorship"
            },
            {
                "targetId": "authoritarian-tech-export",
                "targetName": "Authoritarian Tech Export",
                "relationshipType": "thematic",
                "reasoning": "Censorship tools sold to authoritarian regimes worldwide; oppression commercialized"
            },
            {
                "targetId": "surveillance-state-expansion",
                "targetName": "Surveillance State Expansion",
                "relationshipType": "reinforcing",
                "reasoning": "Censorship requires surveillance; both industries profit from oppression infrastructure"
            }
        ]
    }
]

# Append new connections to existing data
connections_data['connections'].extend(new_connections)

# Update metadata
connections_data['metadata']['totalConnections'] = sum(
    len(conn['connectedTo']) for conn in connections_data['connections']
)
connections_data['metadata']['generatedAt'] = "2025-11-21T17:00:00Z"

# Save updated connections
with open(CONNECTIONS_FILE, 'w') as f:
    json.dump(connections_data, f, indent=2)

print(f"✓ Added {len(new_connections)} new issue connection objects")
print(f"✓ Total connections now: {connections_data['metadata']['totalConnections']}")
print(f"✓ Total issues with connections: {len(connections_data['connections'])}")
