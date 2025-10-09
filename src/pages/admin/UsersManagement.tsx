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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/auditLog";
import { adminTranslations } from "@/constants/adminTranslations";

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  email?: string | null;
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
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    roles: [] as AppRole[],
  });

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%`);
      }

      const { data: profiles, error: profilesError } = await query;
      if (profilesError) throw profilesError;

      // Fetch email addresses from auth.users via RPC or join
      const userIds = profiles.map(p => p.user_id);
      
      // Fetch roles and emails for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          // Get email from auth metadata (stored in profiles during signup)
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(profile.user_id);

          return {
            ...profile,
            roles: rolesData?.map(r => r.role) || [],
            email: authUser?.email || '',
          };
        })
      );

      return usersWithRoles as UserWithRoles[];
    },
  });

  const updateRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: AppRole[] }) => {
      const oldRoles = users.find(u => u.user_id === userId)?.roles || [];

      // Delete all existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new roles
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

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof createFormData) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'create',
          ...userData,
        },
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
      setCreateFormData({
        email: "",
        password: "",
        name: "",
        phone: "",
        roles: [],
      });
    },
    onError: (error: any) => {
      toast.error(error.message || adminTranslations.users.createFailed);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const oldData = users.find(u => u.user_id === userId);
      
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'delete',
          userId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      await logAdminAction('delete', 'users', userId, oldData, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(adminTranslations.users.userDeleted);
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

  const handleRoleToggle = (role: AppRole) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSaveRoles = () => {
    if (!selectedUser) return;
    updateRolesMutation.mutate({
      userId: selectedUser.user_id,
      roles: selectedRoles,
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
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
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
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
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleManageRoles(item)}
          >
            <Shield className="w-4 h-4 ml-1" />
            {adminTranslations.users.manageRoles}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm(adminTranslations.users.deleteConfirm)) {
                deleteUserMutation.mutate(item.user_id);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
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
            <p className="text-muted-foreground mt-1">
              {adminTranslations.users.description}
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 ml-2" />
            {adminTranslations.users.addUser}
          </Button>
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={adminTranslations.users.searchPlaceholder}
        />

        <DataTable data={users} columns={columns} />

        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{adminTranslations.users.manageUserRoles}</DialogTitle>
              <DialogDescription>
                {adminTranslations.users.assignOrRemove} {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {roleOptions.map(role => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={role}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => handleRoleToggle(role)}
                  />
                  <Label htmlFor={role} className="capitalize">
                    {getRoleText(role)}
                  </Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
                {adminTranslations.users.cancel}
              </Button>
              <Button onClick={handleSaveRoles}>{adminTranslations.users.saveChanges}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{adminTranslations.users.createUser}</DialogTitle>
              <DialogDescription>
                {adminTranslations.users.createUserDesc}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">{adminTranslations.users.email} *</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{adminTranslations.users.password} *</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">{adminTranslations.users.name}</Label>
                <Input
                  id="new-name"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-phone">{adminTranslations.users.phone}</Label>
                <Input
                  id="new-phone"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{adminTranslations.users.assignRoles}</Label>
                <div className="space-y-2">
                  {roleOptions.map(role => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`create-${role}`}
                        checked={createFormData.roles.includes(role)}
                        onCheckedChange={() => handleCreateRoleToggle(role)}
                      />
                      <Label htmlFor={`create-${role}`} className="capitalize">
                        {getRoleText(role)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {adminTranslations.users.cancel}
                </Button>
                <Button type="submit">
                  {adminTranslations.users.create}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default UsersManagement;
