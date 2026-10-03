"use client";

import { useMemo, useState } from "react";
import { FEEDBACK_CATEGORIES } from "../lib/feedback-constants";
import { useT } from "../lib/i18n/provider";

type Intent = "general" | "idea" | "issue";

type IntentDef = {
  id: Intent;
  emoji: string;
  title: string;
  subtitle: string;
  placeholder: string;
};

function defaultCategory(intent: Intent): string {
  if (intent === "idea") {
    const hit = FEEDBACK_CATEGORIES.find((c) => /feature/i.test(c));
    if (hit) return hit;
  }
  if (intent === "issue") {
    const hit = FEEDBACK_CATEGORIES.find((c) => /bug/i.test(c));
    if (hit) return hit;
  }
  const other = FEEDBACK_CATEGORIES.find((c) => /other/i.test(c));
  if (other) return other;
  return FEEDBACK_CATEGORIES[0];
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function FeedbackForm() {
  const { t } = useT();
  const INTENTS: IntentDef[] = useMemo(
    () => [
      {
        id: "general",
        emoji: "🙂",
        title: t("feedback.generalTitle"),
        subtitle: t("feedback.generalSub"),
        placeholder: t("feedback.generalPh"),
      },
      {
        id: "idea",
        emoji: "💡",
        title: t("feedback.ideaTitle"),
        subtitle: t("feedback.ideaSub"),
        placeholder: t("feedback.ideaPh"),
      },
      {
        id: "issue",
        emoji: "🐞",
        title: t("feedback.issueTitle"),
        subtitle: t("feedback.issueSub"),
        placeholder: t("feedback.issuePh"),
      },
    ],
    [t],
  );

  const [intent, setIntent] = useState<Intent | null>(null);
  const [category, setCategory] = useState<string>("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseIntent(i: Intent) {
    setIntent(i);
    setCategory(defaultCategory(i));
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;
    setLoading(true);
    setError(null);
    try {
      let attachment: { name: string; data: string } | undefined;
      if (file) {
        attachment = { name: file.name, data: await fileToBase64(file) };
      }
      const res = await fetch("/api/customer-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, body, email, attachment }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Submission failed");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setIntent(null);
    setCategory("");
    setBody("");
    setEmail("");
    setFile(null);
    setDone(false);
    setError(null);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">{t("feedback.done")}</p>
        <button
          type="button"
          onClick={resetAll}
          className="mt-6 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t("feedback.submit")}
        </button>
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-slate-900">{t("feedback.title")}</h2>
        <p className="mt-2 text-sm text-slate-500">{t("feedback.blurb")}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {INTENTS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => chooseIntent(opt.id)}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="text-2xl" aria-hidden="true">
                {opt.emoji}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">{opt.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{opt.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const active = INTENTS.find((x) => x.id === intent)!;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <button
        type="button"
        onClick={() => {
          setIntent(null);
          setError(null);
        }}
        className="text-sm text-slate-500 hover:text-slate-800"
      >
        ← {t("feedback.title")}
      </button>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">
          {active.emoji}
        </span>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{active.title}</h2>
          <p className="text-sm text-slate-500">{active.subtitle}</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("feedback.emailOptional")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          >
            {FEEDBACK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={active.placeholder}
            rows={5}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? t("feedback.submitting") : t("feedback.submit")}
        </button>
      </form>
    </div>
  );
}
