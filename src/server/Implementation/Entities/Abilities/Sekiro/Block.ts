import { Players, Workspace } from "@rbxts/services";

import { Dependency } from "@flamework/core";
import { ServerSignals } from "shared/Implementation/Entities/SerrverSignals";
import { StatusEffectsReplication } from "server/Application/StatusEffectsReplication";
import { IAbilityBlacklist } from "shared/Domain/Ability/Types/AbilityTypes";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { CompositionRootServer } from "server/DI/CompositionRootServer";
import { ServerRegistry } from "server/DI/Generated/ServerRegistry";
import { AllSoundPaths } from "shared/Utilities/SoundsUtil";
import { PingUitl } from "shared/Utilities/PingUtil";
import { StepRunner } from "server/Application/StepRunner";
import { Sekiro_M1_HitContext } from "server/Implementation/Handlers/Combat/Sekiro/Sekiro_M1";

const sharedScope = CompositionRootShared.createScope();
const serverScope = CompositionRootServer.createScope();

const abilityAPI = sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI);
const entitiesStorageAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EntitiesStorageAPI);
const statusEffectsAPI = serverScope.resolve(ServerRegistry.Singletons.API.StatusEffectsAPI);
const hitboxAPI = sharedScope.resolve(SharedRegistry.Singletons.API.HitboxAPI);
const eventBusAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EventBusAPI);
const phaseResolverAPI = sharedScope.resolve(SharedRegistry.Singletons.API.PhaseResolverAPI);
const solverAPI = sharedScope.resolve(SharedRegistry.Singletons.API.SolverAPI);

export function Block(ownerId: string) {
    const stepRunner = Dependency<StepRunner>();

    let ability = abilityAPI.Create(
        {
            name: "Sekiro_Block",
            ownerId,
            states: ["Idle"],
            lastUsed: 0,
            types: [{ name: "Defense", level: 1 }],
            additionalBlacklist: ["Dash", "WeaponClick", "Parry"],
            cooldown: 0.25,
            duration: math.huge,
            minDuration: 0,
            miscData: new Map<string, unknown>(),
        },
        {
            onStartCheck() {
                if (
                    statusEffectsAPI.CheckStatuses(
                        ownerId,
                        ability.GetBlacklist(),
                        ability.config.ignoreList ?? [],
                    )
                ) {
                    print("SERVER BLOCK RETURN");
                    return false;
                }

                return true;
            },
            onEndCheck() {
                if (
                    statusEffectsAPI.CheckStatuses(
                        ownerId,
                        ability.GetBlacklist(),
                        ability.config.ignoreList ?? [],
                    )
                ) {
                    return false;
                }

                return true;
            },
            onStart() {
                let entity = entitiesStorageAPI.GetEntity(ownerId)!;
                let character = entity.entity as Model;

                statusEffectsAPI.CreateStatus("Block", { duration: math.huge }, true, ownerId);

                entity.miscData.set("LastLaunchedVFX", [
                    "Sekiro",
                    "Block",
                    ownerId,
                    character,
                    Workspace.GetServerTimeNow(),
                ]);

                if (entity.HasTag("Player")) {
                    ServerSignals.LaunchVFX.except(
                        Players.GetPlayerFromCharacter(character)!,
                        "Sekiro",
                        "Block",
                        ownerId,
                        character,
                        Workspace.GetServerTimeNow(),
                    );
                } else {
                    ServerSignals.LaunchVFX.broadcast(
                        "Sekiro",
                        "Block",
                        ownerId,
                        character,
                        Workspace.GetServerTimeNow(),
                    );
                }

                print("Server_Block_Start");
            },
            onEnd() {
                let entity = entitiesStorageAPI.GetEntity(ownerId)!;
                let character = entity.entity as Model;

                statusEffectsAPI.RemoveStatus(ownerId, "Block");

                entity.miscData.set("LastLaunchedVFX", [
                    "Sekiro",
                    "BlockStop",
                    ownerId,
                    character,
                    Workspace.GetServerTimeNow(),
                ]);

                if (entity.HasTag("Player")) {
                    ServerSignals.LaunchVFX.except(
                        Players.GetPlayerFromCharacter(character)!,
                        "Sekiro",
                        "BlockStop",
                        ownerId,
                        character,
                        Workspace.GetServerTimeNow(),
                    );
                } else {
                    ServerSignals.LaunchVFX.broadcast(
                        "Sekiro",
                        "BlockStop",
                        ownerId,
                        character,
                        Workspace.GetServerTimeNow(),
                    );
                }

                print("Server_Block_End");
            },
            onInterrupt() {},
            onReject() {
                let entity = entitiesStorageAPI.GetEntity(ownerId)!;
                let character = entity.entity as Model;

                statusEffectsAPI.RemoveStatus(ownerId, "Block");

                entity.miscData.set("LastLaunchedVFX", [
                    "Sekiro",
                    "BlockStop",
                    ownerId,
                    character,
                    Workspace.GetServerTimeNow(),
                ]);

                if (entity.HasTag("Player")) {
                    ServerSignals.Ability.fire(
                        Players.GetPlayerFromCharacter(character)!,
                        "Sekiro_Block",
                        "Hold",
                        "Reject",
                        true,
                    );
                    ServerSignals.LaunchVFX.except(
                        Players.GetPlayerFromCharacter(character)!,
                        "Sekiro",
                        "BlockStop",
                        ownerId,
                        character,
                        Workspace.GetServerTimeNow(),
                    );
                } else {
                    ServerSignals.LaunchVFX.broadcast(
                        "Sekiro",
                        "BlockStop",
                        ownerId,
                        character,
                        Workspace.GetServerTimeNow(),
                    );
                }

                print("Server_Block_Reject");
            },
        },
    );

    return ability;
}
