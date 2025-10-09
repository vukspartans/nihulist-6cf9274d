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
import { Shield, Ban } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/auditLog";
import { adminTranslations } from "@/constants/adminTranslations";

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  role: string;
  created_at: string;
}

interface UserWithRoles extends Profile {
  roles: string[];
}

type AppRole = 'admin' | 'entrepreneur' | 'advisor' | 'supplier';

const UsersManagement = () => {
  const [search, setSearch] = useState("");
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);

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

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          return {
            ...profile,
            roles: rolesData?.map(r => r.role) || [],
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
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleManageRoles(item)}
        >
          <Shield className="w-4 h-4 ml-1" />
          {adminTranslations.users.manageRoles}
        </Button>
      ),
    },
  ];

  const roleOptions: AppRole[] = ['admin', 'entrepreneur', 'advisor', 'supplier'];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{adminTranslations.users.title}</h1>
          <p className="text-muted-foreground mt-1">
            {adminTranslations.users.description}
          </p>
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
      </div>
    </AdminLayout>
  );
};

export default UsersManagement;
