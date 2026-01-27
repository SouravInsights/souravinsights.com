import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LinkData } from "../utils/discordApi";
import { Send, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  curatedLinks: LinkData[];
}

export function NewsletterModal({
  isOpen,
  onClose,
  curatedLinks,
}: NewsletterModalProps) {
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [currentEmailId, setCurrentEmailId] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "schedule">("select");

  useEffect(() => {
    if (isOpen) {
      setSelectedLinks([]);
      setEmailSubject("");
      setScheduleDate(undefined);
      setCurrentEmailId(null);
      setStep("select");
    }
  }, [isOpen]);

  const handleToggleLink = (id: string) => {
    setSelectedLinks((prev) =>
      prev.includes(id) ? prev.filter((linkId) => linkId !== id) : [...prev, id]
    );
  };

  const handleCreateDraft = async () => {
    if (!emailSubject.trim()) {
      alert("Please enter an email subject"); // currently using alert for simplicity, I'll have to replace it with toast
      return;
    }

    if (selectedLinks.length === 0) {
      alert("Please select at least one link"); // currently using alert for simplicity, I'll have to replace it with toast
      return;
    }

    setIsCreatingDraft(true);

    try {
      const response = await fetch("/api/newsletter/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_API_KEY}`,
        },
        body: JSON.stringify({
          linkIds: selectedLinks,
          emailSubject,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create newsletter draft");
      }

      const data = await response.json();
      setCurrentEmailId(data.emailId);
      setStep("schedule");
    } catch (error) {
      console.error("Error creating draft:", error);
      alert("Error creating newsletter draft");
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate) {
      alert("Please select a date to schedule the newsletter");
      return;
    }

    if (!currentEmailId) {
      alert("No email draft found. Please try again.");
      return;
    }

    setIsScheduling(true);

    try {
      const response = await fetch("/api/newsletter/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_API_KEY}`,
        },
        body: JSON.stringify({
          emailId: currentEmailId,
          scheduleDate: scheduleDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to schedule newsletter");
      }

      alert("Newsletter scheduled successfully!");
      onClose();
    } catch (error) {
      console.error("Error scheduling newsletter:", error);
      alert("Error scheduling newsletter");
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Newsletter Manager</DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Select links to include in your next newsletter"
              : "Schedule your newsletter"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <>
            <div className="space-y-4 py-4">
              <div>
                <label
                  htmlFor="email-subject"
                  className="block text-sm font-medium mb-1"
                >
                  Email Subject
                </label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="What's your newsletter about?"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Links ({selectedLinks.length} selected)
                </label>
                <div className="max-h-[300px] overflow-y-auto border rounded-md p-1">
                  {curatedLinks.length === 0 ? (
                    <p className="text-center text-muted-foreground p-4">
                      No curated links available. Add some links to your
                      collection first.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {curatedLinks.map((link) => (
                        <li key={link.id} className="border rounded-md p-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`link-${link.id}`}
                              checked={selectedLinks.includes(link.id)}
                              onCheckedChange={() => handleToggleLink(link.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`link-${link.id}`}
                                className="font-medium cursor-pointer hover:text-blue-600"
                              >
                                {link.title}
                              </label>
                              <div className="text-xs text-muted-foreground mt-1">
                                {link.category && (
                                  <span>Category: {link.category} • </span>
                                )}
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline"
                                >
                                  View Link
                                </a>
                              </div>
                              {link.notes && (
                                <p className="text-sm mt-1 text-muted-foreground">
                                  {link.notes.length > 100
                                    ? `${link.notes.substring(0, 100)}...`
                                    : link.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateDraft}
                disabled={
                  isCreatingDraft ||
                  selectedLinks.length === 0 ||
                  !emailSubject.trim()
                }
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isCreatingDraft ? "Creating Draft..." : "Create Draft"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Schedule Date & Time
                </label>
                <div className="flex flex-col space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleDate ? (
                          format(scheduleDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>

                  {scheduleDate && (
                    <div className="flex space-x-2">
                      <Input
                        type="time"
                        className="w-full"
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value
                            .split(":")
                            .map(Number);
                          const newDate = new Date(scheduleDate);
                          newDate.setHours(hours, minutes);
                          setScheduleDate(newDate);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-1">Draft Created Successfully</h3>
                <p className="text-sm text-muted-foreground">
                  Your newsletter draft has been created. Now choose when to
                  send it to your subscribers.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={isScheduling || !scheduleDate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="mr-2 h-4 w-4" />
                {isScheduling ? "Scheduling..." : "Schedule Newsletter"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
