import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "~/core/utils";
import { Button } from "~/components/ui/button";
import Link from "next/link";

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  project: {
    id: string;
    project_name: string;
    description?: string;
  } | null;
}

export function SideMenu({ open, onClose, project }: SideMenuProps) {
  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-30 h-full w-64 bg-gray-100 shadow-lg transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex flex-col items-center gap-4 p-4 pt-6">
        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        {/* Thumbnail */}
        <Image
          src="/thumbnail.png"
          alt="thumbnail"
          width={120}
          height={120}
          className="rounded-lg border object-cover"
        />
        {project && (
          <div className="text-center">
            <h2 className="text-lg font-semibold leading-tight">
              {project.project_name}
            </h2>
            {project.description && (
              <p className="text-xs text-gray-500 mt-1">
                {project.description}
              </p>
            )}
          </div>
        )}
      </div>
      <hr className="border-gray-300" />
      <div className="p-4">
        <h3 className="mb-3 text-sm font-bold text-gray-700">DATA</h3>
        <div className="flex flex-col gap-2">
          {project ? (
            <Button variant="outline" className="w-full" onClick={onClose} asChild>
              <Link href={{ pathname: `/projects/${project.id}/visualize`, query: { projectId: project.id } }}>
                Visualize
              </Link>
            </Button>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              Visualize
            </Button>
          )}
          <Button variant="outline" className="w-full">
            Versions
          </Button>
          <Button variant="outline" className="w-full">
            Analytics
          </Button>
        </div>
      </div>
    </aside>
  );
} 