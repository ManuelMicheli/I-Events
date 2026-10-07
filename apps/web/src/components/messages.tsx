import { createClient } from "@/lib/supabase/server";
import { MessageIcon } from "./icons";
import { Card } from "./ui";
import { MessageForm } from "./message-form";

const timeFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Conversation between the client and one agency about one proposal; agencies also see their internal notes. */
export async function MessageThread({ proposalId, viewerOrgId, isAgency, path, title = "Messaggi" }: { proposalId: string; viewerOrgId: string; isAgency: boolean; path: string; title?: string }) {
  const supabase = await createClient();
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, body, internal, created_at, author_org_id, author:profiles(full_name), org:organizations(name)")
    .eq("proposal_id", proposalId)
    .order("created_at");
  if (error) throw error;

  return (
    <Card title={title} className="msg-host">
      <ol className="mb-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <li className="flex items-center gap-3 text-sm text-muted">
            <MessageIcon />
            Ancora nessun messaggio.
          </li>
        )}
        {messages.map((m) => {
          const mine = m.author_org_id === viewerOrgId;
          return (
            <li key={m.id} className={`max-w-[85%] rounded-card border p-3 text-sm ${mine ? "self-end rounded-br-[4px] border-text bg-text text-bg" : "self-start rounded-bl-[4px] border-border bg-bg"} ${m.internal ? "border-dashed" : ""}`}>
              <p className={`mb-1 text-xs ${mine ? "opacity-80" : "text-muted"}`}>
                {[m.author?.full_name, m.org?.name].filter(Boolean).join(" · ")} · {timeFmt.format(new Date(m.created_at))}
                {m.internal && " · nota interna"}
              </p>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </li>
          );
        })}
      </ol>
      <MessageForm proposalId={proposalId} isAgency={isAgency} path={path} />
    </Card>
  );
}
