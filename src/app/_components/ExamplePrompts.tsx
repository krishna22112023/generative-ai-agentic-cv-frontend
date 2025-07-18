import React from "react";

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
}

const EXAMPLE_PROMPTS: { title: string; content: string }[] = [
  {
    title: "🛠️ Preprocess Dataset",
    content:
      "Please enhance the dataset I uploaded and annotate all visible cars and pedestrians.",
  },
  {
    title: "🔍 Image Quality Analysis",
    content:
      "Analyze these images for quality issues and tell me which ones need improvement.",
  },
  {
    title: "⚙️ Deblur & Enhance",
    content:
      "Can you apply debluring, contrast enhancement and gamma correction to improve the average BRISQUE scores by atleast 20",
  },
  {
    title: "📦 Data Collection & Ingestion",
    content:
      "Collect and injest 3 Singapore traffic datasets from huggingface",
  },
];

export function ExamplePrompts({ onSelect }: ExamplePromptsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {EXAMPLE_PROMPTS.map((p) => (
        <button
          key={p.title}
          className="rounded-lg border bg-gray-50 px-3 py-2 text-left text-sm shadow-sm hover:bg-gray-100"
          onClick={() => onSelect(p.content)}
        >
          {p.title}
        </button>
      ))}
    </div>
  );
} 