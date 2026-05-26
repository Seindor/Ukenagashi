import { Players } from "@rbxts/services";
import { Controller, Dependency, OnStart } from "@flamework/core";

import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";

import { Client_SetupAbilities } from "shared/Implementation/Handlers/Client_SetupAbilities";
import { ClientSignals } from "shared/Implementation/Entities/ClientSignals";

const sharedScope = CompositionRootShared.createScope();

@Controller()
export class AbilitiesInputs implements OnStart {
    onStart(): void {
        const player = Players.LocalPlayer;
        const playerStringId = tostring(player.UserId);

        const abilityAPI = sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI);
        const eventBusAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EventBusAPI);

        const inputsBus = eventBusAPI.New(playerStringId, "Inputs");

        const setupAbilities = Dependency<Client_SetupAbilities>();

        inputsBus.Subscribe(
            "InputPressed",
            (inputName: string, inputState: Enum.UserInputState, inputObject: InputObject) => {
                const state =
                    inputState === Enum.UserInputState.Begin ? "Start" : ("End" as "Start" | "End");

                for (const pack of setupAbilities.currentPacks) {
                    for (const [_, entry] of pairs(pack)) {
                        if (entry.key !== inputName) continue;

                        if (state === "Start") {
                            if (entry.type === "Hold") {
                                entry.ability?.AddState("Holding");
                            }
                        } else {
                            if (entry.type === "Hold") {
                                entry.ability?.RemoveState("Holding");
                            }

                            if (entry.type === "Switch") continue;
                        }

                        if (entry.activatingType === "Manual") {
                            if (!entry.ability) continue;

                            abilityAPI.Execute(entry.ability, state, true, inputObject);
                        } else {
                            ClientSignals.Ability.fire(entry.abilityName, entry.type, state);
                        }
                    }
                }
            },
            undefined,
            "AbilityInputs",
        );
    }
}
