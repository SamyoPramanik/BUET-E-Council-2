"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR, { SWRConfig } from "swr";
import Link from "next/link";
import { Search as SearchIcon, Calendar, FileText, Sparkles, Tag as TagIcon, Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import Header from "../../components/Header";
import TagMultiSelect from "../../components/TagMultiSelect";
import { fetcher } from "../../lib/api";
import { sanitizeHtml } from "../../lib/sanitize";
import { localStorageProvider } from "../../lib/swrLocalStorageProvider";

const MATCH_TYPE_STYLES: Record<string, string> = {
  keyword: "bg-primary/10 text-primary",
  entity: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  semantic: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "hybrid (all)": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "hybrid (keyword + entity)": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "hybrid (semantic + entity)": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "hybrid (keyword + semantic)": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

const MATCH_TYPE_LABELS: Record<string, string> = {
  keyword: "Keyword match",
  entity: "Related entity",
  semantic: "Semantic match",
  tag: "Tag match",
  "hybrid (all)": "Strong match",
  "hybrid (keyword + entity)": "Keyword + entity",
  "hybrid (semantic + entity)": "Semantic + entity",
  "hybrid (keyword + semantic)": "Keyword + semantic",
};

function formatMeetingTitle(result: any) {
  if (result.meeting_title) return result.meeting_title;
  const typeLabel = result.type === "academic" ? "Academic" : "Syndicate";
  return `${result.title} ${typeLabel} Meeting`;
}

function ResultCard({ result }: { result: any }) {
  return (
    <Link
      href={`/meetings/${result.meeting_id}?highlight=${result.agenda_id}&type=${result.matched_in}`}
      className="block bg-card border border-border rounded-lg p-5 hover:shadow-md hover:border-primary/40 transition-all"
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <h3 className="font-semibold text-foreground">{formatMeetingTitle(result)}</h3>
        <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${MATCH_TYPE_STYLES[result.match_type] || "bg-muted text-muted-foreground"}`}>
          {MATCH_TYPE_LABELS[result.match_type] || result.match_type}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {result.meeting_date ? new Date(result.meeting_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date not set'}
        </span>
        <span className="bg-muted px-2 py-0.5 rounded-full capitalize">
          {result.matched_in === 'resolution' ? 'Resolution' : 'Agenda'}
        </span>
      </div>
      <div
        className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&_mark]:bg-primary/20 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-0.5"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(result.snippet) }}
      />
    </Link>
  );
}

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [scope, setScope] = useState<"agenda" | "both">(searchParams.get("scope") === "agenda" ? "agenda" : "both");
  const [typeInput, setTypeInput] = useState<"all" | "academic" | "syndicate">(
    (searchParams.get("type") as "academic" | "syndicate") || "all"
  );
  const [tagIdsInput, setTagIdsInput] = useState<string[]>((searchParams.get("tags") || "").split(",").filter(Boolean));
  const [dateFromInput, setDateFromInput] = useState(searchParams.get("dateFrom") || "");
  const [dateToInput, setDateToInput] = useState(searchParams.get("dateTo") || "");
  const [serialFromInput, setSerialFromInput] = useState(searchParams.get("serialFrom") || "");
  const [serialToInput, setSerialToInput] = useState(searchParams.get("serialTo") || "");
  const [showFilters, setShowFilters] = useState(false);

  const { data: tagsResponse } = useSWR('/tags', fetcher, { fallbackData: { data: [] } });
  const allTags = tagsResponse?.data || [];

  const tagMap = useMemo(() => {
    const map = new Map<string, string>();
    allTags.forEach((t: any) => map.set(t.id, t.name));
    return map;
  }, [allTags]);

  const activeQuery = searchParams.get("q") || "";
  const activeTagIds = useMemo(() => (searchParams.get("tags") || "").split(",").filter(Boolean), [searchParams]);
  const activeDateFrom = searchParams.get("dateFrom") || "";
  const activeDateTo = searchParams.get("dateTo") || "";
  const activeSerialFrom = searchParams.get("serialFrom") || "";
  const activeSerialTo = searchParams.get("serialTo") || "";
  const activeType = searchParams.get("type") || "all";
  const hasSearchCriteria = !!activeQuery.trim() || activeTagIds.length > 0 || !!activeSerialFrom || !!activeSerialTo || activeType !== "all";

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeInput !== "all") count++;
    if (tagIdsInput.length > 0) count += tagIdsInput.length;
    if (dateFromInput) count++;
    if (dateToInput) count++;
    if (serialFromInput) count++;
    if (serialToInput) count++;
    return count;
  }, [typeInput, tagIdsInput, dateFromInput, dateToInput, serialFromInput, serialToInput]);

  // Sync inputs with URL on searchParams change (e.g. back/forward navigation)
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setScope(searchParams.get("scope") === "agenda" ? "agenda" : "both");
    setTypeInput((searchParams.get("type") as "academic" | "syndicate") || "all");
    setTagIdsInput((searchParams.get("tags") || "").split(",").filter(Boolean));
    setDateFromInput(searchParams.get("dateFrom") || "");
    setDateToInput(searchParams.get("dateTo") || "");
    setSerialFromInput(searchParams.get("serialFrom") || "");
    setSerialToInput(searchParams.get("serialTo") || "");
  }, [searchParams]);

  // Scope toggles apply immediately. Other inputs wait for form submit (Enter).
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (scope !== "both") params.set("scope", scope);
    else params.delete("scope");
    router.replace(`/search?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const searchKey = useMemo(() => {
    if (!activeQuery.trim() && activeTagIds.length === 0 && !activeSerialFrom && !activeSerialTo && activeType === "all") return null;
    const params = new URLSearchParams();
    if (activeQuery.trim()) params.set("q", activeQuery.trim());
    params.set("scope", scope);
    if (activeType !== "all") params.set("type", activeType);
    if (activeTagIds.length > 0) params.set("tags", activeTagIds.join(","));
    if (activeDateFrom) params.set("dateFrom", activeDateFrom);
    if (activeDateTo) params.set("dateTo", activeDateTo);
    if (activeSerialFrom) params.set("serialFrom", activeSerialFrom);
    if (activeSerialTo) params.set("serialTo", activeSerialTo);
    return `/search?${params.toString()}`;
  }, [activeQuery, scope, activeType, activeTagIds, activeDateFrom, activeDateTo, activeSerialFrom, activeSerialTo]);

  const { data, isLoading } = useSWR(searchKey, fetcher);
  const results = data?.data || [];

  const triggerSearch = (overrides?: {
    type?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    serialFrom?: string;
    serialTo?: string;
  }) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (scope !== "both") params.set("scope", scope);

    const typeVal = overrides?.type !== undefined ? overrides.type : typeInput;
    if (typeVal && typeVal !== "all") params.set("type", typeVal);

    const tagsVal = overrides?.tags !== undefined ? overrides.tags : tagIdsInput;
    if (tagsVal && tagsVal.length > 0) params.set("tags", tagsVal.join(","));

    const dateFromVal = overrides?.dateFrom !== undefined ? overrides.dateFrom : dateFromInput;
    if (dateFromVal) params.set("dateFrom", dateFromVal);

    const dateToVal = overrides?.dateTo !== undefined ? overrides.dateTo : dateToInput;
    if (dateToVal) params.set("dateTo", dateToVal);

    const serialFromVal = overrides?.serialFrom !== undefined ? overrides.serialFrom : serialFromInput;
    if (serialFromVal.trim()) params.set("serialFrom", serialFromVal.trim());

    const serialToVal = overrides?.serialTo !== undefined ? overrides.serialTo : serialToInput;
    if (serialToVal.trim()) params.set("serialTo", serialToVal.trim());

    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  const clearAllFilters = () => {
    setTypeInput("all");
    setTagIdsInput([]);
    setDateFromInput("");
    setDateToInput("");
    setSerialFromInput("");
    setSerialToInput("");

    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (scope !== "both") params.set("scope", scope);
    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      triggerSearch();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header hideSearch />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            triggerSearch();
          }}
        >
          {/* Main Search Input */}
          <div className="relative mb-3">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search agendas & resolutions (English or Bangla)..."
              className="w-full pl-10 pr-4 py-2.5 text-base bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground shadow-sm"
            />
          </div>

          {/* Compact Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-card/60 border border-border rounded-lg px-3 py-1.5 mb-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors border ${
                  showFilters || activeFilterCount > 0
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-input/20 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {activeFilterCount}
                  </span>
                )}
                {showFilters ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </button>

              {/* Search Scope Buttons */}
              <div className="flex rounded-md border border-input overflow-hidden">
                <button
                  type="button"
                  onClick={() => setScope("agenda")}
                  className={`px-2.5 py-1 flex items-center gap-1 transition-colors ${
                    scope === "agenda" ? "bg-primary/10 text-primary font-medium" : "bg-input/20 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <FileText className="w-3 h-3" /> Agenda only
                </button>
                <button
                  type="button"
                  onClick={() => setScope("both")}
                  className={`px-2.5 py-1 flex items-center gap-1 transition-colors border-l border-input ${
                    scope === "both" ? "bg-primary/10 text-primary font-medium" : "bg-input/20 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Sparkles className="w-3 h-3" /> Agenda + Resolution
                </button>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors px-1 font-medium"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>

          {/* Active Filter Removable Badges (When Collapsed) */}
          {!showFilters && activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs">
              <span className="text-muted-foreground text-[11px] font-medium mr-0.5">Active filters:</span>
              {typeInput !== "all" && (
                <span className="inline-flex items-center gap-1 bg-muted border border-border px-2 py-0.5 rounded-full capitalize text-foreground">
                  Type: {typeInput}
                  <button
                    type="button"
                    onClick={() => {
                      setTypeInput("all");
                      triggerSearch({ type: "all" });
                    }}
                    className="hover:text-destructive transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {tagIdsInput.map((tagId) => (
                <span key={tagId} className="inline-flex items-center gap-1 bg-muted border border-border px-2 py-0.5 rounded-full text-foreground">
                  <TagIcon className="w-3 h-3 text-muted-foreground" />
                  {tagMap.get(tagId) || "Tag"}
                  <button
                    type="button"
                    onClick={() => {
                      const next = tagIdsInput.filter((id) => id !== tagId);
                      setTagIdsInput(next);
                      triggerSearch({ tags: next });
                    }}
                    className="hover:text-destructive transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {(dateFromInput || dateToInput) && (
                <span className="inline-flex items-center gap-1 bg-muted border border-border px-2 py-0.5 rounded-full text-foreground">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  Date: {dateFromInput || "Any"} to {dateToInput || "Any"}
                  <button
                    type="button"
                    onClick={() => {
                      setDateFromInput("");
                      setDateToInput("");
                      triggerSearch({ dateFrom: "", dateTo: "" });
                    }}
                    className="hover:text-destructive transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {(serialFromInput || serialToInput) && (
                <span className="inline-flex items-center gap-1 bg-muted border border-border px-2 py-0.5 rounded-full text-foreground">
                  Meeting Serial: {serialFromInput || "0"} - {serialToInput || "∞"}
                  <button
                    type="button"
                    onClick={() => {
                      setSerialFromInput("");
                      setSerialToInput("");
                      triggerSearch({ serialFrom: "", serialTo: "" });
                    }}
                    className="hover:text-destructive transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="bg-card border border-border rounded-lg p-3.5 mb-4 gap-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 items-end shadow-sm">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <TagIcon className="w-3 h-3" /> Tags
                </label>
                <TagMultiSelect
                  options={allTags}
                  value={tagIdsInput}
                  onChange={setTagIdsInput}
                  placeholder="Any tag"
                  onKeyDown={handleKeyDown}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Meeting Type</label>
                <select
                  value={typeInput}
                  onChange={(e) => setTypeInput(e.target.value as "all" | "academic" | "syndicate")}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2.5 py-1.5 text-xs bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="academic">Academic</option>
                  <option value="syndicate">Syndicate</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">From Date</label>
                <input
                  type="date"
                  value={dateFromInput}
                  onChange={(e) => setDateFromInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2.5 py-1.5 text-xs bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">To Date</label>
                <input
                  type="date"
                  value={dateToInput}
                  onChange={(e) => setDateToInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2.5 py-1.5 text-xs bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Meeting Serial From</label>
                <input
                  type="number"
                  min="0"
                  value={serialFromInput}
                  onChange={(e) => setSerialFromInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. 50"
                  className="w-full px-2.5 py-1.5 text-xs bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Meeting Serial To</label>
                <input
                  type="number"
                  min="0"
                  value={serialToInput}
                  onChange={(e) => setSerialToInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. 100"
                  className="w-full px-2.5 py-1.5 text-xs bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 sm:col-span-2 md:col-span-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerSearch();
                    setShowFilters(false);
                  }}
                  className="w-full py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </form>

        {!hasSearchCriteria ? (
          <div className="text-center text-muted-foreground py-16">
            Type a search term or select one or more filters above to find agendas, resolutions, departments, offices, or members.
          </div>
        ) : isLoading && !data ? (
          <div className="text-center text-muted-foreground py-16">Searching...</div>
        ) : results.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            No results found matching your criteria.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">
              Found {results.length} result{results.length === 1 ? '' : 's'}
            </div>
            {results.map((r: any) => (
              <ResultCard key={`${r.matched_in}-${r.agenda_id}`} result={r} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <SWRConfig value={{ provider: localStorageProvider }}>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading search...</div>}>
        <SearchPageInner />
      </Suspense>
    </SWRConfig>
  );
}
