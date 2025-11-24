"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import sampleUniverse from "@/data/sampleUniverse.json";
import {
  emptyUniverse,
  sanitizeUniverse,
  type UniverseMatches,
  type UniverseModel
} from "@/lib/universe";

type QueryResult = {
  answer: string;
  matches: UniverseMatches;
};

const defaultUniverse = sanitizeUniverse(sampleUniverse);

export default function UniverseExplorer() {
  const [universe, setUniverse] = useState<UniverseModel>(
    structuredClone(defaultUniverse)
  );
  const [question, setQuestion] = useState("");
  const [rawUniverse, setRawUniverse] = useState(() =>
    JSON.stringify(defaultUniverse, null, 2)
  );
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setResult(null);
  }, [question, universe]);

  const metadata = useMemo(
    () => universe.metadata ?? emptyUniverse.metadata,
    [universe.metadata]
  );

  const handleFile = async (file: File) => {
    try {
      const content = await file.text();
      ingestUniverse(content);
    } catch (err) {
      setError("Lecture du fichier impossible.");
    }
  };

  const ingestUniverse = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      const sanitized = sanitizeUniverse(parsed);
      setUniverse(sanitized);
      setRawUniverse(JSON.stringify(sanitized, null, 2));
      setError(null);
    } catch (err) {
      setError("Format JSON invalide.");
    }
  };

  const askQuestion = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          universe
        })
      });
      if (!response.ok) {
        throw new Error("API error");
      }
      const payload = (await response.json()) as QueryResult;
      setResult(payload);
    } catch (err) {
      setError("La question n'a pas pu être analysée.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6">
          <h1 className="text-2xl font-semibold">
            Assistant Business Objects Universe
          </h1>
          <p className="text-sm text-slate-300">
            Importez un univers exporté en JSON et posez vos questions sur les
            classes, objets, tables et jointures.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Univers chargé</h2>
              <button
                onClick={() => {
                  const sanitized = sanitizeUniverse(sampleUniverse);
                  setUniverse(sanitized);
                  setRawUniverse(JSON.stringify(sanitized, null, 2));
                  setError(null);
                }}
                className="rounded border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/70"
              >
                Recharger l&apos;exemple
              </button>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
              <p className="font-medium">{metadata?.name}</p>
              {metadata?.description && (
                <p className="mt-1 text-xs text-slate-400">
                  {metadata.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-400">
                Charger un fichier JSON
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleFile(file);
                      event.target.value = "";
                    }
                  }}
                />
              </label>
              <button
                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
              >
                Importer
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="font-semibold">Format attendu :</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Exportez votre univers Business Objects vers JSON (via SDK,
                  restitution API ou transformation).
                </li>
                <li>
                  Structure minimale : <code>metadata</code>,{" "}
                  <code>classes</code> (avec objets), <code>tables</code>,{" "}
                  <code>joins</code>.
                </li>
                <li>
                  Vous pouvez éditer le JSON ci-dessous pour ajuster rapidement
                  votre univers.
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold">Question</h2>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Exemple : Quels objets contiennent la marge ou le revenu ?"
              className="h-28 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
            />
            <button
              onClick={() => {
                if (!question.trim()) {
                  setError("Posez une question avant de lancer la recherche.");
                  return;
                }
                void askQuestion();
              }}
              disabled={isLoading}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-900"
            >
              {isLoading ? "Analyse en cours..." : "Analyser"}
            </button>
            {error && (
              <p className="text-xs font-medium text-rose-400">
                {error}
              </p>
            )}
            {result && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
                <p>{result.answer}</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold">Résumé de l&apos;univers</h2>
            <div className="mt-3 grid gap-3 text-sm text-slate-300">
              <p>
                <span className="font-semibold text-slate-100">
                  {universe.classes?.length ?? 0}
                </span>{" "}
                classes
              </p>
              <p>
                <span className="font-semibold text-slate-100">
                  {countObjects(universe)}
                </span>{" "}
                objets
              </p>
              <p>
                <span className="font-semibold text-slate-100">
                  {universe.tables?.length ?? 0}
                </span>{" "}
                tables
              </p>
              <p>
                <span className="font-semibold text-slate-100">
                  {universe.joins?.length ?? 0}
                </span>{" "}
                jointures
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold">JSON exploité</h2>
            <textarea
              value={rawUniverse}
              onChange={(event) => {
                setRawUniverse(event.target.value);
              }}
              onBlur={() => ingestUniverse(rawUniverse)}
              className="mt-3 h-80 w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs font-mono text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </section>

        {result && (
          <section className="grid gap-6 lg:grid-cols-2">
            <MatchList
              title="Objets détectés"
              emptyLabel="Aucun objet pertinent."
              items={result.matches.objects?.map((item) => ({
                title: item.name,
                subtitle: item.type,
                description: item.description,
                extra: item.sql
              })) ?? []}
            />
            <MatchList
              title="Classes et tables"
              emptyLabel="Aucune classe ou table associée."
              items={[
                ...(result.matches.classes?.map((item) => ({
                  title: item.name,
                  subtitle: "Classe",
                  description: item.description
                })) ?? []),
                ...(result.matches.tables?.map((item) => ({
                  title: item.name,
                  subtitle: "Table",
                  description: item.description
                })) ?? [])
              ]}
            />
            <MatchList
              title="Jointures"
              emptyLabel="Aucune jointure correspondante."
              items={result.matches.joins?.map((item) => ({
                title: item.name,
                subtitle: `${item.from} ↔ ${item.to}`,
                description: item.expression
              })) ?? []}
            />
          </section>
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-900">
        <div className="mx-auto w-full max-w-6xl px-6 py-4 text-center text-xs text-slate-500">
          Donnez un fichier JSON dérivé de votre univers Business Objects pour
          explorer rapidement sa structure.
        </div>
      </footer>
    </div>
  );
}

type MatchListProps = {
  title: string;
  emptyLabel: string;
  items: { title: string; subtitle?: string; description?: string; extra?: string }[];
};

function MatchList({ title, emptyLabel, items }: MatchListProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              key={`${item.title}-${item.subtitle ?? ""}`}
              className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
            >
              <p className="text-sm font-semibold text-slate-100">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {item.subtitle}
                </p>
              )}
              {item.description && (
                <p className="mt-2 text-xs text-slate-300">
                  {item.description}
                </p>
              )}
              {item.extra && (
                <code className="mt-2 block overflow-x-auto whitespace-pre text-[11px] text-teal-300">
                  {item.extra}
                </code>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function countObjects(universe: UniverseModel) {
  return universe.classes?.reduce(
    (acc, klass) => acc + (klass.objects?.length ?? 0),
    0
  ) ?? 0;
}
