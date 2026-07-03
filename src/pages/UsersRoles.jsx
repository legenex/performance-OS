import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "@/lib/audit";

const APP_ROLES = ["owner", "ops", "media_buyer", "infra"];

export default function UsersRoles() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);

  async function load() {
    setLoading(true);
    try { setUsers(await base44.entities.User.list("-created_date", 200)); }
    catch { setUsers([]); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function invite() {
    if (!inviteEmail.trim()) { toast({ title: "Email required", variant: "destructive" }); return; }
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast({ title: "Invitation sent", description: inviteEmail });
      setInviteEmail("");
      load();
    } catch (e) {
      toast({ title: "Invite failed", description: e.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  }

  async function setAppRole(u, role) {
    await base44.entities.User.update(u.id, { app_role: role });
    logAudit("update", "User", u.id, { app_role: role, email: u.email });
    load();
    toast({ title: "Role updated", description: `${u.email} → ${role}` });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Users & Roles" subtitle="Invite teammates and assign PerformanceOS roles" />

      <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-4 h-4 text-graphite-muted" />
          <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider">Invite User</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Input placeholder="email@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="flex-1 min-w-[200px] bg-graphite-well border-graphite-border" />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-40 bg-graphite-well border-graphite-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-graphite-elevated border-graphite-border">
              <SelectItem value="user" className="text-foreground">user</SelectItem>
              <SelectItem value="admin" className="text-foreground">admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={invite} disabled={inviting} className="bg-brand-red hover:bg-brand-red/90 text-white">{inviting ? "Inviting…" : "Invite"}</Button>
        </div>
      </div>

      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-graphite-border"><h2 className="text-sm font-semibold text-foreground">Team</h2></div>
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !users.length ? (
          <EmptyState icon={Users} title="No users" description="Invite your first teammate." />
        ) : (
          <div className="divide-y divide-graphite-border">
            {users.map((u) => (
              <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{u.full_name || u.email}</div>
                  <div className="text-xs text-graphite-muted truncate">{u.email} · platform: {u.role}</div>
                </div>
                <Select value={u.app_role || (u.role === "admin" ? "owner" : "ops")} onValueChange={(v) => setAppRole(u, v)}>
                  <SelectTrigger className="w-36 bg-graphite-well border-graphite-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-graphite-elevated border-graphite-border">
                    {APP_ROLES.map((r) => <SelectItem key={r} value={r} className="text-foreground">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}