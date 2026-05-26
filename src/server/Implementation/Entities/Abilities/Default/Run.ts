import { Players } from "@rbxts/services";

import { Dependency } from "@flamework/core";
import { IAbilityBlacklist } from "shared/Domain/Ability/Types/AbilityTypes";
import { StatusEffectsReplication } from "server/Application/StatusEffectsReplication";
import { ServerSignals } from "shared/Implementation/Entities/SerrverSignals";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { ServerRegistry } from "server/DI/Generated/ServerRegistry";
import { CompositionRootServer } from "server/DI/CompositionRootServer";

const sharedScope = CompositionRootShared.createScope();
const serverScope = CompositionRootServer.createScope();

const abilityAPI = sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI);
const entitiesStorageAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EntitiesStorageAPI);
const statusEffectsAPI = serverScope.resolve(ServerRegistry.Singletons.API.StatusEffectsAPI);

export function Run(ownerId: string) {
    let tapCount = 0;

    let statusEffectsReplication = Dependency<StatusEffectsReplication>();

    let ability = abilityAPI.Create(
        {
            name: "Default_Run",
            ownerId,
            states: ["Idle"],
            additionalBlacklist: ["Dash", "Block", "WeaponClick"],
            lastUsed: 0,
            types: [{ name: "Movement", level: 1 }],
            cooldown: 0,
            duration: 0,
            minDuration: 0,
        },
        {
            onStartCheck() {
                let entity = entitiesStorageAPI.GetEntity(ownerId);
                if (!entity) return false;

                let character = entity.entity as Model;
                let humanoid = character.WaitForChild("Humanoid") as Humanoid;

                if (
                    statusEffectsAPI.CheckStatuses(
                        ownerId,
                        ability.GetBlacklist(),
                        ability.config.ignoreList ?? [],
                    )
                ) {
                    if (entity.HasTag("Player")) {
                        humanoid.WalkSpeed = 12;
                        ServerSignals.Ability.fire(
                            Players.GetPlayerFromCharacter(character)!,
                            "Default_Run",
                            "Hold",
                            "Reject",
                            true,
                        );
                    }
                    return false;
                }

                return true;
            },
            onEndCheck(trueEnd?: boolean) {
                if (trueEnd) return true;
                return false;
            },
            onStart() {
                let entity = entitiesStorageAPI.GetEntity(ownerId);
                if (!entity) return;

                let character = entity.entity as Model;
                let humanoid = character.WaitForChild("Humanoid") as Humanoid;

                humanoid.WalkSpeed = 20;
                statusEffectsAPI.CreateStatus("Run", { duration: math.huge }, true, ownerId);
            },
            onEnd() {
                statusEffectsAPI.RemoveStatus(ownerId, "Run");
            },
            onInterrupt() {},
            onReject() {},
        },
    );

    return ability;
}
