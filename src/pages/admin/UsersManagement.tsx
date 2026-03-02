import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { SearchBar } from "@/components/admin/SearchBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Plus, Pencil, Shield, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/auditLog";
import { adminTranslations } from "@/constants/adminTranslations";

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  created_at: string;
}

interface UserWithRoles extends Profile {
  roles: string[];
  email?: string;
}

type AppRole = 'admin' | 'entrepreneur' | 'advisor' | 'supplier';

const UsersManagement = () => {
  const [search, setSearch] = useState("");
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [editFormData, setEditFormData] = useState({ name: "", email: "", phone: "" });
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    roles: [] as AppRole[],
  });
  const [isSyncingEmails, setIsSyncingEmails] = useState(false);

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data: profiles, error: profilesError } = await query;
      if (profilesError) throw profilesError;

      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          return {
            ...profile,
            roles: rolesData?.map(r => r.role) || [],
            email: profile.email || '(אימייל חסר)',
          };
        })
      );

      return usersWithRoles as UserWithRoles[];
    },
  });

  const syncEmailsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-user-emails');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`סונכרו ${data.synced} כתובות מייל בהצלחה${data.failed > 0 ? `, ${data.failed} נכשלו` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast.error(`שגיאה בסנכרון כתובות מייל: ${error.message}`);
    },
  });

  const handleSyncEmails = () => {
    setIsSyncingEmails(true);
    syncEmailsMutation.mutate(undefined, {
      onSettled: () => setIsSyncingEmails(false),
    });
  };

  const updateRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: AppRole[] }) => {
      const oldRoles = users.find(u => u.user_id === userId)?.roles || [];
      await supabase.from('user_roles').delete().eq('user_id', userId);
      if (roles.length > 0) {
        const { error } = await supabase
          .from('user_roles')
          .insert(roles.map(role => ({ user_id: userId, role })));
        if (error) throw error;
      }
      await logAdminAction('update_roles', 'user_roles', userId, oldRoles, roles);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(adminTranslations.users.rolesUpdated);
      setShowRoleDialog(false);
      setSelectedUser(null);
      setSelectedRoles([]);
    },
    onError: (error: any) => {
      toast.error(error.message || adminTranslations.users.updateFailed);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, name, email, phone }: { userId: string; name: string; email: string; phone: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'update_profile', userId, name, email, phone },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      await logAdminAction('update', 'profiles', userId, null, { name, email, phone });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(adminTranslations.users.profileUpdated);
      setShowEditDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.message || adminTranslations.users.profileUpdateFailed);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'reset_password', userId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      await logAdminAction('reset_password', 'users', userId, null, null);
      return data;
    },
    onSuccess: () => {
      toast.success(adminTranslations.users.resetPasswordSent);
    },
    onError: (error: any) => {
      toast.error(error.message || adminTranslations.users.resetPasswordFailed);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof createFormData) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', ...userData },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      await logAdminAction('create', 'users', data.user.id, null, userData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(adminTranslations.users.userCreated);
      setShowCreateDialog(false);
      setCreateFormData({ email: "", password: "", name: "", phone: "", roles: [] });
    },
    onError: (error: any) => {
      toast.error(error.message || adminTranslations.users.createFailed);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const oldData = users.find(u => u.user_id === userId);
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', userId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      await logAdminAction('delete', 'users', userId, oldData, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(adminTranslations.users.userDeleted);
      setShowDeleteDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      if (error.message.includes('Cannot delete')) {
        toast.error(adminTranslations.users.cannotDeleteSelf);
      } else {
        toast.error(error.message || adminTranslations.users.deleteFailed);
      }
    },
  });

  const handleManageRoles = (user: UserWithRoles) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles as AppRole[]);
    setShowRoleDialog(true);
  };

  const handleEditUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      phone: (user as any).phone || "",
    });
    setShowEditDialog(true);
  };

  const handleResetPassword = (user: UserWithRoles) => {
    if (confirm(adminTranslations.users.resetPasswordConfirm)) {
      resetPasswordMutation.mutate(user.user_id);
    }
  };

  const handleDeleteUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleRoleToggle = (role: AppRole) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSaveRoles = () => {
    if (!selectedUser) return;
    updateRolesMutation.mutate({ userId: selectedUser.user_id, roles: selectedRoles });
  };

  const handleSaveProfile = () => {
    if (!selectedUser) return;
    updateProfileMutation.mutate({
      userId: selectedUser.user_id,
      ...editFormData,
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.email || !createFormData.password) {
      toast.error(adminTranslations.users.emailRequired);
      return;
    }
    if (createFormData.password.length < 6) {
      toast.error(adminTranslations.users.passwordMinLength);
      return;
    }
    createUserMutation.mutate(createFormData);
  };

  const handleCreateRoleToggle = (role: AppRole) => {
    setCreateFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter(r => r !== role) : [...prev.roles, role],
    }));
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return adminTranslations.users.admin;
      case 'entrepreneur': return adminTranslations.users.entrepreneur;
      case 'advisor': return adminTranslations.users.advisor;
      case 'supplier': return adminTranslations.users.supplier;
      default: return role;
    }
  };

  const columns: Column<UserWithRoles>[] = [
    { header: adminTranslations.users.name, accessorKey: "name" },
    { header: adminTranslations.users.email, accessorKey: "email" },
    { header: adminTranslations.users.profileRole, accessorKey: "role" },
    {
      header: adminTranslations.users.assignedRoles,
      cell: (item) => (
        <div className="flex gap-1 flex-wrap">
          {item.roles.length > 0 ? (
            item.roles.map(role => (
              <Badge key={role} variant="secondary">
                {getRoleText(role)}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">{adminTranslations.users.noRoles}</span>
          )}
        </div>
      ),
    },
    {
      header: adminTranslations.users.created,
      cell: (item) => new Date(item.created_at).toLocaleDateString('he-IL'),
    },
    {
      header: adminTranslations.users.actions,
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{adminTranslations.users.moreActions}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditUser(item)}>
              <Pencil className="h-4 w-4 ml-2" />
              {adminTranslations.users.editDetails}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleManageRoles(item)}>
              <Shield className="h-4 w-4 ml-2" />
              {adminTranslations.users.manageRoles}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleResetPassword(item)}>
              <KeyRound className="h-4 w-4 ml-2" />
              {adminTranslations.users.resetPassword}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteUser(item)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              {adminTranslations.users.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const roleOptions: AppRole[] = ['admin', 'entrepreneur', 'advisor', 'supplier'];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{adminTranslations.users.title}</h1>
            <p className="text-muted-foreground mt-1">{adminTranslations.users.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncEmails} disabled={isSyncingEmails}>
              {isSyncingEmails ? 'מסנכרן...' : 'סנכרן כתובות מייל'}
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 ml-2" />
              {adminTranslations.users.addUser}
            </Button>
          </div>
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder={adminTranslations.users.searchPlaceholder} />

        <DataTable data={users} columns={columns} />

        {/* Manage Roles Dialog */}
        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          <DialogContent dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle>{adminTranslations.users.manageUserRoles}</DialogTitle>
              <DialogDescription>
                {adminTranslations.users.assignOrRemove} {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {roleOptions.map(role => (
                <div key={role} className="flex items-center gap-2 flex-row-reverse justify-end">
                  <Label htmlFor={role} className="capitalize cursor-pointer">{getRoleText(role)}</Label>
                  <Checkbox id={role} checked={selectedRoles.includes(role)} onCheckedChange={() => handleRoleToggle(role)} />
                </div>
              ))}
            </div>
            <DialogFooter className="gap-2">
              <Button onClick={handleSaveRoles}>{adminTranslations.users.saveChanges}</Button>
              <Button variant="outline" onClick={() => setShowRoleDialog(false)}>{adminTranslations.users.cancel}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle>{adminTranslations.users.editUser}</DialogTitle>
              <DialogDescription>{adminTranslations.users.editUserDesc}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{adminTranslations.users.name}</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">{adminTranslations.users.email}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">{adminTranslations.users.phone}</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                {adminTranslations.users.saveChanges}
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>{adminTranslations.users.cancel}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle>{adminTranslations.users.createUser}</DialogTitle>
              <DialogDescription>{adminTranslations.users.createUserDesc}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">{adminTranslations.users.email} *</Label>
                <Input id="new-email" type="email" value={createFormData.email} onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{adminTranslations.users.password} *</Label>
                <Input id="new-password" type="password" value={createFormData.password} onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">{adminTranslations.users.name}</Label>
                <Input id="new-name" value={createFormData.name} onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-phone">{adminTranslations.users.phone}</Label>
                <Input id="new-phone" value={createFormData.phone} onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{adminTranslations.users.assignRoles}</Label>
                <div className="space-y-2">
                  {roleOptions.map(role => (
                    <div key={role} className="flex items-center gap-2 flex-row-reverse justify-end">
                      <Label htmlFor={`create-${role}`} className="capitalize cursor-pointer">{getRoleText(role)}</Label>
                      <Checkbox id={`create-${role}`} checked={createFormData.roles.includes(role)} onCheckedChange={() => handleCreateRoleToggle(role)} />
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="submit">{adminTranslations.users.create}</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>{adminTranslations.users.cancel}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>{adminTranslations.users.deleteConfirm}</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUser?.name} ({selectedUser?.email})
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogAction
                onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.user_id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {adminTranslations.users.delete}
              </AlertDialogAction>
              <AlertDialogCancel>{adminTranslations.users.cancel}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default UsersManagement;
