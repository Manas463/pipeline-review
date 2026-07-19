import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow, SectionTitle, SourceLinks } from "@/lib/ui";

export const Route = createFileRoute("/_authenticated/accounts/")({
  component: AccountsList,
});

type Account = {
  id: string;
  run_id: string;
  company: string;
  domain: string | null;
  hq_country: string | null;
  icp_score: number | null;
  why_fit_vs_anchor: string | null;
  sources: unknown;
  created_at: string;
};

async function fetchAllAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, run_id, company, domain, hq_country, icp_score, why_fit_vs_anchor, sources, created_at")
    .order("created_at", { ascending: false })
    .limit(10000);
  if (error) throw error;
  return (data as Account[]) ?? [];
}

function AccountsList() {
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const { data, isLoading, error } = useQuery({
    queryKey: ["accounts-all"],
    queryFn: fetchAllAccounts,
  });
  const accounts = data
    ? [...data].sort((a, b) => {
        const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return order === "newest" ? -t : t;
      })
    : [];

  return (
    <div>
      <Eyebrow>02 / Accounts</Eyebrow>
      <SectionTitle>Sourced across all runs</SectionTitle>

      <div className="mt-6 flex items-center gap-3">
        <span className="label text-muted-foreground">Sort</span>
        <button
          onClick={() => setOrder("newest")}
          className={`label px-3 py-2 border ${order === "newest" ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          Newest first
        </button>
        <button
          onClick={() => setOrder("oldest")}
          className={`label px-3 py-2 border ${order === "oldest" ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          Oldest first
        </button>
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
      {error && <p className="mt-8 text-red-400">{(error as Error).message}</p>}

      {data && accounts.length === 0 && (
        <p className="mt-8 text-muted-foreground">No accounts yet.</p>
      )}

      {accounts.length > 0 && (
        <ul className="mt-8 divide-y divide-dotted divide-border">
          {accounts.map((a) => (
            <li key={a.id} className="py-6 grid grid-cols-[80px_1fr_auto] gap-6 items-start">
              <Link
                to="/accounts/$id"
                params={{ id: a.id }}
                className="label text-3xl text-primary hover:opacity-90"
                style={{ letterSpacing: "0.04em" }}
              >
                {a.icp_score ?? "—"}
              </Link>
              <div>
                <Link
                  to="/accounts/$id"
                  params={{ id: a.id }}
                  className="block hover:opacity-90"
                >
                  <h3 style={{ fontFamily: "var(--font-serif)" }} className="text-2xl">
                    {a.company}
                  </h3>
                  <p className="label text-muted-foreground mt-1">
                    {a.domain ?? "—"} · {a.hq_country ?? "—"}
                  </p>
                  {a.why_fit_vs_anchor && (
                    <p className="mt-3 text-foreground/90 max-w-2xl">{a.why_fit_vs_anchor}</p>
                  )}
                </Link>
                <div className="mt-3">
                  <SourceLinks urls={a.sources} />
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Link
                    to="/accounts/$id"
                    params={{ id: a.id }}
                    className="label border border-border px-3 py-2 hover:border-primary hover:text-primary"
                  >
                    Open dossier →
                  </Link>
                  <Link
                    to="/accounts/$id"
                    params={{ id: a.id }}
                    hash="emails"
                    className="label bg-primary text-primary-foreground px-3 py-2 hover:opacity-90"
                  >
                    Open drafts →
                  </Link>
                </div>
              </div>
              <Link
                to="/accounts/$id"
                params={{ id: a.id }}
                className="label text-muted-foreground self-center hover:text-primary"
              >
                Open →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}