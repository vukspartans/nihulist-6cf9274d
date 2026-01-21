import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, CheckCircle, Link } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLinkTaskToMilestone, useUnlinkTaskFromMilestone } from "@/hooks/useMilestoneTemplates";
import type { MilestoneTemplateTask } from "@/types/milestoneTemplate";
import { adminTranslations } from "@/constants/adminTranslations";

interface MilestoneTaskLinkerProps {
  milestoneTemplateId: string;
  linkedTasks: MilestoneTemplateTask[];
}

export function MilestoneTaskLinker({
  milestoneTemplateId,
  linkedTasks,
}: MilestoneTaskLinkerProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const t = adminTranslations.payments.milestones;

  const linkTask = useLinkTaskToMilestone();
  const unlinkTask = useUnlinkTaskFromMilestone();

  // Fetch available task templates
  const { data: taskTemplates = [] } = useQuery({
    queryKey: ["task-templates-for-linking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_templates")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Filter out already linked tasks
  const availableTasks = taskTemplates.filter(
    (task) => !linkedTasks.some((lt) => lt.task_template_id === task.id)
  );

  const handleAddTask = () => {
    if (!selectedTaskId) return;

    linkTask.mutate({
      milestone_template_id: milestoneTemplateId,
      task_template_id: selectedTaskId,
      display_order: linkedTasks.length,
    });
    setSelectedTaskId("");
  };

  const handleRemoveTask = (task: MilestoneTemplateTask) => {
    unlinkTask.mutate({
      id: task.id,
      milestone_template_id: milestoneTemplateId,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t.dialog.linkedTasksLabel}</span>
      </div>

      <p className="text-xs text-muted-foreground">
        {t.dialog.linkedTasksHint}
      </p>

      {linkedTasks.length > 0 ? (
        <div className="space-y-2">
          {linkedTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  {task.task_templates?.name || "משימה לא ידועה"}
                </span>
                {task.is_critical && (
                  <Badge variant="secondary" className="text-xs">
                    קריטי
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveTask(task)}
                disabled={unlinkTask.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md">
          {t.dialog.noTasks}
        </div>
      )}

      <div className="flex gap-2">
        <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="בחר משימה להוספה..." />
          </SelectTrigger>
          <SelectContent>
            {availableTasks.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                אין משימות זמינות להוספה
              </div>
            ) : (
              availableTasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={handleAddTask}
          disabled={!selectedTaskId || linkTask.isPending}
        >
          <Plus className="h-4 w-4 ml-1" />
          {t.dialog.addTask}
        </Button>
      </div>
    </div>
  );
}
