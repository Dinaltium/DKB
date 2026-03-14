import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const categories = ["Overcharging", "Wrong Route", "Harassment", "Reckless Driving", "Other"];

export const ComplaintDialog = ({ busNumber, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Overcharging");
  const [description, setDescription] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [loading, setLoading] = useState(false);

  const submitComplaint = async () => {
    if (!description.trim()) {
      toast.error("Please add complaint details");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/complaints", {
        bus_number: busNumber,
        category,
        description,
        photo_name: photoName || null,
      });
      toast.success(response.data.message || "Complaint submitted");
      setDescription("");
      setPhotoName("");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Unable to submit complaint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid="open-complaint-dialog-button"
          variant="outline"
          className="h-12 rounded-none border-2 border-[#0D1B2A] bg-white px-5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-slate-100"
        >
          Complaint / Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="border-2 border-slate-300 bg-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle data-testid="complaint-dialog-title" className="font-['Barlow_Condensed'] text-3xl uppercase text-[#0D1B2A]">
            Raise Complaint
          </DialogTitle>
          <DialogDescription data-testid="complaint-dialog-description">
            Bus Number: {busNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="complaint-category-select" className="h-11 border-2 border-slate-300">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((item) => (
                <SelectItem key={item} value={item} data-testid={`complaint-category-option-${item.toLowerCase().replace(/\s+/g, "-")}`}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            data-testid="complaint-description-input"
            placeholder="Describe the issue..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-28 border-2 border-slate-300"
          />

          <Input
            type="file"
            accept="image/*"
            data-testid="complaint-photo-input"
            className="h-11 border-2 border-slate-300"
            onChange={(event) => setPhotoName(event.target.files?.[0]?.name || "")}
          />
        </div>

        <DialogFooter>
          <Button
            data-testid="complaint-submit-button"
            onClick={submitComplaint}
            disabled={loading}
            className="h-11 rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] font-semibold uppercase tracking-wide text-white hover:bg-slate-800"
          >
            {loading ? "Submitting..." : "Submit Complaint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
