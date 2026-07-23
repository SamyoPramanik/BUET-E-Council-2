"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import api, { fetcher } from "../../../lib/api";
import SearchableSelect from "../../../components/SearchableSelect";
import CustomSelect from "../../../components/CustomSelect";
import { toast } from "sonner";
import { useConfirm } from "../../../hooks/useConfirm";
import { useAuth } from "../../../hooks/useAuth";
import { Users, Shield, Settings, Plus, Pencil, Trash2, Check } from "lucide-react";
import DataTable from "../../../components/DataTable";

export default function RoleAndUserManagementPage() {
  const router = useRouter();
  const { user: currentUser, isAdmin, isViewer, isLoading: authLoading } = useAuth();
  const { confirm, ConfirmModal } = useConfirm();

  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'settings'>('users');

  // SWR Data Fetching
  const { data: usersRes, mutate: mutateUsers } = useSWR('/auth/users', fetcher);
  const { data: rolesRes, mutate: mutateRoles } = useSWR('/auth/roles', fetcher);
  const { data: settingsRes, mutate: mutateSettings } = useSWR('/auth/settings', fetcher);

  const users = usersRes?.data || [];
  const roles: any[] = rolesRes?.data || [];
  const settings = settingsRes?.data || {};

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isUserEditMode, setIsUserEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "editor", // 'admin', 'viewer', 'editor'
    role_id: "",
    member_type: "none",
    status: "active"
  });

  // Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isRoleEditMode, setIsRoleEditMode] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    level: "",
    level_title: ""
  });

  // User Filters State
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [memberTypeFilter, setMemberTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // System Settings State
  const [minCompletedLevel, setMinCompletedLevel] = useState<string>("1");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!authLoading && isViewer) {
      router.replace('/workspace');
    }
  }, [authLoading, isViewer, router]);

  useEffect(() => {
    if (settings.min_completed_level !== undefined) {
      setMinCompletedLevel(String(settings.min_completed_level));
    }
  }, [settings]);

  // Handle User Modal Submit
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        username: userFormData.username,
        email: userFormData.email,
        member_type: userFormData.member_type,
        status: userFormData.status
      };

      if (userFormData.password) payload.password = userFormData.password;

      if (userFormData.role === 'admin' || userFormData.role === 'viewer') {
        payload.role = userFormData.role;
        payload.role_id = null;
      } else {
        payload.role = 'editor';
        payload.role_id = userFormData.role_id || null;
      }

      if (isUserEditMode && editingUserId) {
        await api.put(`/auth/users/${editingUserId}`, payload);
        toast.success("User updated successfully!");
      } else {
        const res = await api.post('/auth/signup', payload);
        toast.success("User created successfully!");
        if (res.data?.generated_password) {
          toast.info(`Generated password: ${res.data.generated_password}`);
        }
      }

      setIsUserModalOpen(false);
      await mutateUsers(undefined, { revalidate: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save user");
      await mutateUsers(undefined, { revalidate: true });
    }
  };

  // Handle Role Modal Submit
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        level: parseInt(roleFormData.level, 10),
        level_title: roleFormData.level_title
      };

      if (isRoleEditMode && editingRoleId) {
        await api.put(`/auth/roles/${editingRoleId}`, payload);
        toast.success("Role updated successfully!");
      } else {
        await api.post('/auth/roles', payload);
        toast.success("Role created successfully!");
      }

      setIsRoleModalOpen(false);
      await mutateRoles();
      await mutateUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save role");
      await mutateRoles();
    }
  };

  // Handle System Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.put('/auth/settings', {
        min_completed_level: parseInt(minCompletedLevel, 10)
      });
      toast.success("Completion level setting updated successfully!");
      mutateSettings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Delete Handlers
  const handleDeleteUser = (u: any) => {
    confirm("Delete User", `Are you sure you want to delete user '${u.username}'?`, async () => {
      try {
        await api.delete(`/auth/users/${u.id}`);
        toast.success("User deleted successfully.");
        await mutateUsers(undefined, { revalidate: true });
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to delete user.");
        await mutateUsers(undefined, { revalidate: true });
      }
    });
  };

  const handleDeleteRole = (r: any) => {
    confirm("Delete Role Level", `Are you sure you want to delete role '${r.level_title}'?`, async () => {
      try {
        await api.delete(`/auth/roles/${r.id}`);
        toast.success("Role level deleted successfully.");
        await mutateRoles(undefined, { revalidate: true });
        await mutateUsers(undefined, { revalidate: true });
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to delete role.");
        await mutateRoles(undefined, { revalidate: true });
      }
    });
  };

  const handleRoleReorder = async (newOrder: any[]) => {
    try {
      const existingLevels = roles.map((r: any) => Number(r.level)).sort((a, b) => b - a);
      const reorderedItems = newOrder.map((r: any, idx: number) => ({
        id: r.id,
        level: existingLevels[idx] !== undefined ? existingLevels[idx] : (newOrder.length - idx)
      }));
      await api.put('/auth/roles/reorder', { items: reorderedItems });
      toast.success("Role levels reordered successfully.");
      await mutateRoles(undefined, { revalidate: true });
      await mutateUsers(undefined, { revalidate: true });
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to reorder role levels.");
      await mutateRoles(undefined, { revalidate: true });
    }
  };

  const openUserCreateModal = () => {
    setIsUserEditMode(false);
    setEditingUserId(null);
    setUserFormData({
      username: "",
      email: "",
      password: "",
      role: roles.length > 0 ? "editor" : "viewer",
      role_id: roles.length > 0 ? roles[0].id : "",
      member_type: "none",
      status: "active"
    });
    setIsUserModalOpen(true);
  };

  const openUserEditModal = (u: any) => {
    setIsUserEditMode(true);
    setEditingUserId(u.id);
    setUserFormData({
      username: u.username || "",
      email: u.email || "",
      password: "",
      role: u.role || "editor",
      role_id: u.role_id || (roles.length > 0 ? roles[0].id : ""),
      member_type: u.member_type || "none",
      status: u.status || "active"
    });
    setIsUserModalOpen(true);
  };

  const openRoleCreateModal = () => {
    setIsRoleEditMode(false);
    setEditingRoleId(null);
    setRoleFormData({ level: "", level_title: "" });
    setIsRoleModalOpen(true);
  };

  const openRoleEditModal = (r: any) => {
    setIsRoleEditMode(true);
    setEditingRoleId(r.id);
    setRoleFormData({ level: String(r.level), level_title: r.level_title || "" });
    setIsRoleModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmModal />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role & User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage system users, level-based editor permissions, and meeting completion settings.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'users' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" /> Users
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'roles' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="w-4 h-4" /> Role Levels
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'settings' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="w-4 h-4" /> Completion Level
            </button>
          )}
        </div>
      </div>

      {/* ----------------- TAB 1: USERS ----------------- */}
      {activeTab === 'users' && (() => {
        const currentUserLevel = isAdmin ? 999999 : (currentUser?.role_level !== null && currentUser?.role_level !== undefined ? Number(currentUser.role_level) : -1);

        const filteredUsers = users.filter((u: any) => {
          if (roleFilter !== 'all') {
            if (roleFilter === 'admin' && u.role !== 'admin') return false;
            if (roleFilter === 'viewer' && u.role !== 'viewer') return false;
            if (roleFilter !== 'admin' && roleFilter !== 'viewer') {
              if (u.role_id !== roleFilter && u.level_title !== roleFilter) return false;
            }
          }
          if (memberTypeFilter !== 'all' && (u.member_type || 'none') !== memberTypeFilter) {
            return false;
          }
          if (statusFilter !== 'all' && (u.status || 'active') !== statusFilter) {
            return false;
          }
          return true;
        });

        const formattedUsers = filteredUsers.map((u: any) => {
          const targetUserLevel = u.role === 'admin' ? 999999 : (u.role_level !== null && u.role_level !== undefined ? Number(u.role_level) : -1);
          const canChangeUserStatus = isAdmin || (currentUserLevel > targetUserLevel && u.role !== 'admin');

          return {
            ...u,
            role_title_display: u.role === 'admin' ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                Admin (Super Access)
              </span>
            ) : u.role === 'viewer' ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                Viewer (Read Only)
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {u.level_title || 'Editor'}
              </span>
            ),
            member_type_display: <span className="capitalize text-muted-foreground">{u.member_type || 'None'}</span>,
            status_display: (
              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold capitalize ${
                u.status === 'inactive'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              }`}>
                {u.status || 'active'}
              </span>
            )
          };
        });

        const userFilters = (
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <CustomSelect
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: "all", label: "All Role Titles" },
                  { value: "admin", label: "Admin" },
                  { value: "viewer", label: "Viewer" },
                  ...roles.map((r: any) => ({ value: r.id, label: r.level_title }))
                ]}
              />
            </div>

            <div className="w-44">
              <CustomSelect
                value={memberTypeFilter}
                onChange={setMemberTypeFilter}
                options={[
                  { value: "all", label: "All Member Types" },
                  { value: "syndicate", label: "Syndicate" },
                  { value: "academic", label: "Academic" },
                  { value: "both", label: "Both" },
                  { value: "none", label: "None" }
                ]}
              />
            </div>

            <div className="w-36">
              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" }
                ]}
              />
            </div>
          </div>
        );

        return (
          <div className="space-y-4">
            <DataTable
              columns={[
                { key: "username", label: "Username" },
                { key: "email", label: "Email" },
                { key: "role_title_display", label: "Role Title" },
                { key: "member_type_display", label: "Member Type" },
                { key: "status_display", label: "Status" }
              ]}
              data={formattedUsers}
              title={`System Users (${users.length})`}
              searchable
              searchPlaceholder="Search users by name or email..."
              filters={userFilters}
              onAdd={isAdmin || currentUser?.role_level !== null ? openUserCreateModal : undefined}
              onEdit={openUserEditModal}
              onDelete={handleDeleteUser}
            />
          </div>
        );
      })()}

      {/* ----------------- TAB 2: ROLE LEVELS ----------------- */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <DataTable
            columns={[
              { key: "level_title", label: "Role Title" },
              { key: "level", label: "Access Level" },
              { key: "created_at_formatted", label: "Created Date" }
            ]}
            data={roles.map((r: any) => ({
              ...r,
              created_at_formatted: r.created_at ? new Date(r.created_at).toLocaleDateString() : ''
            }))}
            title={`Editor Roles (${roles.length})`}
            searchable
            searchPlaceholder="Search roles..."
            onAdd={isAdmin || (currentUser?.role_level !== null && currentUser?.role_level !== undefined) ? openRoleCreateModal : undefined}
            onEdit={openRoleEditModal}
            onDelete={handleDeleteRole}
            onReorder={isAdmin || (currentUser?.role_level !== null && currentUser?.role_level !== undefined) ? handleRoleReorder : undefined}
          />
        </div>
      )}

      {/* ----------------- TAB 3: COMPLETION LEVEL SETTING (ADMIN ONLY) ----------------- */}
      {activeTab === 'settings' && isAdmin && (
        <div className="max-w-2xl bg-card border border-border shadow-sm rounded-lg p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Meeting Completion Settings
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Only Admin can configure which editor role title and above is authorized to mark a meeting as completed.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium block">
                Which role title and above can mark a meeting completed?
              </label>
              <CustomSelect
                value={minCompletedLevel}
                onChange={(val) => setMinCompletedLevel(val)}
                options={roles.map((r: any) => ({
                  value: String(r.level),
                  label: `${r.level_title} & Above`
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Users with this role title or higher (or Admin) will have the permission to mark meetings completed.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {savingSettings ? "Saving..." : "Save Setting"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold">
              {isUserEditMode ? "Edit / Degrade User" : "Create New User"}
            </h3>

            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Username</label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Password {isUserEditMode && "(Leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  required={!isUserEditMode}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Role Type</label>
                <CustomSelect
                  value={userFormData.role}
                  onChange={(val) => setUserFormData({ ...userFormData, role: val })}
                  options={[
                    ...(isAdmin ? [{ value: "admin", label: "Admin (Super Access)" }] : []),
                    { value: "editor", label: "Editor (Custom Role Level)" },
                    { value: "viewer", label: "Viewer (Read Only)" }
                  ]}
                />
              </div>

              {userFormData.role === 'editor' && (
                <div>
                  <label className="text-sm font-medium block mb-1">Assign Role Title</label>
                  {roles.length > 0 ? (
                    <CustomSelect
                      value={userFormData.role_id}
                      onChange={(val) => setUserFormData({ ...userFormData, role_id: val })}
                      options={roles.map((r: any) => ({
                        value: r.id,
                        label: r.level_title
                      }))}
                    />
                  ) : (
                    <p className="text-xs text-destructive">
                      No custom role levels exist. Please create a role level under the "Role Levels" tab first!
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium block mb-1">Member Type</label>
                <CustomSelect
                  value={userFormData.member_type}
                  onChange={(val) => setUserFormData({ ...userFormData, member_type: val })}
                  options={[
                    { value: "none", label: "None (All Types)" },
                    { value: "academic", label: "Academic" },
                    { value: "syndicate", label: "Syndicate" }
                  ]}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Status</label>
                <CustomSelect
                  value={userFormData.status}
                  onChange={(val) => setUserFormData({ ...userFormData, status: val })}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" }
                  ]}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
                >
                  {isUserEditMode ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE MODAL */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold">
              {isRoleEditMode ? "Edit Role Title" : "Create Role Title"}
            </h3>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Role Title</label>
                <input
                  type="text"
                  value={roleFormData.level_title}
                  onChange={(e) => setRoleFormData({ ...roleFormData, level_title: e.target.value })}
                  placeholder='e.g., "Section Officer" or "Registrar"'
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Role Level Priority Rank (Number)</label>
                <input
                  type="number"
                  value={roleFormData.level}
                  onChange={(e) => setRoleFormData({ ...roleFormData, level: e.target.value })}
                  placeholder="Higher number = Higher authority (e.g., 1, 2, 3)"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
                >
                  {isRoleEditMode ? "Update Role" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
