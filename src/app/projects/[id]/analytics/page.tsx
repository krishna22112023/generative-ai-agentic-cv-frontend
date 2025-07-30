"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SideMenu } from "../../../_components/SideMenu";
import { AppHeader } from "../../../_components/AppHeader";
import { Menu as MenuIcon } from "lucide-react";
import { TooltipProvider } from "~/components/ui/tooltip";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as BarTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import React from "react";

interface PipelineFile {
  name: string; // filename without extension
  functions: string[];
  parameters: Record<string, any> | null;
  scores: Record<string, number> | number[] | null;
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const versionId = searchParams.get("versionId");

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [project, setProject] = useState<{
    id: string;
    project_name: string;
    bucket_name?: string;
    description?: string;
  } | null>(null);

  // Metrics & data state
  const [numImages, setNumImages] = useState<number | null>(null);
  const [avgImageSize, setAvgImageSize] = useState<{ w: number; h: number } | null>(null);
  const [medianAspect, setMedianAspect] = useState<number | null>(null);
  const [sizeDistData, setSizeDistData] = useState<{ label: string; count: number }[]>([]);
  const [aspectDistData, setAspectDistData] = useState<{ label: string; count: number }[]>([]);
  const [brisqueValues, setBrisqueValues] = useState<number[]>([]);
  const [brisqueStats, setBrisqueStats] = useState<{ avg: number; median: number; std: number } | null>(null);
  const [severityData, setSeverityData] = useState<{ severity: string; count: number }[]>([]);
  const [beforeAvgScores, setBeforeAvgScores] = useState<Record<string, number>>({}); // severity -> avg_score
  const [pipelines, setPipelines] = useState<PipelineFile[]>([]);
  const [selectedPipelineIdx, setSelectedPipelineIdx] = useState<number>(0);

