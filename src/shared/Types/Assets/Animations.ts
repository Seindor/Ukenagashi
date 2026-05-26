export type IAnimations = {
    ["Default"]: {
        ["Dashes"]: {
            ["Dash_Back_Left"]: Animation;
            ["Dash_Back_Right"]: Animation;
            ["Dash_Cancel"]: Animation;
            ["Dash_Forward_Left"]: Animation;
            ["Dash_Forward_Right"]: Animation;
            ["Dash_Left"]: Animation;
            ["Dash_Right"]: Animation;
        } & Folder;
        ["Hits"]: {
            ["Hit_1"]: Animation;
            ["Hit_2"]: Animation;
            ["Hit_3"]: Animation;
            ["Hit_4"]: Animation;
            ["PostureBreak"]: Animation;
        } & Folder;
        ["Movement"]: {
            ["Falling"]: Animation;
            ["Idle"]: Animation;
            ["Jump"]: Animation;
            ["Run"]: Animation;
            ["Walk"]: Animation;
        } & Folder;
    } & Folder;
    ["Sekiro"]: {
        ["Combat"]: {
            ["Hits"]: {
                ["Block_Hit_1"]: Animation;
                ["Block_Hit_2"]: Animation;
                ["Hit_1"]: Animation;
                ["Hit_2"]: Animation;
                ["Hit_3"]: Animation;
            } & Folder;
            ["Sheath_M1"]: {
                ["M1_1"]: Animation;
                ["M1_2"]: Animation;
                ["M1_3"]: Animation;
                ["M1_4"]: Animation;
            } & Folder;
            ["Unsheath_M1"]: {
                ["M1_1"]: Animation;
                ["M1_2"]: Animation;
                ["M1_3"]: Animation;
                ["M1_4"]: Animation;
            } & Folder;
        } & Folder;
        ["Dashes"]: {
            ["Sheath"]: {
                ["Dash_Back_Left"]: Animation;
                ["Dash_Back_Right"]: Animation;
                ["Dash_Forward_Left"]: Animation;
                ["Dash_Forward_Right"]: Animation;
                ["Dash_Left"]: Animation;
                ["Dash_Right"]: Animation;
            } & Folder;
            ["Unsheath"]: {
                ["Dash_Back_Left"]: Animation;
                ["Dash_Back_Right"]: Animation;
                ["Dash_Forward_Left"]: Animation;
                ["Dash_Forward_Right"]: Animation;
                ["Dash_Left"]: Animation;
                ["Dash_Right"]: Animation;
            } & Folder;
        } & Folder;
        ["Defense"]: {
            ["Block_Idle"]: Animation;
            ["Parry_1"]: Animation;
            ["Parry_2"]: Animation;
            ["Parry_3"]: Animation;
            ["Parry_Cast"]: Animation;
        } & Folder;
        ["Misc"]: {
            ["Katana_Sheathing"]: Animation;
        } & Folder;
        ["Movement"]: {
            ["Block"]: {
                ["Falling"]: Animation;
                ["Idle"]: Animation;
                ["Jump"]: Animation;
                ["Run"]: Animation;
                ["Walk"]: Animation;
            } & Folder;
            ["Sheath"]: {
                ["Falling"]: Animation;
                ["Idle"]: Animation;
                ["Jump"]: Animation;
                ["Run"]: Animation;
                ["Walk"]: Animation;
            } & Folder;
            ["Unsheath"]: {
                ["Falling"]: Animation;
                ["Idle"]: Animation;
                ["Jump"]: Animation;
                ["Run"]: Animation;
                ["Walk"]: Animation;
            } & Folder;
        } & Folder;
    } & Folder;
} & Folder;
