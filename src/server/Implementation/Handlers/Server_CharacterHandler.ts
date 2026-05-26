import { Workspace, Players } from "@rbxts/services";

import Fusion, { Children } from "@rbxts/fusion";
import { IApperancy } from "shared/Types/Gameplay/PlayerApperance";
import { ServerAtomReplication } from "server/Application/ServerAtomReplication";
import { Dependency, Service } from "@flamework/core";
import { ServerSignals } from "shared/Implementation/Entities/SerrverSignals";

import { SetupCombat } from "./Combat";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { ServerRegistry } from "server/DI/Generated/ServerRegistry";
import { CompositionRootServer } from "server/DI/CompositionRootServer";

let sharedScope = CompositionRootShared.createScope();
let serverScope = CompositionRootServer.createScope();

let statusEffectsAPI = serverScope.resolve(ServerRegistry.Singletons.API.StatusEffectsAPI);

export class Server_CharacterHandler {
    public character: Model;
    public apperancy: IApperancy;

    public api = {
        entitiesStorageAPI: sharedScope.resolve(SharedRegistry.Singletons.API.EntitiesStorageAPI),
    };

    private createApperancy() {
        let apperance = Fusion.New("Folder")({
            Name: "Apperancy",

            [Children]: [
                Fusion.New("Folder")({
                    Name: "Arms",
                }),

                Fusion.New("Folder")({
                    Name: "Torso",
                }),

                Fusion.New("Folder")({
                    Name: "Back",
                }),

                Fusion.New("Folder")({
                    Name: "Legs",
                }),

                Fusion.New("Folder")({
                    Name: "Weapon",

                    [Children]: [
                        Fusion.New("Folder")({
                            Name: "Welds",
                        }),

                        Fusion.New("Folder")({
                            Name: "Models",
                        }),
                    ],
                }),

                Fusion.New("Folder")({
                    Name: "Face",
                }),

                Fusion.New("Folder")({
                    Name: "Others",
                }),

                Fusion.New("Folder")({
                    Name: "Hat",
                }),

                Fusion.New("Folder")({
                    Name: "Handlers",

                    [Children]: [
                        Fusion.New("Folder")({
                            Name: "Motors",
                        }),

                        Fusion.New("Folder")({
                            Name: "Parts",
                        }),
                    ],
                }),
            ],
        }) as IApperancy;
        return apperance;
    }

    private createHandler(handleName: "LH" | "RH") {
        let appearancy = this.apperancy;
        let leftArm = this.character.FindFirstChild("Left Arm")! as BasePart;
        let rightArm = this.character.FindFirstChild("Right Arm")! as BasePart;

        let selectedArm;

        if (handleName === "LH") {
            selectedArm = leftArm;
        } else {
            selectedArm = rightArm;
        }

        let handle = new Instance("Part");
        handle.Name = handleName;
        handle.Transparency = 1;
        handle.CanCollide = false;
        handle.Massless = false;
        handle.CanQuery = false;
        handle.AudioCanCollide = false;

        handle.Size = new Vector3(0.364, 0.158, 1.025);

        let motor = new Instance("Motor6D");
        motor.Name = `${handleName}M`;
        motor.Enabled = false;
        motor.Part0 = selectedArm!;
        motor.Part1 = handle;

        if (handleName === "LH") {
            motor.C0 = new CFrame(0.2, -1, 0);
        } else {
            motor.C0 = new CFrame(-0.2, -1, 0);
        }

        motor.Enabled = true;
        motor.Parent = appearancy.Handlers.Motors;
        handle.Parent = appearancy.Handlers.Parts;
    }

    private CreateHandlers() {
        this.createHandler("LH");
        this.createHandler("RH");
    }

    constructor(character: Model, id?: string, characterName?: string) {
        this.character = character;
        this.apperancy = this.createApperancy();
        this.apperancy.Parent = this.character;

        this.createApperancy();
        this.CreateHandlers();

        if (Players.GetPlayerFromCharacter(character)) {
            character.Parent = Workspace.WaitForChild("Map").WaitForChild("Players");
            let player = Players.GetPlayerFromCharacter(character)!;
            let playerStringUserId = tostring(player?.UserId);
            let entity = this.api.entitiesStorageAPI.AddEntity(playerStringUserId, character);
            character.AddTag("Player");
            entity.AddTag("Player");

            const atomReplication = Dependency<ServerAtomReplication>();

            while (!atomReplication.IsPlayerFullyReady(playerStringUserId)) {
                task.wait();
            }

            const playerData = atomReplication.GetPlayersDataAtom().Get(playerStringUserId)!;

            entity.miscData.set("CharacterName", playerData.Equipment.Character.Name);
            SetupCombat(playerStringUserId, playerData.Equipment.Character.Name);

            entity.miscData.set("LastLaunchedVFX", [
                player,
                playerData.Equipment.Character.Name,
                "Spawn",
                playerStringUserId,
                character,
            ]);

            ServerSignals.LaunchVFX.except(
                player,
                playerData.Equipment.Character.Name,
                "Spawn",
                playerStringUserId,
                character,
            );

            statusEffectsAPI.RemoveAllStatuses(playerStringUserId);
        } else {
            if (!id || !characterName) return;
            character.Parent = Workspace.WaitForChild("Map").WaitForChild("NPCs");
            let entity = this.api.entitiesStorageAPI.AddEntity(id, character);
            entity.miscData.set("CharacterName", characterName);
            SetupCombat(id, characterName);

            character.AddTag("NPC");
        }
    }
}
