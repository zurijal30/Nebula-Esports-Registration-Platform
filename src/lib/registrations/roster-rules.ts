export const PARTICIPANT_ROLES = ["coach","player_1","player_2","player_3","player_4","player_5","substitute_1","substitute_2"] as const;
export type ParticipantRole = typeof PARTICIPANT_ROLES[number];
export interface RosterRules { maxTeamSize?:number|null; availableRoles?:readonly ParticipantRole[]|null }
export const roleLabel=(role?:string|null)=>role==="coach"?"Coach":role?.startsWith("player_")?`Player ${role.slice(7)}`:role?.startsWith("substitute_")?`Substitute ${role.slice(11)}`:"Unassigned";
export function effectiveRosterRules(rules:RosterRules={}) {
  return {max:rules.maxTeamSize??8,roles:rules.availableRoles??PARTICIPANT_ROLES};
}
export function validateTeamRoster(players:{role?:string|null}[],rules:RosterRules={}) {
  const {max,roles}=effectiveRosterRules(rules);
  if(players.length>max)return `This game allows a maximum of ${max} individuals per team.`;
  const assigned=new Set<string>();
  for(const [index,player] of players.entries()){
    if(!player.role||!roles.includes(player.role as ParticipantRole))return `Participant ${index+1}: choose an available role.`;
    if(assigned.has(player.role))return "Each participant must have a different role.";
    if(index===0&&!player.role.startsWith("player_"))return "The captain must have a Player role.";
    assigned.add(player.role);
  }
  return null;
}
