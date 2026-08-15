import React, { useState, useMemo } from "react";
import { Check, X, AlertTriangle, ChevronRight, Beaker } from "lucide-react";

// ---------- helpers ----------
const parseNums = (s) =>
  (s || "")
    .split(/[,\n]/)
    .map((x) => parseFloat(x.trim()))
    .filter((x) => !isNaN(x) && x >= 0);

const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const stdev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
};
const fmt = (n, d = 0) =>
  n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (n, d = 1) => `${(n * 100).toFixed(d)}%`;

const INK = "#2B2A28";
const PAPER = "#FAF7F2";
const SAGE = "#6E7D5E";
const SAGE_DK = "#4E5A42";
const CLAY = "#BC7A5E";
const LINE = "#E4DFD3";

function Verdict({ level, children }) {
  const colors = {
    good: { bg: "#EEF1E7", fg: SAGE_DK, icon: <Check size={14} /> },
    mid: { bg: "#FBF1E4", fg: "#95642F", icon: <AlertTriangle size={14} /> },
    bad: { bg: "#F7E9E4", fg: "#A24A2E", icon: <X size={14} /> },
  };
  const c = colors[level];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide"
      style={{ background: c.bg, color: c.fg }}
    >
      {c.icon}
      {children}
    </span>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block mb-4">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[13px] font-medium" style={{ color: INK }}>
          {label}
        </span>
        {hint && (
          <span className="text-[11px]" style={{ color: "#9A9284" }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md px-3 py-2 text-[13px] outline-none focus:ring-2 transition-shadow bg-white";

// ---------- Tab 1: Creator vetting ----------
function CreatorVetting() {
  const [followers, setFollowers] = useState("120000");
  const [views, setViews] = useState("48000, 52000, 41000, 610000, 39000, 55000, 44000, 60000, 47000, 51000");
  const [saves, setSaves] = useState("1200, 1400, 900, 8200, 850, 1500, 1100, 1600, 1250, 1350");
  const [shares, setShares] = useState("400, 500, 300, 3100, 280, 520, 380, 560, 430, 470");
  const [comments, setComments] = useState("90, 110, 70, 900, 60, 120, 95, 130, 100, 105");
  const [sponsoredViews, setSponsoredViews] = useState("36000, 41000, 38000");
  const [relevance, setRelevance] = useState(70);
  const [handle, setHandle] = useState("");
  const [hasMediaKit, setHasMediaKit] = useState(false);
  const [nicheNotes, setNicheNotes] = useState("");

  const result = useMemo(() => {
    const f = parseFloat(followers) || 0;
    const v = parseNums(views);
    const sv = parseNums(saves);
    const sh = parseNums(shares);
    const cm = parseNums(comments);
    const spv = parseNums(sponsoredViews);
    if (!v.length || !f) return null;

    const medViews = median(v);
    const vfr = medViews / f;

    const n = v.length;
    const perPostEng = v.map((views_, i) => {
      const s = sv[i] || 0,
        h = sh[i] || 0,
        c = cm[i] || 0;
      return views_ > 0 ? (s + h + c) / views_ : 0;
    });
    const engRate = median(perPostEng);

    const perPostSaveShare = v.map((views_, i) => {
      const s = sv[i] || 0,
        h = sh[i] || 0;
      return views_ > 0 ? (s + h) / views_ : 0;
    });
    const saveShareRate = median(perPostSaveShare);

    const cv = mean(v) > 0 ? stdev(v) / mean(v) : 0;
    const spikeRatio = medViews > 0 ? Math.max(...v) / medViews : 0;

    const collabRatio = spv.length ? median(spv) / medViews : null;

    const verdictFor = (metric, val) => {
      const table = {
        vfr: [0.5, 0.2],
        eng: [0.05, 0.02],
        saveShare: [0.02, 0.008],
        cv: [0.5, 1, true], // lower is better
        collab: [0.8, 0.5],
      };
      const t = table[metric];
      if (metric === "cv") return val < t[0] ? "good" : val < t[1] ? "mid" : "bad";
      return val >= t[0] ? "good" : val >= t[1] ? "mid" : "bad";
    };

    return {
      medViews,
      vfr,
      engRate,
      saveShareRate,
      cv,
      spikeRatio,
      collabRatio,
      n,
      v_verdict: verdictFor("vfr", vfr),
      e_verdict: verdictFor("eng", engRate),
      s_verdict: verdictFor("saveShare", saveShareRate),
      c_verdict: verdictFor("cv", cv),
      collab_verdict: collabRatio !== null ? verdictFor("collab", collabRatio) : null,
    };
  }, [followers, views, saves, shares, comments, sponsoredViews]);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Inputs */}
      <div>
        <Field label="Handle (for your reference)" hint="not fetched — label only">
          <input
            className={inputCls}
            style={{ border: `1px solid ${LINE}` }}
            placeholder="@creator.handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </Field>
        <Field label="Followers">
          <input
            className={inputCls}
            style={{ border: `1px solid ${LINE}` }}
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
          />
        </Field>
        <Field label="Views — last 10–20 reels" hint="comma separated">
          <textarea
            className={inputCls + " h-16 resize-none font-mono text-[12px]"}
            style={{ border: `1px solid ${LINE}` }}
            value={views}
            onChange={(e) => setViews(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Saves" hint="same order">
            <textarea
              className={inputCls + " h-16 resize-none font-mono text-[12px]"}
              style={{ border: `1px solid ${LINE}` }}
              value={saves}
              onChange={(e) => setSaves(e.target.value)}
            />
          </Field>
          <Field label="Shares" hint="same order">
            <textarea
              className={inputCls + " h-16 resize-none font-mono text-[12px]"}
              style={{ border: `1px solid ${LINE}` }}
              value={shares}
              onChange={(e) => setShares(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Comments" hint="same order — likes deliberately excluded">
          <textarea
            className={inputCls + " h-16 resize-none font-mono text-[12px]"}
            style={{ border: `1px solid ${LINE}` }}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </Field>
        <Field label="Sponsored post views" hint="optional — for brand-collab drop-off">
          <textarea
            className={inputCls + " h-14 resize-none font-mono text-[12px]"}
            style={{ border: `1px solid ${LINE}` }}
            value={sponsoredViews}
            onChange={(e) => setSponsoredViews(e.target.value)}
          />
        </Field>
        <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${LINE}` }}>
          <div className="text-[12px] font-semibold tracking-wide mb-1" style={{ color: SAGE_DK }}>
            STAGE 1 · PUBLIC DATA ONLY
          </div>
          <Field
            label="Quick niche check"
            hint="optional — eyeball from their grid/captions"
          >
            <textarea
              className={inputCls + " h-14 resize-none text-[12px]"}
              style={{ border: `1px solid ${LINE}` }}
              placeholder="e.g. mostly skincare + a few travel posts, no obvious brand tags outside beauty"
              value={nicheNotes}
              onChange={(e) => setNicheNotes(e.target.value)}
            />
          </Field>
          <p className="text-[11px] leading-relaxed" style={{ color: "#9A9284" }}>
            Enough to filter out obviously off-niche creators before reaching out. Nothing
            below this line is needed to score a creator at this stage.
          </p>

          <div
            className="mt-5 rounded-lg p-3 flex items-center justify-between cursor-pointer select-none"
            style={{ background: hasMediaKit ? "#EEF1E7" : "#F2EFE7" }}
            onClick={() => setHasMediaKit(!hasMediaKit)}
          >
            <div>
              <div className="text-[12px] font-semibold tracking-wide" style={{ color: SAGE_DK }}>
                STAGE 2 · ONCE THEY'VE SENT A MEDIA KIT
              </div>
              <div className="text-[11px]" style={{ color: "#9A9284" }}>
                Only relevant for creators who already cleared Stage 1 and are in active outreach
              </div>
            </div>
            <span
              className="w-9 h-5 rounded-full relative shrink-0"
              style={{ background: hasMediaKit ? SAGE : "#D8D2C4" }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: hasMediaKit ? 18 : 2 }}
              />
            </span>
          </div>

          {hasMediaKit && (
            <div className="mt-4">
              <Field
                label={`Audience relevance (skincare/beauty) — ${relevance}%`}
                hint="from their media kit / shared IG Insights"
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={relevance}
                  onChange={(e) => setRelevance(parseInt(e.target.value))}
                  className="w-full accent-current"
                  style={{ accentColor: SAGE }}
                />
              </Field>
              <p className="text-[11px] leading-relaxed" style={{ color: "#9A9284" }}>
                Full age/gender/geo breakdowns live in their media kit itself — this slider is
                just your one-number summary of audience fit for the scorecard below.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div>
        {!result ? (
          <div
            className="h-full flex items-center justify-center text-[13px] rounded-lg p-8 text-center"
            style={{ background: "#F2EFE7", color: "#9A9284" }}
          >
            Enter followers and at least one views value to calculate.
          </div>
        ) : (
          <div className="space-y-3">
            <MetricRow
              label="Median views"
              value={fmt(result.medViews)}
              sub={`over ${result.n} posts — resists the one-viral-reel skew`}
            />
            <MetricRow
              label="Views-to-followers ratio"
              value={pct(result.vfr)}
              sub="median views ÷ followers"
              verdict={result.v_verdict}
              verdictLabel={
                result.v_verdict === "good" ? "genuine reach" : result.v_verdict === "mid" ? "average" : "weak distribution"
              }
            />
            <MetricRow
              label="Engagement rate"
              value={pct(result.engRate)}
              sub="(saves + shares + comments) ÷ views, median — likes excluded"
              verdict={result.e_verdict}
              verdictLabel={result.e_verdict === "good" ? "actively engaged" : result.e_verdict === "mid" ? "passable" : "passive audience"}
            />
            <MetricRow
              label="Save + share rate"
              value={pct(result.saveShareRate)}
              sub="the two actions that matter most for educational skincare content"
              verdict={result.s_verdict}
              verdictLabel={result.s_verdict === "good" ? "high value signal" : result.s_verdict === "mid" ? "moderate" : "low value signal"}
            />
            <MetricRow
              label="Consistency (spikiness)"
              value={`CV ${result.cv.toFixed(2)} · peak ${result.spikeRatio.toFixed(1)}× median`}
              sub="lower = more repeatable; one viral hit inflates the peak multiple"
              verdict={result.c_verdict}
              verdictLabel={result.c_verdict === "good" ? "reliable" : result.c_verdict === "mid" ? "somewhat spiky" : "one-hit risk"}
            />
            {result.collabRatio !== null && (
              <MetricRow
                label="Brand-collab retention"
                value={pct(result.collabRatio)}
                sub="sponsored median views ÷ organic median views"
                verdict={result.collab_verdict}
                verdictLabel={
                  result.collab_verdict === "good"
                    ? "sponsored holds up"
                    : result.collab_verdict === "mid"
                    ? "some drop-off"
                    : "sponsored underperforms"
                }
              />
            )}
            {hasMediaKit ? (
              <MetricRow
                label="Audience relevance (input)"
                value={`${relevance}%`}
                sub="skincare/beauty-relevant share of audience, from media kit"
                verdict={relevance >= 60 ? "good" : relevance >= 35 ? "mid" : "bad"}
                verdictLabel={relevance >= 60 ? "on-niche" : relevance >= 35 ? "mixed" : "off-niche"}
              />
            ) : (
              nicheNotes.trim() && (
                <div className="rounded-lg p-4" style={{ background: "#fff", border: `1px solid ${LINE}` }}>
                  <div className="text-[12px] font-medium tracking-wide" style={{ color: "#9A9284" }}>
                    NICHE CHECK (STAGE 1)
                  </div>
                  <div className="text-[13px] mt-1" style={{ color: INK }}>
                    {nicheNotes}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: "#9A9284" }}>
                    Not scored — a real relevance % needs their media kit (Stage 2).
                  </div>
                </div>
              )
            )}
            <p className="text-[11px] pt-2 leading-relaxed" style={{ color: "#9A9284" }}>
              Benchmarks above are reasonable starting points, not industry gospel — recalibrate
              the green/amber/red cutoffs against your own past-campaign data as it accumulates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricRow({ label, value, sub, verdict, verdictLabel }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "#fff", border: `1px solid ${LINE}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-medium tracking-wide" style={{ color: "#9A9284" }}>
            {label.toUpperCase()}
          </div>
          <div className="text-2xl font-semibold mt-0.5" style={{ color: INK, fontFamily: "Georgia, serif" }}>
            {value}
          </div>
        </div>
        {verdict && <Verdict level={verdict}>{verdictLabel}</Verdict>}
      </div>
      <div className="text-[11px] mt-1" style={{ color: "#9A9284" }}>
        {sub}
      </div>
    </div>
  );
}

// ---------- Tab 2: Concept scorer ----------
const CRITERIA = [
  "Hook",
  "Relatability",
  "Retention potential",
  "Shareability",
  "Creator fit",
  "Product integration",
  "USP clarity",
  "CTA / Conversion potential",
];

const QUESTIONS = [
  "Who is this video for?",
  "What problem are we addressing?",
  "Why would they stop scrolling?",
  "Why would they watch till the end?",
  "Why does SkinQ naturally fit into this story?",
  "What ONE thing should they remember about the product?",
  "What action do we want them to take?",
];

function ConceptScorer() {
  const [scores, setScores] = useState(CRITERIA.map(() => 3));
  const [threshold, setThreshold] = useState(30);
  const [answers, setAnswers] = useState(QUESTIONS.map(() => ""));
  const [ctr, setCtr] = useState("");

  const total = scores.reduce((a, b) => a + b, 0);
  const allAnswered = answers.every((a) => a.trim().length > 0);
  const scorePass = total >= threshold;
  const approved = scorePass && allAnswered;

  const ctrVal = parseFloat(ctr);
  const ctrHasVal = !isNaN(ctrVal) && ctr !== "";

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold tracking-wide" style={{ color: INK }}>
            SCORE THE CONCEPT
          </h3>
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "#9A9284" }}>
            pass mark
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
              className="w-12 text-center rounded px-1 py-0.5"
              style={{ border: `1px solid ${LINE}` }}
            />
            / 40
          </div>
        </div>
        <div className="space-y-4">
          {CRITERIA.map((c, i) => (
            <div key={c}>
              <div className="flex justify-between text-[13px] mb-1">
                <span style={{ color: INK }}>{c}</span>
                <span className="font-mono font-medium" style={{ color: SAGE_DK }}>
                  {scores[i]} / 5
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={scores[i]}
                onChange={(e) => {
                  const next = [...scores];
                  next[i] = parseInt(e.target.value);
                  setScores(next);
                }}
                className="w-full"
                style={{ accentColor: SAGE }}
              />
            </div>
          ))}
        </div>

        <div
          className="mt-6 rounded-lg p-4 flex items-center justify-between"
          style={{ background: scorePass ? "#EEF1E7" : "#F7E9E4" }}
        >
          <span className="text-[13px] font-medium" style={{ color: INK }}>
            Total
          </span>
          <span className="text-2xl font-semibold" style={{ fontFamily: "Georgia, serif", color: INK }}>
            {total} / 40
          </span>
        </div>

        <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${LINE}` }}>
          <Field
            label="Actual CTR on this concept (once live)"
            hint={`target 1.5% · current baseline 0.5%`}
          >
            <input
              className={inputCls}
              style={{ border: `1px solid ${LINE}`, maxWidth: 140 }}
              placeholder="e.g. 0.9"
              value={ctr}
              onChange={(e) => setCtr(e.target.value)}
            />
          </Field>
          {ctrHasVal && (
            <Verdict level={ctrVal >= 1.5 ? "good" : ctrVal > 0.5 ? "mid" : "bad"}>
              {ctrVal >= 1.5
                ? "at or above target"
                : ctrVal > 0.5
                ? "above baseline, below target"
                : "at or below baseline"}
            </Verdict>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold tracking-wide mb-3" style={{ color: INK }}>
          THE 7 GATING QUESTIONS
        </h3>
        <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "#9A9284" }}>
          If the team can't answer all seven in one clear sentence each, the concept isn't
          ready — regardless of score.
        </p>
        <div className="space-y-3">
          {QUESTIONS.map((q, i) => (
            <div key={q}>
              <div className="flex items-center gap-2 text-[12px] mb-1">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0"
                  style={{
                    background: answers[i].trim() ? SAGE : "#E4DFD3",
                    color: answers[i].trim() ? "#fff" : "#9A9284",
                  }}
                >
                  {answers[i].trim() ? <Check size={10} /> : i + 1}
                </span>
                <span style={{ color: INK }}>{q}</span>
              </div>
              <input
                className={inputCls + " text-[12px]"}
                style={{ border: `1px solid ${LINE}` }}
                value={answers[i]}
                onChange={(e) => {
                  const next = [...answers];
                  next[i] = e.target.value;
                  setAnswers(next);
                }}
              />
            </div>
          ))}
        </div>

        <div
          className="mt-6 rounded-lg p-4 flex items-center gap-3"
          style={{ background: approved ? "#EEF1E7" : "#F7E9E4" }}
        >
          {approved ? <Check size={18} color={SAGE_DK} /> : <X size={18} color="#A24A2E" />}
          <div>
            <div className="text-[13px] font-semibold" style={{ color: INK }}>
              {approved ? "Ready to greenlight" : "Not ready yet"}
            </div>
            <div className="text-[11px]" style={{ color: "#9A9284" }}>
              {!scorePass && `Score is ${threshold - total} point${threshold - total === 1 ? "" : "s"} short. `}
              {!allAnswered && `${answers.filter((a) => !a.trim()).length} question${answers.filter((a) => !a.trim()).length === 1 ? "" : "s"} unanswered.`}
              {approved && "Score clears the bar and every question has an answer."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [tab, setTab] = useState("vetting");
  return (
    <div style={{ background: PAPER, color: INK, minHeight: "100%" }} className="font-sans">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-1" style={{ color: SAGE_DK }}>
          <Beaker size={16} />
          <span className="text-[11px] font-medium tracking-[0.15em]">SKINQ · CONTENT OPS</span>
        </div>
        <h1
          className="text-3xl font-semibold mb-1"
          style={{ fontFamily: "Georgia, serif", color: INK }}
        >
          Creator &amp; Concept Toolkit
        </h1>
        <p className="text-[13px] mb-8" style={{ color: "#9A9284" }}>
          Two calculators: vet a creator on distribution and audience quality, then gate every
          concept against your rubric before it goes into production.
        </p>

        <div className="flex gap-1 mb-8" style={{ borderBottom: `1px solid ${LINE}` }}>
          {[
            { id: "vetting", label: "Creator vetting" },
            { id: "concept", label: "Concept scorer" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 text-[13px] font-medium flex items-center gap-1 -mb-px"
              style={{
                color: tab === t.id ? SAGE_DK : "#9A9284",
                borderBottom: tab === t.id ? `2px solid ${SAGE_DK}` : "2px solid transparent",
              }}
            >
              {t.label}
              {tab === t.id && <ChevronRight size={13} />}
            </button>
          ))}
        </div>

        {tab === "vetting" ? <CreatorVetting /> : <ConceptScorer />}
      </div>
    </div>
  );
}
