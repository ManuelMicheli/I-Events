import { daysBetween, groupTasks, TASK_BUCKETS, todayInItaly, type TaskBucket } from "@i-events/core";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Card } from "@/components/card";
import { Count } from "@/components/request-cards";
import { Divider } from "@/components/rows";
import { Screen, Section } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { TaskRow } from "@/components/todo-row";
import { shortDate } from "@/lib/format";
import { setTaskDone } from "@/lib/requests";
import { useActiveOrg, useSession } from "@/lib/session";
import { fetchTasks, type AgencyTask } from "@/lib/tasks";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

const BUCKET_LABEL: Record<TaskBucket, string> = {
  overdue: "In ritardo",
  today: "Oggi",
  week: "Prossimi 7 giorni",
  later: "Più avanti",
  undated: "Senza scadenza",
  done: "Fatte",
};

function dueLabel(t: AgencyTask, today: string) {
  if (t.done_at) return "FATTA";
  if (!t.due_date) return "";
  const d = daysBetween(today, t.due_date);
  if (d === 0) return "OGGI";
  if (d === 1) return "DOMANI";
  if (d === -1) return "IERI";
  return shortDate(t.due_date).toUpperCase();
}

/** Everything someone has to do across the agency's events, grouped by when it is due. */
export default function TasksScreen() {
  const org = useActiveOrg();
  const { session } = useSession();
  const [who, setWho] = useState<"mine" | "team">("mine");
  const assignee = who === "mine" ? (session?.user.id ?? null) : null;
  const tasks = useQuery(`tasks:${org.id}:${who}`, () => fetchTasks(org.id, assignee));
  const today = todayInItaly();
  const groups = groupTasks(tasks.data ?? [], today);

  return (
    <Screen
      header={
        <Segmented
          value={who}
          onChange={setWho}
          accessibilityLabel="Di chi"
          options={[
            { value: "mine", label: "Le mie" },
            { value: "team", label: "Tutto il team" },
          ]}
        />
      }
      refreshing={tasks.refreshing}
      onRefresh={tasks.refresh}
    >
      {tasks.loading ? (
        <CardSkeletons count={2} />
      ) : tasks.error && !tasks.data ? (
        <ErrorState error={tasks.error} onRetry={tasks.refresh} />
      ) : (tasks.data ?? []).length === 0 ? (
        <EmptyState
          icon="checkbox-outline"
          title={who === "mine" ? "Nessuna attività per te" : "Nessuna attività aperta"}
          body={
            who === "mine"
              ? "Quando un collega ti assegna qualcosa, lo trovi qui e nelle notifiche."
              : "Le attività si aggiungono dalla pagina di ogni evento, anche dalla checklist suggerita."
          }
        />
      ) : (
        TASK_BUCKETS.filter((b) => groups[b].length > 0).map((b) => (
          <Section key={b} title={BUCKET_LABEL[b]} aside={<Count n={groups[b].length} />}>
            <Card style={styles.list}>
              {groups[b].map((t, i) => (
                <View key={`${t.id}:${t.done_at ? 1 : 0}`}>
                  {i > 0 && <Divider />}
                  <TaskRow
                    title={t.title}
                    detail={[t.event.title, who === "team" ? t.assignee : null].filter(Boolean).join(" · ")}
                    due={dueLabel(t, today)}
                    late={b === "overdue"}
                    initialDone={t.done_at !== null}
                    onToggle={(done) => setTaskDone(t.id, done)}
                  />
                </View>
              ))}
            </Card>
          </Section>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: space[1], gap: 0 },
});
