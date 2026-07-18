import { createFileRoute, Link } from "@tanstack/react-router";
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
};

async function fetchLatestDoneAccounts(): Promise<{ accounts: Account[]; runId: string | null }> {
  const { data: run, error: runErr } = await supabase
    .from("runs")
    .select("id")
    .eq("status", "done")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!run) return { accounts: [], runId: null };
  const { data, error } = await supabase
    .from("accounts")
    .select("id, run_id, company, domain, hq_country, icp_score, why_fit_vs_anchor, sources")
    .eq("run_id", run.id)
    .order("icp_score", { ascending: false });
  if (error) throw error;
  return { accounts: (data as Account[]) ?? [], runId: run.id };
}

function AccountsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["accounts-latest"],
    queryFn: fetchLatestDoneAccounts,
  });

  return (
    <div>
      <Eyebrow>02 / Accounts</Eyebrow>
      <SectionTitle>Sourced this run</SectionTitle>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
      {error && <p className="mt-8 text-red-400">{(error as Error).message}</p>}

      {data && data.accounts.length === 0 && (
        <p className="mt-8 text-muted-foreground">No completed run yet.</p>
      )}

      {data && data.accounts.length > 0 && (
        <ul className="mt-8 divide-y divide-dotted divide-border">
          {data.accounts.map((a) => (
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