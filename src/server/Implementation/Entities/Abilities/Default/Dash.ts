import { Players } from "@rbxts/services";

import { Dependency } from "@flamework/core";
import { IAbilityBlacklist } from "shared/Domain/Ability/Types/AbilityTypes";
import { ServerSignals } from "shared/Implementation/Entities/SerrverSignals";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { ServerRegistry } from "server/DI/Generated/ServerRegistry";
import { CompositionRootServer } from "server/DI/CompositionRootServer";
import { AllSoundPaths } from "shared/Utilities/SoundsUtil";

const sharedScope = CompositionRootShared.createScope();
const serverScope = CompositionRootServer.createScope();

const abilityAPI = sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI);
const entitiesStorageAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EntitiesStorageAPI);
const statusEffectsAPI = serverScope.resolve(ServerRegistry.Singletons.API.StatusEffectsAPI);

export function Dash(ownerId: string) {
    let ability = abilityAPI.Create(
        {
            name: "Default_Dash",
            ownerId,
            states: ["Idle"],
            lastUsed: 0,
            types: [{ name: "Movement", level: 1 }],
            additionalBlacklist: ["WeaponClick", "Block"],
            cooldown: 0,
            duration: 0,
            minDuration: 0,
        },
        {
            onStartCheck() {
                let entity = entitiesStorageAPI.GetEntity(ownerId)!;

                if (
                    statusEffectsAPI.CheckStatuses(
                        ownerId,
                        ability.GetBlacklist(),
                        ability.config.ignoreList ?? [],
                    )
                ) {
                    if (entity.HasTag("Player")) {
                        print("Server_Dash_Reject");
                        ServerSignals.Ability.fire(
                            Players.GetPlayerByUserId(tonumber(ownerId)!)!,
                            "Default_Dash",
                            "Switch",
                            "Reject",
                            undefined,
                            true,
                        );
                    }

                    return false;
                }

                return true;
            },
            onEndCheck() {
                return true;
            },
            onStart(soundName: string) {
                let entity = entitiesStorageAPI.GetEntity(ownerId)!;
                let character = entity.entity as Model;
                let humanoidRootPart = character.WaitForChild("HumanoidRootPart") as BasePart;

                statusEffectsAPI.CreateStatus("Dash", { duration: 0.5 }, true, ownerId);
                statusEffectsAPI.CreateStatus("Dodge", { duration: 0.3 }, true, ownerId);

                entity.miscData.set("LastLaunchedVFX", [
                    "Default_Dash",
                    "Dash_Emit",
                    character,
                    ownerId,
                ]);

                ServerSignals.LaunchVFX.except(
                    Players.GetPlayerByUserId(tonumber(ownerId)!)!,
                    "Default_Dash",
                    "Dash_Emit",
                    character,
                    ownerId,
                );
            },
            onEnd() {},
            onInterrupt() {},
            onReject() {},
        },
    );

    return ability;
}
