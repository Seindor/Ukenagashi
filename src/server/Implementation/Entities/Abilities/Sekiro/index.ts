import { AbilityPackDefinition } from "../CreatePack";
import { Block } from "./Block";

import { M1 } from "./M1";

export const SekiroPack = {
    name: "Sekiro",
    abilities: {
        ["M1"]: {
            key: "M1",
            abilityName: "Sekiro_M1",
            activatingType: "Signal",
            type: "Switch",
            ability: M1,
        },
        ["Block"]: {
            key: "Block",
            abilityName: "Sekiro_Block",
            activatingType: "Signal",
            type: "Hold",
            ability: Block,
        },
    },
} as AbilityPackDefinition;
