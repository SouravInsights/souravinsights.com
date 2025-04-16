import React, { useState } from "react";
import { LinkData } from "../utils/discordApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: LinkData | null;
  category: string;
  onSave: (data: {
    linkId: string;
    notes: string;
    creatorTwitter: string;
    category: string;
  }) => Promise<void>;
}

export function CurationModal({
  isOpen,
  onClose,
  link,
  category,
  onSave,
}: CurationModalProps) {
  const [notes, setNotes] = useState("");
  const [creatorTwitter, setCreatorTwitter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!link) return;

    setIsSubmitting(true);

    try {
      await onSave({
        linkId: link.id,
        notes,
        creatorTwitter,
        category,
      });

      setNotes("");
      setCreatorTwitter("");
      onClose();
    } catch (error) {
      console.error("Error saving to curation:", error);
      alert("Failed to save link to curation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add to Curabbbbted Collection</DialogTitle>
          <DialogDescription>
            Add this resource to your personal curated collection with your
            notes.
          </DialogDescription>
        </DialogHeader>

        {link && (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={link.title}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={link.url}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="creatorTwitter">
                  Creator Twitter (optional)
                </Label>
                <Input
                  id="creatorTwitter"
                  placeholder="@username"
                  value={creatorTwitter}
                  onChange={(e) => setCreatorTwitter(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Your Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Why is this resource valuable? What stands out about it?"
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save to Collection"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
