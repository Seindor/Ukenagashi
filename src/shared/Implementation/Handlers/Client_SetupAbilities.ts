import { Players } from "@rbxts/services";
import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { Controller, Dependency, OnStart } from "@flamework/core";
import { ClientAtomReplication } from "shared/Application/ClientAtomReplication";
import { CreatePack } from "../Entities/Abilities/CreatePack";
import { AbilityAggregate } from "shared/Domain/Ability/Aggregates/AbilityAggregate";

const sharedScope = CompositionRootShared.createScope();

import { PackResult } from "../Entities/Abilities/CreatePack";

@Controller()
export class Client_SetupAbilities implements OnStart {
    public player = Players.LocalPlayer;
    public playerStringUserId = tostring(this.player.UserId);

    public api = {
        eventBusAPI: sharedScope.resolve(SharedRegistry.Singletons.API.EventBusAPI),
        abilityAPI: sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI),
    };

    public buses = {
        playerBus: this.api.eventBusAPI.New(this.playerStringUserId, "Player"),
    };

    public currentPacks = [] as PackResult[];

    onStart(): void {
        this.buses.playerBus.Subscribe(
            "CharacterLoaded",
            (character: Model) => {
                const atomReplication = Dependency<ClientAtomReplication>();
                const playerData = atomReplication.GetLocalPlayerData()!;

                for (const pack of this.currentPacks) {
                    const keys = [] as string[];

                    for (const [key] of pairs(pack)) {
                        keys.push(key);
                    }

                    for (const key of keys) {
                        const ability = pack[key];

                        if (ability?.ability) {
                            this.api.abilityAPI.Remove(
                                this.playerStringUserId,
                                ability.ability.config.name,
                            );

                            delete pack[key];
                        }
                    }
                }

                this.currentPacks.push(CreatePack("Default", this.playerStringUserId));
                this.currentPacks.push(
                    CreatePack(playerData.Equipment.Character.Name, this.playerStringUserId),
                );
            },
            undefined,
            "SetupAbilities",
        );
    }
}
