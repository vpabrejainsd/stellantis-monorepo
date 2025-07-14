// src/lib/constants.ts

export const JOB_TYPES = [
  "Basic Service",
  "Intermediate Service",
  "Full Service",
  "Custom Service",
] as const;

export const URGENCY_LEVELS = ["Low", "Normal", "High"] as const;

// Define tasks with their IDs and descriptions, mimicking the Python script's structure.
export const ALL_TASKS = {
  T001: { name: "Oil Change", time: 25 },
  T002: { name: "Oil Filter Replacement", time: 15 },
  T003: { name: "Air Filter Check", time: 15 },
  T004: { name: "Fluid Levels Check", time: 30 },
  T005: { name: "Tyre Pressure Check", time: 15 },
  T006: { name: "Visual Inspection", time: 20 },
  T007: { name: "Brake Inspection", time: 30 },
  T008: { name: "Tyre Condition and Alignment Check", time: 30 },
  T009: { name: "Battery Check", time: 25 },
  T010: { name: "Exhaust System Inspection", time: 45 },
  T011: { name: "Steering and Suspension Check", time: 60 },
  T012: { name: "Lights and Wipers Check", time: 20 },
  T013: { name: "Fuel System Inspection", time: 65 },
  T014: { name: "Transmission Check", time: 120 },
  T015: { name: "Spark Plugs Replacement", time: 180 },
  T016: { name: "Timing Belt Inspection", time: 35 },
  T017: { name: "Wheel Alignment and Balancing", time: 30 },
  T018: { name: "Cabin Filter Replacement", time: 20 },
  T019: { name: "Comprehensive Diagnostic Check", time: 120 },
  T020: { name: "Underbody Inspection", time: 60 },
};

// Define the task IDs for each service level
export const BASIC_SERVICE_TASK_IDS = [
  "T001",
  "T002",
  "T003",
  "T004",
  "T005",
  "T006",
];
export const INTERMEDIATE_SERVICE_TASK_IDS = [
  ...BASIC_SERVICE_TASK_IDS,
  "T007",
  "T008",
  "T009",
  "T010",
  "T011",
  "T012",
];
export const FULL_SERVICE_TASK_IDS = [
  ...INTERMEDIATE_SERVICE_TASK_IDS,
  "T013",
  "T014",
  "T015",
  "T016",
  "T017",
  "T018",
  "T019",
  "T020",
];
