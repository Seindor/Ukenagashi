export type ISounds = {
    ["Default"]: {
        ["Dashes"]: {
            ["Dash"]: Sound;
            ["Roll"]: Sound;
        } & Folder;
        ["Fients"]: {
            ["Fient_1"]: Sound;
        } & Folder;
        ["GreatStun"]: {
            ["GreatStun"]: Sound;
            ["GreatStun1"]: Sound;
        } & Folder;
        ["Parry"]: {
            ["1"]: Sound;
            ["2"]: Sound;
            ["3"]: Sound;
        } & Folder;
        ["Sword_BlockHits"]: {
            ["1"]: Sound;
            ["2"]: Sound;
            ["3"]: Sound;
        } & Folder;
    } & Folder;
    ["Sekiro"]: {
        ["Hits"]: {
            ["1"]: Sound;
            ["2"]: Sound;
            ["3"]: Sound;
            ["4"]: Sound;
        } & Folder;
        ["Sheath"]: Sound;
        ["Swings"]: {
            ["1"]: Sound;
            ["2"]: Sound;
            ["3"]: Sound;
            ["4"]: Sound;
        } & Folder;
    } & Folder;
} & Folder;
