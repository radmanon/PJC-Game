// shared/activities.ts
import type { Activity } from "./types";

const ACTIVITIES: Activity[] = [
    // Preconstruction + Site Works
    { id: "A01", name: "Site Setup (Mobilization)", baseTime: 2, baseCost: 4, reqWorkers: 2, reqMachines: 1, dep: { type: "NONE" } },
    { id: "A02", name: "Permits & Approvals", baseTime: 2, baseCost: 3, reqWorkers: 1, reqMachines: 0, dep: { type: "NONE" } },
    { id: "A03", name: "Surveying & Layout", baseTime: 1, baseCost: 2, reqWorkers: 2, reqMachines: 0, dep: { type: "FS", on: ["A01", "A02"] } },
    { id: "A04", name: "Temporary Utilities & Fencing", baseTime: 1, baseCost: 2, reqWorkers: 2, reqMachines: 0, dep: { type: "FS", on: ["A01"] } },

    // Earthworks
    { id: "A05", name: "Excavation", baseTime: 3, baseCost: 6, reqWorkers: 3, reqMachines: 2, dep: { type: "FS", on: ["A03", "A04"] } },
    { id: "A06", name: "Dewatering (if needed)", baseTime: 2, baseCost: 4, reqWorkers: 2, reqMachines: 1, dep: { type: "FS", on: ["A05"] } },
    { id: "A07", name: "Subbase / Compaction", baseTime: 2, baseCost: 4, reqWorkers: 3, reqMachines: 1, dep: { type: "FS", on: ["A06"] } },

    // Foundations
    { id: "A08", name: "Foundation Formwork", baseTime: 2, baseCost: 5, reqWorkers: 3, reqMachines: 0, dep: { type: "FS", on: ["A07"] } },
    { id: "A09", name: "Foundation Rebar", baseTime: 2, baseCost: 6, reqWorkers: 4, reqMachines: 0, dep: { type: "FS", on: ["A08"] } },
    { id: "A10", name: "Foundation Concrete Pour", baseTime: 1, baseCost: 6, reqWorkers: 4, reqMachines: 1, dep: { type: "FS", on: ["A09"] } },
    { id: "A11", name: "Curing / Early Strength Gain", baseTime: 1, baseCost: 2, reqWorkers: 1, reqMachines: 0, dep: { type: "FS", on: ["A10"] } },

    // Substructure / Basement (optional but good for realism)
    { id: "A12", name: "Waterproofing (Substructure)", baseTime: 2, baseCost: 4, reqWorkers: 2, reqMachines: 0, dep: { type: "FS", on: ["A11"] } },
    { id: "A13", name: "Backfilling", baseTime: 2, baseCost: 3, reqWorkers: 2, reqMachines: 1, dep: { type: "FS", on: ["A12"] } },

    // Superstructure
    { id: "A14", name: "Ground Floor Columns / Walls", baseTime: 3, baseCost: 7, reqWorkers: 4, reqMachines: 1, dep: { type: "FS", on: ["A13"] } },
    { id: "A15", name: "Ground Floor Slab", baseTime: 2, baseCost: 7, reqWorkers: 4, reqMachines: 1, dep: { type: "FS", on: ["A14"] } },
    { id: "A16", name: "Upper Floor Structure (Frame)", baseTime: 5, baseCost: 9, reqWorkers: 4, reqMachines: 1, dep: { type: "FS", on: ["A15"] } },
    { id: "A17", name: "Staircase / Core", baseTime: 3, baseCost: 6, reqWorkers: 3, reqMachines: 1, dep: { type: "FS", on: ["A16"] } },
    { id: "A18", name: "Roof Structure", baseTime: 2, baseCost: 5, reqWorkers: 3, reqMachines: 1, dep: { type: "FS", on: ["A17"] } },

    // Envelope (some can overlap)
    { id: "A19", name: "Exterior Masonry / Blockwork", baseTime: 4, baseCost: 8, reqWorkers: 4, reqMachines: 0, dep: { type: "FS", on: ["A16"] } },
    { id: "A20", name: "Windows & Exterior Doors", baseTime: 2, baseCost: 6, reqWorkers: 2, reqMachines: 0, dep: { type: "SS", with: ["A21"] } },
    { id: "A21", name: "Façade / Cladding", baseTime: 3, baseCost: 8, reqWorkers: 3, reqMachines: 1, dep: { type: "SS", with: ["A20"] } },
    { id: "A22", name: "Roof Waterproofing / Membrane", baseTime: 2, baseCost: 5, reqWorkers: 2, reqMachines: 0, dep: { type: "FS", on: ["A18"] } },

    // MEP Rough-ins (SS group)
    { id: "A23", name: "Electrical Rough-in", baseTime: 3, baseCost: 7, reqWorkers: 3, reqMachines: 0, dep: { type: "SS", with: ["A24", "A25"] } },
    { id: "A24", name: "Plumbing Rough-in", baseTime: 3, baseCost: 7, reqWorkers: 3, reqMachines: 0, dep: { type: "SS", with: ["A23", "A25"] } },
    { id: "A25", name: "HVAC Rough-in", baseTime: 3, baseCost: 8, reqWorkers: 3, reqMachines: 1, dep: { type: "SS", with: ["A23", "A24"] } },
    { id: "A26", name: "Fire Protection Rough-in", baseTime: 2, baseCost: 6, reqWorkers: 2, reqMachines: 0, dep: { type: "FS", on: ["A23", "A24"] } },

    // Interior Works
    { id: "A27", name: "Interior Partitions / Drywall Framing", baseTime: 3, baseCost: 6, reqWorkers: 4, reqMachines: 0, dep: { type: "FS", on: ["A19", "A22"] } },
    { id: "A28", name: "Plastering / Drywall Finishing", baseTime: 3, baseCost: 6, reqWorkers: 4, reqMachines: 0, dep: { type: "FS", on: ["A27"] } },
    { id: "A29", name: "Floor Screed / Leveling", baseTime: 2, baseCost: 5, reqWorkers: 3, reqMachines: 0, dep: { type: "FS", on: ["A28"] } },

    // Interior finishes (SS pair)
    { id: "A30", name: "Ceiling Installation", baseTime: 2, baseCost: 5, reqWorkers: 3, reqMachines: 0, dep: { type: "SS", with: ["A31"] } },
    { id: "A31", name: "Painting (Interior)", baseTime: 3, baseCost: 5, reqWorkers: 3, reqMachines: 0, dep: { type: "SS", with: ["A30"] } },

    { id: "A32", name: "Flooring (Tile/Vinyl/etc.)", baseTime: 2, baseCost: 5, reqWorkers: 3, reqMachines: 0, dep: { type: "FS", on: ["A29", "A31"] } },
    { id: "A33", name: "Interior Doors & Hardware", baseTime: 2, baseCost: 4, reqWorkers: 2, reqMachines: 0, dep: { type: "FS", on: ["A32"] } },
    { id: "A34", name: "Cabinetry / Built-ins", baseTime: 2, baseCost: 5, reqWorkers: 2, reqMachines: 0, dep: { type: "FS", on: ["A32"] } },

    // MEP Fixtures & Final
    { id: "A35", name: "Electrical Fixtures & Testing", baseTime: 2, baseCost: 4, reqWorkers: 2, reqMachines: 0, dep: { type: "FS", on: ["A23", "A30", "A31"] } },
    { id: "A36", name: "Plumbing Fixtures & Testing", baseTime: 2, baseCost: 4, reqWorkers: 2, reqMachines: 0, dep: { type: "FS", on: ["A24", "A32"] } },
    { id: "A37", name: "HVAC Commissioning", baseTime: 2, baseCost: 5, reqWorkers: 2, reqMachines: 1, dep: { type: "FS", on: ["A25", "A35"] } },

    // Exterior Works (SS pair)
    { id: "A38", name: "Exterior Paving / Walkways", baseTime: 2, baseCost: 4, reqWorkers: 2, reqMachines: 1, dep: { type: "SS", with: ["A39"] } },
    { id: "A39", name: "Landscaping", baseTime: 2, baseCost: 3, reqWorkers: 2, reqMachines: 0, dep: { type: "SS", with: ["A38"] } },

    // Handover
    { id: "A40", name: "Final Inspection, Handover & Closeout", baseTime: 2, baseCost: 4, reqWorkers: 2, reqMachines: 0, dep: { type: "FS", on: ["A33", "A34", "A35", "A36", "A37", "A38", "A39"] } },
];

export default ACTIVITIES;