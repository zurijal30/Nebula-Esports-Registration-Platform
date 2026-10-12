import type { AdminCompetition,AdminEvent,AdminGame } from "@/lib/admin/data";
import { toColomboInput } from "@/lib/admin/policy";
import { saveCompetitionAction,saveEventAction } from "@/lib/admin/actions";
import { AdminForm } from "./admin-form";
const statusOptions=[{value:"scheduled",label:"Scheduled / available"},{value:"cancelled",label:"Cancelled"}];
export function EventEditor({event}:{event?:AdminEvent}){
  return <AdminForm action={saveEventAction} hidden={{id:event?.id??""}} label={event?"Save event":"Create event"} confirmWhen={event?[...(event.is_published?[{field:"is_published",value:"false",message:"Unpublish this event? Existing registrations will be preserved."}]:[]),...(event.status==="scheduled"?[{field:"status",value:"cancelled",message:"Cancel this event? Player registration changes will stop."}]:[])]:[]} fields={[
    {name:"title",label:"Event title",required:true,maxLength:160,value:event?.title},
    {name:"slug",label:"Event URL name",maxLength:100,value:event?.slug,readOnly:!!event,help:event?"The URL stays fixed so existing links keep working.":"Optional. Generated from the title; use lowercase words separated by hyphens."},
    {name:"description",label:"Description",type:"textarea",maxLength:10000,value:event?.description},
    {name:"venue",label:"Venue",required:true,maxLength:240,value:event?.venue},
    {name:"starts_at",label:"Event starts · Asia/Colombo",type:"datetime-local",required:true,value:toColomboInput(event?.starts_at)},
    {name:"ends_at",label:"Event ends · Asia/Colombo",type:"datetime-local",required:true,value:toColomboInput(event?.ends_at)},
    {name:"is_published",label:"Publication",type:"select",value:event?.is_published?"true":"false",options:[{value:"false",label:"Unpublished draft"},{value:"true",label:"Published · visible publicly"}]},
    {name:"status",label:"Event status",type:"select",value:event?.status??"scheduled",options:statusOptions},
  ]}/>;
}
export function CompetitionEditor({event,games,competition,hasRegistrations=false}:{event:AdminEvent;games:AdminGame[];competition?:AdminCompetition;hasRegistrations?:boolean}){
  return <AdminForm action={saveCompetitionAction} hidden={{id:competition?.id??"",event_id:event.id}} label={competition?"Save competition":"Add competition"} confirmWhen={competition?.status==="scheduled"?[{field:"status",value:"cancelled",message:"Cancel this competition? Its existing registrations will be kept."}]:[]} fields={[
    {name:"game_id",label:"Game",type:"select",required:true,value:competition?.game_id??"",readOnly:hasRegistrations,options:[{value:"",label:"Choose a game"},...games.map(g=>({value:g.id,label:g.title+(g.is_active?"":" · hidden")}))],help:hasRegistrations?"Game and format are locked because this competition has registrations.":undefined},
    {name:"registration_type",label:"Registration format",type:"select",value:competition?.registration_type??"solo",readOnly:hasRegistrations,options:[{value:"solo",label:"Solo"},{value:"team",label:"Team"}]},
    {name:"registration_opens_at",label:"Registration opens · Asia/Colombo",type:"datetime-local",required:true,value:toColomboInput(competition?.registration_opens_at)},
    {name:"registration_closes_at",label:"Registration closes · Asia/Colombo",type:"datetime-local",required:true,value:toColomboInput(competition?.registration_closes_at)},
    {name:"starts_at",label:"Competition starts · Asia/Colombo",type:"datetime-local",value:toColomboInput(competition?.starts_at),help:"Leave blank to use the event start when saving. Saved competition times remain independent."},
    {name:"venue_override",label:"Competition venue · optional",maxLength:240,value:competition?.venue_override??"",help:"Leave blank to use the event venue."},
    {name:"registration_fee_lkr",label:"Participation fee · LKR",type:"number",value:String(competition?.registration_fee_lkr??0),help:"Informational only. Payable at the venue."},
    {name:"status",label:"Availability",type:"select",value:competition?.status??"scheduled",options:statusOptions},
  ]}/>;
}
