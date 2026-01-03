export type AgentProfileTab = 'overview' | 'cognitive' | 'performance' | 'lifestyle' | 'constraints' | 'debug';

export const AGENT_PROFILE_TABS: AgentProfileTab[] = [
  'overview',
  'cognitive',
  'performance',
  'lifestyle',
  'constraints',
  'debug',
];

export function isAgentProfileTab(value: string): value is AgentProfileTab {
  return (AGENT_PROFILE_TABS as readonly string[]).includes(value);
}
