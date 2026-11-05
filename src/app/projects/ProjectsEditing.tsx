"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DotsSixVertical } from "@phosphor-icons/react";
import { hasAdminHint } from "@/lib/admin-client";

/**
 * Whether the projects are being reordered.
 *
 * A context, not an overlay: the page keeps its header, its layout and its
 * chrome, and only the rows change — they get a drag handle. Clicking the toggle
 * is the entire mode switch.
 */
type EditingValue = { editing: boolean; setEditing: (editing: boolean) => void };

const EditingContext = createContext<EditingValue>({
  editing: false,
  setEditing: () => {},
});

export function useProjectsEditing() {
  return useContext(EditingContext);
}

export function ProjectsEditingProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  return (
    <EditingContext.Provider value={{ editing, setEditing }}>
      {children}
    </EditingContext.Provider>
  );
}

/**
 * The mode switch, in the page header where the page's other actions live.
 * Rendered only for a session with the non-secret `admin_ui` hint, so the page
 * stays static and a visitor is never shown it.
 */
export function ProjectsEditToggle() {
  const { editing, setEditing } = useProjectsEditing();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(hasAdminHint());
  }, []);

  if (!isAdmin) return null;

  return (
    <button
      type="button"
      onClick={() => setEditing(!editing)}
      aria-pressed={editing}
      className={
        editing
          ? "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-transparent bg-foreground/10 px-3 py-1.5 type-caption font-medium text-foreground transition-colors"
          : "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 type-caption font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
      }
    >
      <DotsSixVertical className="h-4 w-4" />
      {editing ? "Done" : "Reorder"}
    </button>
  );
}
