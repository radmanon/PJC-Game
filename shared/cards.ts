import type { CardType } from "./types";

export type CardDef = {
    id: string;
    type: Exclude<CardType, "CHOICE" | "NONE">;
    title: string;
    rulesText: string;
    effect: {
        timeDelta?: number; // weeks (+/-)
        costDelta?: number; // BP (+/-)
        prodDelta?: number; // productivity (+/-)
        coinDelta?: number; // coins (+/-)
        buff?: {
            effect: "TIME_MINUS_1" | "COST_MINUS_1" | "IGNORE_SITE_ONCE";
            turns: number;
        };
        special?: "HALF_NEXT_FIN_PENALTY";
    };
};

export const CARDS: CardDef[] = [
    // ================= FIN =================
    { id: "F01", type: "FIN", title: "Progress Payment", rulesText: "+3 BP", effect: { costDelta: -3 } },
    { id: "F02", type: "FIN", title: "Material Price Increase", rulesText: "+2 BP cost", effect: { costDelta: +2 } },
    { id: "F03", type: "FIN", title: "Bulk Purchasing", rulesText: "-2 BP cost", effect: { costDelta: -2 } },
    { id: "F04", type: "FIN", title: "Transport Cost Increase", rulesText: "+1 BP cost", effect: { costDelta: +1 } },
    { id: "F05", type: "FIN", title: "Tax & Insurance Fees", rulesText: "+2 BP cost", effect: { costDelta: +2 } },
    { id: "F06", type: "FIN", title: "Supplier Discount", rulesText: "-1 BP cost", effect: { costDelta: -1 } },
    { id: "F07", type: "FIN", title: "Cashflow Shortage", rulesText: "+1 BP cost", effect: { costDelta: +1 } },
    { id: "F08", type: "FIN", title: "Contract Adjustment (+)", rulesText: "-2 BP cost", effect: { costDelta: -2 } },
    { id: "F09", type: "FIN", title: "Contract Adjustment (-)", rulesText: "+2 BP cost", effect: { costDelta: +2 } },
    { id: "F10", type: "FIN", title: "Early Procurement", rulesText: "-1 BP for 2 activities", effect: { buff: { effect: "COST_MINUS_1", turns: 2 } } },
    { id: "F11", type: "FIN", title: "Claim Approved", rulesText: "-2 BP cost", effect: { costDelta: -2 } },
    { id: "F12", type: "FIN", title: "Claim Rejected", rulesText: "+1 BP cost", effect: { costDelta: +1 } },
    { id: "F13", type: "FIN", title: "Reserve Use", rulesText: "-2 BP cost", effect: { costDelta: -2 } },
    { id: "F14", type: "FIN", title: "Late Payment Penalty", rulesText: "+1 BP cost", effect: { costDelta: +1 } },
    { id: "F15", type: "FIN", title: "Currency Fluctuation", rulesText: "+1 BP cost", effect: { costDelta: +1 } },

    // ================= SITE =================
    { id: "S01", type: "SITE", title: "Heavy Rain", rulesText: "+1 week", effect: { timeDelta: +1 } },
    { id: "S02", type: "SITE", title: "Well-Organized Site", rulesText: "-1 week", effect: { timeDelta: -1 } },
    { id: "S03", type: "SITE", title: "Equipment Failure", rulesText: "+1 week", effect: { timeDelta: +1 } },
    { id: "S04", type: "SITE", title: "Site Access Restriction", rulesText: "+1 week", effect: { timeDelta: +1 } },
    { id: "S05", type: "SITE", title: "Rework Required", rulesText: "+1 week, +1 BP", effect: { timeDelta: +1, costDelta: +1 } },
    { id: "S06", type: "SITE", title: "Permit Delay", rulesText: "+1 week", effect: { timeDelta: +1 } },
    { id: "S07", type: "SITE", title: "Good Logistics", rulesText: "-1 week", effect: { timeDelta: -1 } },
    { id: "S08", type: "SITE", title: "Poor Coordination", rulesText: "+1 week", effect: { timeDelta: +1 } },
    { id: "S09", type: "SITE", title: "Unstable Soil", rulesText: "+2 BP", effect: { costDelta: +2 } },
    { id: "S10", type: "SITE", title: "Safety Inspection", rulesText: "+1 week", effect: { timeDelta: +1 } },
    { id: "S11", type: "SITE", title: "Noise Restriction", rulesText: "+1 week", effect: { timeDelta: +1 } },
    { id: "S12", type: "SITE", title: "Utility Conflict", rulesText: "+1 BP", effect: { costDelta: +1 } },
    { id: "S13", type: "SITE", title: "Emergency Shutdown", rulesText: "+1 week", effect: { timeDelta: +1 } },
    { id: "S14", type: "SITE", title: "Skilled Supervision", rulesText: "-1 week", effect: { timeDelta: -1 } },
    { id: "S15", type: "SITE", title: "Risk Mitigated", rulesText: "No effect", effect: {} },

    // ================= UPG =================
    { id: "U01", type: "UPG", title: "Equipment Upgrade", rulesText: "-1 week for 2 turns", effect: { buff: { effect: "TIME_MINUS_1", turns: 2 } } },
    { id: "U02", type: "UPG", title: "Skilled Labor Contract", rulesText: "+1 productivity", effect: { prodDelta: +1 } },
    { id: "U03", type: "UPG", title: "Fast-Tracking Approval", rulesText: "+1 coin", effect: { coinDelta: +1 } },
    { id: "U04", type: "UPG", title: "BIM Adoption", rulesText: "Ignore next SITE", effect: { buff: { effect: "IGNORE_SITE_ONCE", turns: 1 } } },
    { id: "U05", type: "UPG", title: "Lean Construction", rulesText: "-1 BP next activity", effect: { buff: { effect: "COST_MINUS_1", turns: 1 } } },
    { id: "U06", type: "UPG", title: "Improved Scheduling", rulesText: "-1 week", effect: { timeDelta: -1 } },
    { id: "U07", type: "UPG", title: "Supplier Partnership", rulesText: "-1 BP for 2 turns", effect: { buff: { effect: "COST_MINUS_1", turns: 2 } } },
    { id: "U08", type: "UPG", title: "Modular Work Method", rulesText: "-1 week", effect: { timeDelta: -1 } },
    { id: "U09", type: "UPG", title: "Quality System", rulesText: "+1 productivity", effect: { prodDelta: +1 } },
    { id: "U10", type: "UPG", title: "Advanced Planning", rulesText: "+1 coin", effect: { coinDelta: +1 } },
    { id: "U11", type: "UPG", title: "Safety Training", rulesText: "+1 productivity", effect: { prodDelta: +1 } },
    { id: "U12", type: "UPG", title: "Incentive Contract", rulesText: "+1 coin", effect: { coinDelta: +1 } },
    { id: "U13", type: "UPG", title: "Logistics Optimization", rulesText: "-1 week", effect: { timeDelta: -1 } },
    { id: "U14", type: "UPG", title: "Prefabrication", rulesText: "-1 week next activity", effect: { buff: { effect: "TIME_MINUS_1", turns: 1 } } },
    { id: "U15", type: "UPG", title: "Management Decision", rulesText: "+1 coin", effect: { coinDelta: +1 } },

    // ================= PROD =================
    { id: "P01", type: "PROD", title: "High Team Coordination", rulesText: "+1 productivity", effect: { prodDelta: +1 } },
    { id: "P02", type: "PROD", title: "Worker Fatigue", rulesText: "-1 productivity", effect: { prodDelta: -1 } },
    { id: "P03", type: "PROD", title: "Learning Curve", rulesText: "-1 week", effect: { timeDelta: -1 } },
    { id: "P04", type: "PROD", title: "Strong Leadership", rulesText: "+1 productivity", effect: { prodDelta: +1 } },
    { id: "P05", type: "PROD", title: "Motivation Boost", rulesText: "+1 productivity", effect: { prodDelta: +1 } },
    { id: "P06", type: "PROD", title: "Staff Turnover", rulesText: "-1 productivity", effect: { prodDelta: -1 } },
    { id: "P07", type: "PROD", title: "Experienced Crew", rulesText: "+1 productivity", effect: { prodDelta: +1 } },
    { id: "P08", type: "PROD", title: "Team Conflict", rulesText: "-1 productivity", effect: { prodDelta: -1 } },
    { id: "P09", type: "PROD", title: "Continuous Improvement", rulesText: "+1 productivity", effect: { prodDelta: +1 } },
    { id: "P10", type: "PROD", title: "Poor Morale", rulesText: "-1 productivity", effect: { prodDelta: -1 } },
    { id: "P11", type: "PROD", title: "Organizational Maturity", rulesText: "+1 productivity", effect: { prodDelta: +1 } },
    { id: "P12", type: "PROD", title: "Burnout", rulesText: "-1 productivity", effect: { prodDelta: -1 } },
    { id: "P13", type: "PROD", title: "Knowledge Sharing", rulesText: "+1 productivity", effect: { prodDelta: +1 } },
    { id: "P14", type: "PROD", title: "Communication Breakdown", rulesText: "-1 productivity", effect: { prodDelta: -1 } },
    { id: "P15", type: "PROD", title: "Stable Workforce", rulesText: "+1 productivity", effect: { prodDelta: +1 } },
];

export const CARD_BY_ID = new Map<string, CardDef>(CARDS.map((c) => [c.id, c]));

// ✅ IMPORTANT: Default export too (makes it work even if Node treats it like CJS)
const CardsModule = { CARDS, CARD_BY_ID } as const;
export default CardsModule;
