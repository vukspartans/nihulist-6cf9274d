import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { adminTranslations } from "@/constants/adminTranslations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, MessageSquareHeart, ExternalLink, Trash2, Phone } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const RATING_DISPLAY = [
  { value: 1, emoji: "🤢", label: "גרוע מאוד", color: "bg-destructive/10 text-destructive" },
  { value: 2, emoji: "😕", label: "לא טוב", color: "bg-orange-100 text-orange-700" },
  { value: 3, emoji: "😐", label: "בסדר", color: "bg-yellow-100 text-yellow-700" },
  { value: 4, emoji: "🙂", label: "טוב", color: "bg-emerald-100 text-emerald-700" },
  { value: 5, emoji: "🤩", label: "מצוין", color: "bg-primary/10 text-primary" },
];

interface Feedback {
  id: string;
  rating: number;
  message: string | null;
  email: string | null;
  phone: string | null;
  page_url: string | null;
  created_at: string;
  status: string | null;
}

export default function FeedbackManagement() {
  const t = adminTranslations.feedback;
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: feedbackList, isLoading } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Feedback[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("user_feedback")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      toast({ title: t.statusUpdated });
    },
    onError: () => {
      toast({ title: t.updateError, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_feedback")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      toast({ title: t.deleted });
    },
    onError: () => {
      toast({ title: t.deleteError, variant: "destructive" });
    },
  });

  const filteredFeedback = feedbackList?.filter((fb) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      fb.message?.toLowerCase().includes(search) ||
      fb.email?.toLowerCase().includes(search) ||
      fb.phone?.toLowerCase().includes(search) ||
      fb.page_url?.toLowerCase().includes(search)
    );
  });

  const getRatingDisplay = (rating: number) => {
    return RATING_DISPLAY.find((r) => r.value === rating) || RATING_DISPLAY[2];
  };

  const handleExport = () => {
    if (!feedbackList?.length) {
      toast({ title: "אין נתונים לייצוא", variant: "destructive" });
      return;
    }

    const csvContent = [
      ["תאריך", "דירוג", "הודעה", "אימייל", "טלפון", "סטטוס", "עמוד"].join(","),
      ...feedbackList.map((fb) =>
        [
          format(new Date(fb.created_at), "dd/MM/yyyy HH:mm"),
          fb.rating,
          `"${(fb.message || "").replace(/"/g, '""')}"`,
          fb.email || "",
          fb.phone || "",
          fb.status || "pending",
          fb.page_url || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `feedback_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "הקובץ יורד בהצלחה" });
  };

  const getPathFromUrl = (url: string | null) => {
    if (!url) return "-";
    try {
      return new URL(url).pathname || "/";
    } catch {
      return url;
    }
  };

  const totalFeedback = feedbackList?.length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquareHeart className="w-6 h-6 text-primary" />
              {t.title}
            </h1>
            <p className="text-muted-foreground mt-1">{t.description}</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            {t.exportButton}
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Stats Cards with Percentages */}
        {feedbackList && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {RATING_DISPLAY.map((rd) => {
              const count = feedbackList.filter((fb) => fb.rating === rd.value).length;
              const percentage = totalFeedback > 0 
                ? Math.round((count / totalFeedback) * 100) 
                : 0;
              return (
                <Card key={rd.value} className="text-center">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-2xl mb-1">{rd.emoji}</div>
                    <div className="text-xl font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground mb-0.5">
                      <span className="text-[10px]">{percentage}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{rd.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">כל המשובים</CardTitle>
            <CardDescription>
              {filteredFeedback?.length || 0} משובים נמצאו
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredFeedback?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquareHeart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t.noFeedback}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">{t.columns.date}</TableHead>
                      <TableHead className="w-[100px]">{t.columns.rating}</TableHead>
                      <TableHead>{t.columns.message}</TableHead>
                      <TableHead className="w-[150px]">{t.columns.email}</TableHead>
                      <TableHead className="w-[120px]">{t.columns.phone}</TableHead>
                      <TableHead className="w-[110px]">{t.columns.status}</TableHead>
                      <TableHead className="w-[120px]">{t.columns.page}</TableHead>
                      <TableHead className="w-[60px]">{t.columns.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeedback?.map((fb) => {
                      const rd = getRatingDisplay(fb.rating);
                      return (
                        <TableRow key={fb.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(fb.created_at), "dd/MM/yyyy", { locale: he })}
                            <br />
                            <span className="text-xs">
                              {format(new Date(fb.created_at), "HH:mm")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={rd.color}>
                              <span className="ml-1">{rd.emoji}</span>
                              {rd.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            {fb.message ? (
                              <p className="text-sm line-clamp-2">{fb.message}</p>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {fb.email ? (
                              <a
                                href={`mailto:${fb.email}`}
                                className="text-sm text-primary hover:underline truncate block max-w-[140px]"
                                title={fb.email}
                              >
                                {fb.email}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {fb.phone ? (
                              <a
                                href={`tel:${fb.phone}`}
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" />
                                {fb.phone}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={fb.status || "pending"}
                              onValueChange={(value) => 
                                updateStatusMutation.mutate({ id: fb.id, status: value })
                              }
                            >
                              <SelectTrigger className="w-[100px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">{t.status.pending}</SelectItem>
                                <SelectItem value="handled">{t.status.handled}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <span
                              className="text-xs text-muted-foreground flex items-center gap-1 max-w-[110px] truncate"
                              title={fb.page_url || ""}
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              {getPathFromUrl(fb.page_url)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t.deleteConfirmDesc}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{adminTranslations.common.cancel}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(fb.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {adminTranslations.common.delete}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
