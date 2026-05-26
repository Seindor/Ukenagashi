import { Players } from "@rbxts/services";
import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { Dependency, Service } from "@flamework/core";
import { CreatePack } from "../Entities/Abilities/CreatePack";
import { AbilityAggregate } from "shared/Domain/Ability/Aggregates/AbilityAggregate";

const sharedScope = CompositionRootShared.createScope();

import { PackResult } from "../Entities/Abilities/CreatePack";
import { ServerAtomReplication } from "server/Application/ServerAtomReplication";

export class Server_SetupAbilities {
    public api = {
        eventBusAPI: sharedScope.resolve(SharedRegistry.Singletons.API.EventBusAPI),
        abilityAPI: sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI),
    };

    public currentPacks = [] as PackResult[];

    constructor(player: Player) {
        task.spawn(() => {
            let playerStringUserId = tostring(player.UserId);

            const atomReplication = Dependency<ServerAtomReplication>();

            while (!atomReplication.IsPlayerFullyReady(playerStringUserId)) {
                task.wait();
            }

            const playerData = atomReplication.GetPlayersDataAtom().Get(playerStringUserId)!;

            for (const pack of this.currentPacks) {
                const keys = [] as string[];

                for (const [key] of pairs(pack)) {
                    keys.push(key);
                }

                for (const key of keys) {
                    const ability = pack[key];

                    if (ability?.ability) {
                        this.api.abilityAPI.Remove(playerStringUserId, ability.ability.config.name);

                        delete pack[key];
                    }
                }
            }

            this.currentPacks.push(
                CreatePack(playerData.Equipment.Character.Name, playerStringUserId),
            );
            this.currentPacks.push(CreatePack("Default", playerStringUserId));
        });
    }
}
