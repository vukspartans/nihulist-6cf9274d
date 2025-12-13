import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Search, Download, MessageSquareHeart, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

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
  page_url: string | null;
  created_at: string;
}

export default function FeedbackManagement() {
  const t = adminTranslations.feedback;
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredFeedback = feedbackList?.filter((fb) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      fb.message?.toLowerCase().includes(search) ||
      fb.email?.toLowerCase().includes(search) ||
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
      ["תאריך", "דירוג", "הודעה", "אימייל", "עמוד"].join(","),
      ...feedbackList.map((fb) =>
        [
          format(new Date(fb.created_at), "dd/MM/yyyy HH:mm"),
          fb.rating,
          `"${(fb.message || "").replace(/"/g, '""')}"`,
          fb.email || "",
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

        {/* Stats Cards */}
        {feedbackList && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {RATING_DISPLAY.map((rd) => {
              const count = feedbackList.filter((fb) => fb.rating === rd.value).length;
              return (
                <Card key={rd.value} className="text-center">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-2xl mb-1">{rd.emoji}</div>
                    <div className="text-xl font-bold">{count}</div>
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
                      <TableHead className="w-[140px]">{t.columns.date}</TableHead>
                      <TableHead className="w-[120px]">{t.columns.rating}</TableHead>
                      <TableHead>{t.columns.message}</TableHead>
                      <TableHead className="w-[180px]">{t.columns.email}</TableHead>
                      <TableHead className="w-[150px]">{t.columns.page}</TableHead>
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
                          <TableCell className="max-w-[300px]">
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
                                className="text-sm text-primary hover:underline"
                              >
                                {fb.email}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className="text-xs text-muted-foreground flex items-center gap-1 max-w-[140px] truncate"
                              title={fb.page_url || ""}
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              {getPathFromUrl(fb.page_url)}
                            </span>
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