  // on mount: fetch project details
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProject(data))
      .catch(console.error);
  }, [projectId]);

  // fetch artefacts
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const res = await fetch("/api/minio/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, folder: "artefacts" }),
        });
        const data = await res.json();
        const items: { key: string; url: string }[] = data.items || [];

        const getUrl = (fname: string) => items.find((it) => it.key.endsWith(fname))?.url ?? null;
        const metadataUrl = getUrl("metadata.json");
        const rawBrisqueUrl = getUrl("nr_iqa_results_raw.json");
        const severityUrl = getUrl("nr_iqa_results_by_raw_severity.json");

        // Pipeline files
        const pipelineItems = items.filter((it) => it.key.includes("pipelines/") && it.key.endsWith(".json"));

        // Fetch required JSONs
        const [metadata, rawBrisque, severityJson, pipelineJsons] = await Promise.all([
          metadataUrl ? fetch(metadataUrl).then((r) => r.json()).catch(() => null) : Promise.resolve(null),
          rawBrisqueUrl ? fetch(rawBrisqueUrl).then((r) => r.json()).catch(() => null) : Promise.resolve(null),
          severityUrl ? fetch(severityUrl).then((r) => r.json()).catch(() => null) : Promise.resolve(null),
          Promise.all(
            pipelineItems.map(async (it) => {
              const data = await fetch(it.url).then((r) => r.json()).catch(() => null);
              return { key: it.key, data } as { key: string; data: any };
            }),
          ),
        ]);

        // Process metadata
        if (metadata) {
          // Attempt to derive metrics
          if (typeof metadata.number_of_images === "number") {
            setNumImages(metadata.number_of_images);
          } else if (Array.isArray(metadata.images)) {
            setNumImages(metadata.images.length);
          }

          if (metadata.average_image_size && typeof metadata.average_image_size === "object") {
            setAvgImageSize({
              w: Math.round(metadata.average_image_size.width ?? 0),
              h: Math.round(metadata.average_image_size.height ?? 0),
            });
          } else if (metadata.avg_width && metadata.avg_height) {
            setAvgImageSize({ w: metadata.avg_width, h: metadata.avg_height });
          } else if (Array.isArray(metadata.images) && metadata.images.length > 0) {
            const sumW = metadata.images.reduce((acc: number, img: any) => acc + (img.width || 0), 0);
            const sumH = metadata.images.reduce((acc: number, img: any) => acc + (img.height || 0), 0);
            const avgW = Math.round(sumW / metadata.images.length);
            const avgH = Math.round(sumH / metadata.images.length);
            setAvgImageSize({ w: avgW, h: avgH });
          }

          if (metadata.median_aspect_ratio) {
            setMedianAspect(metadata.median_aspect_ratio);
          } else if (Array.isArray(metadata.images) && metadata.images.length > 0) {
            const aspects = metadata.images.map((img: any) => {
              const w = img.width || 1;
              const h = img.height || 1;
              return w / h;
            });
            aspects.sort((a: number, b: number) => a - b);
            const mid = Math.floor(aspects.length / 2);
            const median = aspects.length % 2 === 0 ? (aspects[mid - 1] + aspects[mid]) / 2 : aspects[mid];
            setMedianAspect(Number(median.toFixed(2)));
          }

          // Size distribution
          if (metadata.size_distribution && typeof metadata.size_distribution === "object") {
            setSizeDistData(
              Object.entries(metadata.size_distribution).map(([label, count]) => ({ label, count: count as number }))
            );
          }

          // Aspect ratio distribution
          if (metadata.aspect_ratio_distribution && typeof metadata.aspect_ratio_distribution === "object") {
            setAspectDistData(
              Object.entries(metadata.aspect_ratio_distribution).map(([label, count]) => ({ label, count: count as number }))
            );
          }
        }

        // Process raw brisque values
        if (rawBrisque) {
          let values: number[] = [];
          if (Array.isArray(rawBrisque)) {
            values = rawBrisque as number[];
          } else if (Array.isArray(rawBrisque.values)) {
            values = rawBrisque.values;
          } else if (Array.isArray(rawBrisque.scores)) {
            values = rawBrisque.scores;
          } else if (typeof rawBrisque === "object") {
            // map of filename -> { brisque: num }
            values = Object.values(rawBrisque as Record<string, any>)
              .map((obj: any) => (typeof obj === "object" && typeof obj.brisque === "number" ? obj.brisque : null))
              .filter((n): n is number => typeof n === "number");
          }
          if (values.length > 0) {
            setBrisqueValues(values);
            // compute stats
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const sorted = [...values].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
            const mean = avg;
            const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
            const std = Math.sqrt(variance);
            setBrisqueStats({ avg, median, std });
          }
        }

        // Process severity distribution
        if (severityJson) {
          // Expect structure: { "Very low": {count: X, avg_score: Y}, ... }
          const sevEntries: { severity: string; count: number }[] = [];
          const beforeAvg: Record<string, number> = {};
          Object.entries(severityJson as any).forEach(([key, val]: [string, any]) => {
            if (!val) return;
            sevEntries.push({ severity: key, count: val.count ?? 0 });
            if (typeof val.avg_score === "number") beforeAvg[key] = val.avg_score;
          });
          setSeverityData(sevEntries);
          setBeforeAvgScores(beforeAvg);
        }

        // Process pipeline files
        if (Array.isArray(pipelineJsons) && pipelineJsons.length > 0) {
          const pl: PipelineFile[] = pipelineJsons.map((item) => {
            const nameWithPath = item.key.split("/").pop() ?? "pipeline";
            const name = nameWithPath.replace(/\.json$/i, "");
            const data = item.data ?? {};
            return {
              name,
              functions: Array.isArray(data.functions) ? data.functions : [],
              parameters: data.params ?? data.parameters ?? null,
              scores: data.scores ?? data.score ?? null,
            };
          });
          setPipelines(pl);
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [projectId]);

  // Histogram bins (memoized)
  const histogramData = useMemo(() => {
    if (brisqueValues.length === 0) return [] as { bin: string; count: number }[];
    const bins = 10;
    const min = Math.min(...brisqueValues);
    const max = Math.max(...brisqueValues);
    const interval = (max - min) / bins;
    const counts = new Array(bins).fill(0);
    brisqueValues.forEach((v) => {
      const idx = Math.min(bins - 1, Math.floor((v - min) / interval));
      counts[idx] += 1;
    });
    return counts.map((c, idx) => ({ bin: `${(min + idx * interval).toFixed(1)}-${(min + (idx + 1) * interval).toFixed(1)}`, count: c }));
  }, [brisqueValues]);

  // Clustered bar chart data (before vs after)
  const clusteredData = useMemo(() => {
    const currentPipeline = pipelines[selectedPipelineIdx] ?? null;
    let afterScores: Record<string, number> = {};
    if (currentPipeline && currentPipeline.scores) {
      if (Array.isArray(currentPipeline.scores)) {
        // If array, compute overall average
        const arr = currentPipeline.scores as number[];
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        afterScores["Overall"] = avg;
      } else if (typeof currentPipeline.scores === "object") {
        afterScores = currentPipeline.scores as Record<string, number>;
      } else if (typeof currentPipeline.scores === "number") {
        afterScores["Overall"] = currentPipeline.scores as number;
      }
    }
    const categories = Array.from(new Set([...Object.keys(beforeAvgScores), ...Object.keys(afterScores)]));
    return categories.map((cat) => ({ category: cat, Before: beforeAvgScores[cat] ?? 0, After: afterScores[cat] ?? 0 }));
  }, [beforeAvgScores, pipelines, selectedPipelineIdx]);

  const currentPipeline = pipelines[selectedPipelineIdx] ?? null;

  return (
    <TooltipProvider delayDuration={150}>
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <SideMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} project={project} versionId={versionId} />
      <ScrollArea className="h-screen w-full">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 flex h-16 w-full items-center px-4 backdrop-blur-sm">
            <button className="mr-4 text-gray-700 hover:text-gray-900" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <MenuIcon className="h-6 w-6" />
            </button>
            <AppHeader />
          </header>
          <main className="flex-1 px-4 py-6 space-y-8">
            <h1 className="mb-6 text-2xl font-semibold">Dataset Analytics</h1>
            {/* Top dataset metrics */}
            <Section title="Dataset overview">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Number of Images" value={numImages !== null ? numImages : "N/A"} />
                <MetricCard title="Number of Annotations" value="N/A" />
                <MetricCard title="Avg. Image Size" value={avgImageSize ? `${avgImageSize.w} x ${avgImageSize.h}` : "N/A"} />
                <MetricCard title="Median aspect ratio" value={medianAspect !== null ? medianAspect.toFixed(2) : "N/A"} />
              </div>
            </Section>

            {/* Dimensions & Aspect Ratios */}
            <Section title="Dimensions & Aspect Ratios">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="mb-2 font-semibold">Size distribution</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={sizeDistData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval={0} angle={-40} textAnchor="end" height={60} />
                      <YAxis />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold">Aspect ratio distribution</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={aspectDistData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval={0} angle={-40} textAnchor="end" height={60} />
                      <YAxis />
                      <Bar dataKey="count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Section>

            {/* Quality Analysis */}
            <Section title="Quality Analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Histogram */}
                <div>
                  <h4 className="mb-2 font-semibold">Histogram distribution</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={histogramData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bin" angle={-40} textAnchor="end" height={60} interval={0} />
                      <YAxis />
                      <Bar dataKey="count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                  {brisqueStats && (
                    <p className="mt-2 text-sm text-gray-600">Avg: {brisqueStats.avg.toFixed(2)}, Median: {brisqueStats.median.toFixed(2)}, σ: {brisqueStats.std.toFixed(2)}</p>
                  )}
                </div>
                {/* Severity */}
                <div>
                  <h4 className="mb-2 font-semibold">Severity distribution</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={severityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="severity" interval={0} angle={-40} textAnchor="end" height={60} />
                      <YAxis />
                      <Bar dataKey="count" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Section>

            {/* Avg BRISQUE before & after grid removed (now inside insights) */}
            {/* Processing overview */}
            <Section title="Processing overview">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Avg. BRISQUE (Before)" value={brisqueStats ? brisqueStats.avg.toFixed(2) : "N/A"} />
                <MetricCard title="Avg. BRISQUE (After)" value={(() => {
                  const pl = currentPipeline;
                  if (!pl || pl.scores === null || pl.scores === undefined) return "N/A";
                  if (Array.isArray(pl.scores)) {
                    const arr = pl.scores as number[];
                    return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
                  }
                  if (typeof pl.scores === "number") return pl.scores.toFixed(2);
                  const vals = Object.values(pl.scores as Record<string, number | undefined>).filter((v): v is number => typeof v === "number");
                  if (vals.length === 0) return "N/A";
                  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
                })()} />
              </div>
            </Section>

            {/* Optimized pipeline */}
            <Section title="Optimized pipeline">
              {pipelines.length > 0 ? (
                <div className="space-y-4">
                  <select
                    className="rounded border px-2 py-1 text-sm"
                    value={selectedPipelineIdx}
                    onChange={(e) => setSelectedPipelineIdx(parseInt(e.target.value))}
                  >
                    {pipelines.map((p, idx) => (
                      <option key={p.name} value={idx}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <PipelineDiagram functions={currentPipeline?.functions ?? []} />
                  {currentPipeline?.parameters && (
                    <ParametersToggle parameters={currentPipeline.parameters} />
                  )}
                </div>
              ) : (
                <p>No pipeline artefacts found.</p>
              )}
            </Section>

            {/* Clustered Bar Chart */}
            <Section title="Avg. BRISQUE scores (Before VS After)">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clusteredData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" interval={0} angle={-40} textAnchor="end" height={60} />
                  <YAxis />
                  <Bar dataKey="Before" fill="#8884d8" />
                  <Bar dataKey="After" fill="#82ca9d" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </main>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}

/***************** Helper components *****************/
const MetricCard = ({ title, value }: { title: string; value: string | number }) => (
  <div className="rounded-lg border p-4 shadow-sm">
    <p className="text-sm text-gray-500">{title}</p>
    <p className="mt-1 text-xl font-semibold">{value}</p>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h3 className="mb-4 text-lg font-semibold">{title}</h3>
    {children}
  </section>
);

const PipelineDiagram = ({ functions }: { functions: string[] }) => {
  if (!functions || functions.length === 0) return <p>None</p>;
  const limited = functions.slice(0, 3);
  while (limited.length < 3) limited.push("None");
  return (
    <div className="flex items-center gap-2">
      {limited.map((fn, idx) => (
        <React.Fragment key={idx}>
          <div
            className="rounded border bg-gray-50 px-4 py-2 text-sm font-medium shadow"
          >
            {fn}
          </div>
          {idx !== limited.length - 1 && <span className="text-xl">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

const ParametersToggle = ({ parameters }: { parameters: Record<string, any> }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button
        className="text-sm text-blue-600 hover:underline"
        onClick={() => setShow((s) => !s)}
      >
        {show ? "Hide Parameters" : "Show Parameters"}
      </button>
      {show && (
        <div className="overflow-x-auto mt-2">
          <table className="min-w-max text-xs border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-1 text-left">Parameter</th>
                <th className="border px-2 py-1 text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(parameters).map(([k, v]) => (
                <tr key={k} className="odd:bg-white even:bg-gray-50">
                  <td className="border px-2 py-1">{k}</td>
                  <td className="border px-2 py-1">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}; 