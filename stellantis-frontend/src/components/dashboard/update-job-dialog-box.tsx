// src/components/shared/EditJobDialog.tsx
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Job {
  Job_Id: string;
  Make: string;
  Model: string;
  VIN: string;
  Urgency: string;
  Job_Name: string;
}

interface EditJobDialogProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedJob: Partial<Job>) => Promise<void>;
}

export function EditJobDialog({
  job,
  isOpen,
  onClose,
  onSave,
}: EditJobDialogProps) {
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    vin: "",
    urgency: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when dialog opens or job changes
  useEffect(() => {
    if (isOpen && job) {
      setFormData({
        make: job.Make || "",
        model: job.Model || "",
        vin: job.VIN || "",
        urgency: job.Urgency || "",
      });
    }
  }, [isOpen, job]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    // Basic validation
    if (
      !formData.make.trim() ||
      !formData.model.trim() ||
      !formData.vin.trim() ||
      !formData.urgency
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // VIN validation (basic)
    if (formData.vin.length !== 17) {
      toast.error("VIN must be exactly 17 characters");
      return;
    }

    setIsSaving(true);

    try {
      const updatedJobData: Partial<Job> = {
        Make: formData.make.trim(),
        Model: formData.model.trim(),
        VIN: formData.vin.trim().toUpperCase(),
        Urgency: formData.urgency,
      };

      await onSave(updatedJobData);
      toast.success("Job updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update job");
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      make: job.Make || "",
      model: job.Model || "",
      vin: job.VIN || "",
      urgency: job.Urgency || "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Job: {job.Job_Name}</DialogTitle>
          <DialogDescription>
            Update the vehicle information and urgency level for this job.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Vehicle Make */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="make" className="text-right">
              Make *
            </Label>
            <Input
              id="make"
              value={formData.make}
              onChange={(e) => handleInputChange("make", e.target.value)}
              className="col-span-3"
              placeholder="e.g., Toyota, Ford, BMW"
              disabled={isSaving}
            />
          </div>

          {/* Vehicle Model */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="model" className="text-right">
              Model *
            </Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => handleInputChange("model", e.target.value)}
              className="col-span-3"
              placeholder="e.g., Camry, F-150, X3"
              disabled={isSaving}
            />
          </div>

          {/* Vehicle VIN */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vin" className="text-right">
              VIN *
            </Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="vin"
                value={formData.vin}
                onChange={(e) =>
                  handleInputChange("vin", e.target.value.toUpperCase())
                }
                className="font-mono"
                placeholder="17-character VIN"
                maxLength={17}
                disabled={isSaving}
              />
              <p className="text-muted-foreground text-xs">
                {formData.vin.length}/17 characters
              </p>
            </div>
          </div>

          {/* Urgency */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="urgency" className="text-right">
              Urgency *
            </Label>
            <Select
              value={formData.urgency}
              onValueChange={(value) => handleInputChange("urgency", value)}
              disabled={isSaving}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select urgency level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
