"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard,CalendarDays,Gamepad2,Users,ClipboardList } from "lucide-react";
const links=[{href:"/admin",label:"Dashboard",icon:LayoutDashboard},{href:"/admin/events",label:"Events",icon:CalendarDays},{href:"/admin/games",label:"Games",icon:Gamepad2},{href:"/admin/registrations",label:"Registrations",icon:ClipboardList},{href:"/admin/users",label:"Users",icon:Users}];
export function AdminNavigation(){const path=usePathname();return <nav className="admin-navigation" aria-label="Administrator navigation">{links.map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={path===href||(href!=="/admin"&&path.startsWith(href+"/"))?"page":undefined}><Icon size={18}/>{label}</Link>)}</nav>;}
