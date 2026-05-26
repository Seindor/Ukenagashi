import { Controller, OnStart, Dependency } from "@flamework/core";
import { subscribe } from "@rbxts/charm";

import { ClientAtomReplication } from "./ClientAtomReplication";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";

const sharedScope = CompositionRootShared.createScope();

const replicatedStatusEffectsAPI = sharedScope.resolve(
    SharedRegistry.Singletons.API.ReplicatedStatusEffectsAPI,
);

@Controller()
export class ClientStatusEffectsReplication implements OnStart {
    onStart() {
        const atomReplication = Dependency<ClientAtomReplication>();
        const atom = atomReplication.GetStatusEffectsAtom();

        subscribe(atom.GetAtom(), (state) => {
            for (const [actorId, statuses] of pairs(state)) {
                // print(`${actorId} has RecievedStatuses:`, statuses);

                replicatedStatusEffectsAPI.Set(actorId, statuses);

                // print(
                //     `${actorId} has ReplicatedStatusEffects:`,
                //     replicatedStatusEffectsAPI.GetReplicatedStatuses(actorId),
                // );
            }
        });
    }
}
