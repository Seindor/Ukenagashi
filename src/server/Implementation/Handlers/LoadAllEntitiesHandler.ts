import { Players } from "@rbxts/services";

import { Dependency } from "@flamework/core";

import { ServerAtomReplication } from "server/Application/ServerAtomReplication";
import { ServerSignals } from "shared/Implementation/Entities/SerrverSignals";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { ServerRegistry } from "server/DI/Generated/ServerRegistry";
import { CompositionRootServer } from "server/DI/CompositionRootServer";

let sharedScope = CompositionRootShared.createScope();
let serverScope = CompositionRootServer.createScope();

let statusEffectsAPI = serverScope.resolve(ServerRegistry.Singletons.API.StatusEffectsAPI);

export class LoadAllEntitiesHandler {
    constructor(player: Player) {
        let entitiesStorageAPI = sharedScope.resolve(
            SharedRegistry.Singletons.API.EntitiesStorageAPI,
        );
        let entities = entitiesStorageAPI.GetEntities();

        for (const [name, entity] of entities) {
            if (Players.GetPlayerFromCharacter(entity.entity as Model)) {
                if (player.Character === entity.entity) continue;
                task.spawn(() => {
                    const atomReplication = Dependency<ServerAtomReplication>();

                    while (!atomReplication.IsPlayerFullyReady(name)) {
                        task.wait();
                    }

                    let entityPlayerData = atomReplication.GetPlayersDataAtom().Get(name);

                    while (statusEffectsAPI.CheckStatuses(entity.id, ["Loading"])) {
                        task.wait();
                    }

                    if (entityPlayerData) {
                        ServerSignals.LaunchVFX.fire(
                            player,
                            entityPlayerData.Equipment.Character.Name,
                            "Spawn",

                            entity.id,
                            entity.entity,
                        );

                        task.wait(0.5);

                        if (entity.miscData.has("LastLaunchedVFX")) {
                            const raw = entity.miscData.get("LastLaunchedVFX");

                            if (typeIs(raw, "table")) {
                                const args = raw as unknown[];

                                if (typeIs(args, "table") && args.size() > 0) {
                                    const fn = ServerSignals.LaunchVFX.fire as unknown as (
                                        ...a: unknown[]
                                    ) => void;

                                    fn(fn, player, ...args);
                                }
                            }
                        }
                    }
                });
            } else {
                let character = entity.entity as Model;
                let characterName = entity.miscData.get("CharacterName") as string;

                if (!character) continue;
                if (!characterName) continue;

                task.spawn(() => {
                    while (statusEffectsAPI.CheckStatuses(entity.id, ["Loading"])) {
                        task.wait();
                    }

                    ServerSignals.SetupMovementAnimations(player, entity.id, character);
                    ServerSignals.LaunchVFX.fire(
                        player,
                        characterName,
                        "Spawn",

                        entity.id,
                        entity.entity,
                    );

                    task.wait(0.5);

                    if (entity.miscData.has("LastLaunchedVFX")) {
                        const raw = entity.miscData.get("LastLaunchedVFX");

                        if (typeIs(raw, "table")) {
                            const args = raw as unknown[];

                            if (typeIs(args, "table") && args.size() > 0) {
                                const fn = ServerSignals.LaunchVFX.fire as unknown as (
                                    ...a: unknown[]
                                ) => void;

                                fn(fn, player, ...args);
                            }
                        }
                    }
                });
            }
        }
    }
}
