import { Players } from "@rbxts/services";

import { Controller, OnStart } from "@flamework/core";
import { ClientSignals } from "shared/Implementation/Entities/ClientSignals";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";

let sharedScope = CompositionRootShared.createScope();

@Controller()
export class AbilitiesSignal implements OnStart {
    public player = Players.LocalPlayer;
    public playerStringUserId = tostring(this.player.UserId);

    onStart(): void {
        let abilityAPI = sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI);

        ClientSignals.Ability.connect(
            (
                abilityName: string,
                abilityType: string,
                method: "Start" | "End" | "Reject" | "Interrupt",
                check?: boolean,
                ...args: unknown[]
            ) => {
                let ability = abilityAPI.Get(this.playerStringUserId, abilityName);

                if (!ability) {
                    warn(
                        `${abilityName} does not exist in ${this.playerStringUserId}, ${abilityAPI.GetAllAbilities(this.playerStringUserId)}`,
                    );
                    return;
                }

                if (abilityType === "Hold") {
                    if (method === "Start") {
                        ability.AddState("Holding");
                    } else {
                        ability.RemoveState("Holding");
                    }
                }

                if (method === "Reject") {
                    abilityAPI.Reject(ability, ...args);
                } else if (method === "Interrupt") {
                    abilityAPI.Interrupt(ability, ...args);
                } else {
                    abilityAPI.Execute(ability, method, true, ...args);
                }
            },
        );
    }
}
