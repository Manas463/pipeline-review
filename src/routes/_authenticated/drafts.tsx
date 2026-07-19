import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow, SectionTitle, Divider } from "@/lib/ui";
import { EmailCard, normalizeStatus, type Contact, type Email } from "@/components/EmailCard";

export const Route = createFileRoute("/_authenticated/drafts")({
  component: DraftsPage,
});

type Account = {
  id: string;
  run_id: string;
  company: string;
  icp_score: number | null;
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

async function fetchAllDrafts(): Promise<{
  emails: Email[];
  contacts: Record<string, Contact>;
  accounts: Record<string, Account>;
}> {
  // Span ALL runs (not just the latest) so every drafted email is reachable.
  const { data: accounts, error: accountsErr } = await supabase
    .from("accounts")
    .select("id, run_id, company, icp_score")
    .limit(10000);
  if (accountsErr) throw accountsErr;

  const accountList = (accounts as Account[]) ?? [];
  const accountIds = accountList.map((a) => a.id);
  if (accountIds.length === 0) return { emails: [], contacts: {}, accounts: {} };

  const { data: contacts, error: contactsErr } = await supabase
    .from("contacts")
    .select("*")
    .in("account_id", accountIds)
    .limit(10000);
  if (contactsErr) throw contactsErr;

  const contactList = (contacts as Contact[]) ?? [];
  const contactIds = contactList.map((c) => c.id);
  if (contactIds.length === 0) return { emails: [], contacts: {}, accounts: {} };

  const { data: emails, error: emailsErr } = await supabase
    .from("emails")
    .select("*")
    .in("contact_id", contactIds)
    .order("created_at", { ascending: false })
    .limit(10000);
  if (emailsErr) throw emailsErr;

  const contactsById = Object.fromEntries(contactList.map((c) => [c.id, c]));
  const accountsById = Object.fromEntries(accountList.map((a) => [a.id, a]));

  // Dedupe: one draft per (company + contact identity). Emails are newest-first,
  // so re-runs that regenerate the same person's email collapse to the latest one.
  const seen = new Set<string>();
  const deduped: Email[] = [];
  for (const e of (emails as Email[]) ?? []) {
    const contact = contactsById[e.contact_id];
    const account = contact ? accountsById[contact.account_id as string] : undefined;
    const key = `${norm(account?.company)}::${norm(contact?.name)}|${norm(contact?.email)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
  }

  return { emails: deduped, contacts: contactsById, accounts: accountsById };
}

function DraftsPage() {
  const [sort, setSort] = useState<"newest" | "oldest" | "verified">("newest");
  const { data, isLoading, error } = useQuery({
    queryKey: ["drafts"],
    queryFn: fetchAllDrafts,
  });

  const sortedEmails = useMemo(() => {
    if (!data) return [];
    const arr = [...data.emails]; // fetched newest-first
    if (sort === "oldest") return arr.reverse();
    if (sort === "verified") {
      const isVerified = (e: Email) => {
        const c = data.contacts[e.contact_id];
        return c ? normalizeStatus(c).label === "Verified" : false;
      };
      // stable sort: verified drafts first, newest-first order preserved within each group
      return arr.sort((a, b) => Number(isVerified(b)) - Number(isVerified(a)));
    }
    return arr;
  }, [data, sort]);

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-3 text-muted-foreground hover:text-primary mb-6"
      >
        <span aria-hidden className="text-3xl leading-none">←</span>
        <span className="label">Home</span>
      </Link>
      <Eyebrow>03 / Drafts</Eyebrow>
      <SectionTitle>All drafted emails</SectionTitle>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
      {error && <p className="mt-8 text-red-400">{(error as Error).message}</p>}

      {data && data.emails.length === 0 && !isLoading && (
        <p className="mt-8 text-muted-foreground">No drafts yet.</p>
      )}

      {data && data.emails.length > 0 && (
        <div className="mt-8">
          <p className="label text-muted-foreground mb-4">
            {data.emails.length} draft{data.emails.length === 1 ? "" : "s"} across all runs
          </p>
          <div className="mb-8 flex items-center gap-3 flex-wrap">
            <span className="label text-muted-foreground">Sort</span>
            {(["newest", "oldest", "verified"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`label px-3 py-2 border capitalize ${
                  sort === s
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "verified" ? "Verified first" : `${s} first`}
              </button>
            ))}
          </div>
          <div className="space-y-8">
            {sortedEmails.map((email) => {
              const contact = data.contacts[email.contact_id];
              const account = contact ? data.accounts[contact.account_id as string] : undefined;
              return (
                <div key={email.id}>
                  <EmailCard
                    email={email}
                    contact={contact}
                    accountName={
                      account ? (
                        <Link
                          to="/accounts/$id"
                          params={{ id: account.id }}
                          className="hover:text-primary hover:underline decoration-dotted underline-offset-4"
                        >
                          {account.company} · ICP {account.icp_score ?? "—"}
                        </Link>
                      ) : undefined
                    }
                    invalidateKeys={["drafts", "account"]}
                  />
                  {account && (
                    <div className="mt-4">
                      <Link
                        to="/accounts/$id"
                        params={{ id: account.id }}
                        hash="dossier"
                        className="label border border-border px-3 py-2 hover:border-primary hover:text-primary"
                      >
                        Open dossier →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Divider />

      <Link
        to="/accounts"
        className="label border border-border px-5 py-2 hover:border-primary hover:text-primary"
      >
        ← Back to accounts
      </Link>
    </div>
  );
}
