"use client";
import { useActionState, useState } from "react";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import { saveRegistrationAction, type RegistrationFormState } from "@/lib/registrations/actions";
import { moveTeammate, removeTeammate, type PlayerInput } from "@/lib/registrations/policy";
import { SubmitButton } from "@/components/auth/submit-button";
import { effectiveRosterRules, roleLabel, validateTeamRoster, type RosterRules } from "@/lib/registrations/roster-rules";
export function RegistrationForm({ competitionId, type, email, initialPlayers, registrationId, initialTeam = "", initialClan = "", admin = false, manual = false, requestId, rosterRules={}, saveAction = saveRegistrationAction }: {
  competitionId: string; type: "solo" | "team"; email: string; initialPlayers: PlayerInput[];
  registrationId?: string; initialTeam?: string; initialClan?: string; admin?: boolean; manual?: boolean; requestId?: string;
  saveAction?: (state:RegistrationFormState,form:FormData)=>Promise<RegistrationFormState>;
  rosterRules?:RosterRules;
}) {
  // Gameplay roles travel with each participant; the first row remains the captain.
  const rules=effectiveRosterRules(rosterRules);
  const [players, setPlayers] = useState(()=>initialPlayers.map((p,i)=>!registrationId&&i===0&&type==="team"?{...p,role:p.role||rules.roles.find(r=>r.startsWith("player_"))}:p));
  const [teamName, setTeamName] = useState(initialTeam);
  const [clanName, setClanName] = useState(initialClan);
  const [state, action, pending] = useActionState(saveAction, {});
  const [clientError,setClientError]=useState("");
  function update(key: string, field: keyof Omit<PlayerInput, "key">, value: string) {
    setPlayers((current) => current.map((p) => p.key === key ? { ...p, [field]: value } : p));
  }
  const unused=rules.roles.filter(r=>!players.some(p=>p.role===r));
  function move(index:number,direction:-1|1){setPlayers(current=>moveTeammate(current,index,direction));}
  return <form action={action} className="registration-form" onSubmit={e=>{const invalid=type==="team"?validateTeamRoster(players,rosterRules):null;setClientError(invalid??"");if(invalid)e.preventDefault();}}>
    <input type="hidden" name="competitionId" value={competitionId} />
    <input type="hidden" name="registrationId" value={registrationId ?? ""} />
    {requestId && <input type="hidden" name="requestId" value={requestId} />}
    <input type="hidden" name="players" value={JSON.stringify(players)} />
    <p className="contact-note"><ShieldCheck size={18} aria-hidden="true" />{admin && manual ? "Manual entry · no captain account required. Managed by Nebula administrators." : <>Contact email: <strong>{email || "Not supplied by the account"}</strong></>}</p>
    <fieldset disabled={pending}>
      {type === "team" && <div className="roster-panel"><h2>Team identity</h2><div className="registration-fields">
        <label>Team name <span aria-hidden="true">*</span><input name="teamName" required maxLength={120} value={teamName} onChange={(event) => setTeamName(event.target.value)} autoComplete="off" /></label>
      </div></div>}
      <div className="roster-panel"><label className="clan-field"><span className="optional-field-label">Clan Name <span className="field-optional">Optional</span></span><input name="clanName" maxLength={120} value={clanName} onChange={e=>setClanName(e.target.value)} autoComplete="off"/></label></div>
      {type==="team"&&<div className="roster-summary-note" role="status"><strong>Registered: {players.length} / {rules.max}</strong><p>Maximum individuals: {rules.max} · Remaining: {Math.max(0,rules.max-players.length)} · Unused roles: {unused.length}</p><p>Captain, coach and substitutes all count. You do not need to fill every slot.</p>{players.length>rules.max&&<p className="form-error">This existing roster is preserved. Remove participants to meet the current maximum before saving.</p>}</div>}
      {players.map((player, index) => <div className="roster-panel" key={player.key}>
        <div className="roster-heading"><h2>{index === 0 ? (type === "team" ? "Captain" : "Your player details") : `Teammate ${index}`}</h2>
          {index === 0 && type === "team" ? <span className="captain-label">{admin && manual ? "TEAM CAPTAIN" : "ACCOUNT OWNER"}</span> : index > 0 && <button type="button" className="remove-player" aria-label={`Remove teammate ${index}`} onClick={() => setPlayers((current) => removeTeammate(current, player.key))}><Trash2 size={16} />Remove</button>}
        </div>
        <div className="registration-fields">
          {type==="team"&&<label>Participant Role <span aria-hidden="true">*</span><select required value={player.role??""} onChange={e=>update(player.key,"role",e.target.value)}>
            <option value="">Unassigned · choose a role</option>
            {player.role&&!rules.roles.includes(player.role as typeof rules.roles[number])&&<option value={player.role}>{roleLabel(player.role)} · no longer available</option>}
            {rules.roles.filter(r=>index!==0||r.startsWith("player_")).map(r=><option key={r} value={r} disabled={players.some(p=>p.key!==player.key&&p.role===r)}>{roleLabel(r)}</option>)}
          </select></label>}
          {([ ["fullName", "Full name", "name"], ["ign", "In-game name (IGN)", "off"], ["gameId", "Game ID / UID", "off"], ["phone", "Phone number", "tel"] ] as const).map(([field, label, autoComplete]) => <label key={field}>
            {label} <span aria-hidden="true">*</span><input required maxLength={field === "phone" ? 30 : 120} minLength={field === "phone" ? 7 : 1}
              type={field === "phone" ? "tel" : "text"} pattern={field === "phone" ? "[+0-9 ()\\-]{7,30}" : undefined}
              autoComplete={index === 0 ? autoComplete : "off"} value={player[field]} onChange={(event) => update(player.key, field, event.target.value)} />
          </label>)}
        </div>
        {type==="team"&&index>0&&<div className="roster-reorder"><button type="button" disabled={index===1} onClick={()=>move(index,-1)}>Move up</button><button type="button" disabled={index===players.length-1} onClick={()=>move(index,1)}>Move down</button></div>}
      </div>)}
      {type === "team" && <div className="add-player-row"><button className="action-link action-secondary" type="button" disabled={players.length>=rules.max||!unused.length} onClick={() => setPlayers((current) => [...current, { key: crypto.randomUUID(), fullName: "", ign: "", gameId: "", phone: "",role:unused.find(r=>r.startsWith("player_"))??unused[0] }])}><Plus size={18} />Add Participant</button><p>{players.length>=rules.max?"The maximum roster size is reached.":!unused.length?"All configured roles are assigned.":"Add only the people participating. Coach and substitutes are optional."}</p></div>}
    </fieldset>
    {(clientError||state.error) && <p className="form-message form-error" role="alert">{clientError||state.error}</p>}
    <p className="directory-help">All fields marked * are required. {admin ? "Administrator changes are permitted after player deadlines. Ownership and source are preserved on edit." : "Entries can be edited or cancelled while registration is open."} Any participation fee is paid at the venue.</p>
    <SubmitButton label={registrationId ? "Save changes" : "Submit registration"} pendingLabel="Saving registration…" />
  </form>;
}
