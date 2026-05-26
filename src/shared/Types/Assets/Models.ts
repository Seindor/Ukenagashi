export type IModels = {
    ["Sekiro"]: {
        ["Models"]: {
            ["Katana"]: {
                ["SurfaceAppearance"]: SurfaceAppearance;
            } & MeshPart;
            ["Prosthesis"]: {
                ["LeftCharArm"]: {
                    ["SurfaceAppearance"]: SurfaceAppearance;
                    ["WeldConstraint"]: WeldConstraint;
                } & MeshPart;
            } & MeshPart;
            ["Sheath"]: {
                ["SurfaceAppearance"]: SurfaceAppearance;
            } & MeshPart;
        } & Folder;
        ["Welds"]: {
            ["Left Arm_Prothesis_Weld"]: Weld;
            ["RH_Katana_Weld"]: Weld;
            ["Sheath_Katana_Weld"]: Weld;
            ["Torso_Sheath_Weld"]: Weld;
        } & Folder;
    } & Folder;
} & Folder;
