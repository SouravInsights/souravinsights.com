import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LinkData } from "../utils/discordApi";
import { X, Save } from "lucide-react";
import debounce from "lodash/debounce";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  markdownShortcutPlugin,
  linkPlugin,
  imagePlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLink: LinkData | null;
  onSaveNotes: (
    linkId: string,
    notes: string,
    creatorTwitter?: string
  ) => Promise<void>;
  onAddToCollection?: (linkData: {
    linkId: string;
    notes: string;
    creatorTwitter: string;
    category: string;
  }) => Promise<void>;
  currentCategory: string;
}

export function NoteEditorModal({
  isOpen,
  onClose,
  selectedLink,
  onSaveNotes,
  onAddToCollection,
  currentCategory,
}: NoteEditorModalProps) {
  const [notes, setNotes] = useState("");
  const [twitter, setTwitter] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Reset form when link changes
  useEffect(() => {
    if (selectedLink) {
      console.log("Setting initial notes:", selectedLink.notes);
      setNotes(selectedLink.notes || "");
      setTwitter(selectedLink.creatorTwitter || "");
    }
  }, [selectedLink]);

  const isNewLink = selectedLink ? !selectedLink.isCurated : false;

  // Debounced save function for autosave
  const debouncedSaveRef = useRef(
    debounce(async (id: string, noteText: string, twitterHandle: string) => {
      if (!id || isNewLink) return;

      console.log("Auto-saving notes:", noteText);
      setIsSaving(true);
      try {
        await onSaveNotes(id, noteText, twitterHandle);
        setLastSaved(new Date());
      } catch (error) {
        console.error("Error auto-saving:", error);
      } finally {
        setIsSaving(false);
      }
    }, 2000)
  );

  useEffect(() => {
    if (isOpen && selectedLink && !isNewLink && notes !== selectedLink.notes) {
      debouncedSaveRef.current(selectedLink.id, notes, twitter);
    }

    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, [isOpen, notes, twitter, selectedLink, isNewLink]);

  // Manual save function
  const handleSave = async () => {
    if (!selectedLink) return;

    setIsSaving(true);
    try {
      if (isNewLink && onAddToCollection) {
        // Adding a new link
        await onAddToCollection({
          linkId: selectedLink.id,
          notes,
          creatorTwitter: twitter,
          category: currentCategory,
        });
        onClose();
      } else {
        // Updating existing link
        await onSaveNotes(selectedLink.id, notes, twitter);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedLink) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[90vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {isNewLink ? "Add to Collection" : "Edit Notes"}
              </h2>
              <p className="text-sm text-gray-500 mt-1 truncate max-w-lg">
                {selectedLink.title}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left panel - Editor */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Your Notes</h3>
                <div className="border rounded-md overflow-hidden">
                  <MDXEditor
                    markdown={notes}
                    onChange={setNotes}
                    plugins={[
                      headingsPlugin(),
                      listsPlugin(),
                      quotePlugin(),
                      markdownShortcutPlugin(),
                      linkPlugin(),
                      imagePlugin(),
                    ]}
                    contentEditableClassName="prose prose-sm max-w-none min-h-[500px] p-4"
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>
                    {isSaving
                      ? "Saving..."
                      : lastSaved
                      ? `Last saved: ${lastSaved.toLocaleTimeString()}`
                      : isNewLink
                      ? ""
                      : "Changes will be saved automatically"}
                  </span>
                  <span>Markdown supported</span>
                </div>
              </div>
            </div>

            {/* Right panel - Metadata */}
            <div className="w-64 border-l p-4 overflow-auto">
              <h3 className="text-lg font-medium mb-4">Metadata</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Link</label>
                  <a
                    href={selectedLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {selectedLink.url}
                  </a>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category
                  </label>
                  <div className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {currentCategory}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Twitter Handle
                  </label>
                  <input
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="@username"
                    className="w-full p-2 text-sm border rounded-md"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving
                      ? "Saving..."
                      : isNewLink
                      ? "Add to Collection"
                      : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
