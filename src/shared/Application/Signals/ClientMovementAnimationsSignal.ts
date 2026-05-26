import { Controller, OnStart } from "@flamework/core";
import { ClientSignals } from "shared/Implementation/Entities/ClientSignals";
import { Client_MovementAnimations } from "shared/Implementation/Handlers/Client_MovementAnimations";

@Controller()
export class ClientMovementAnimationsSignal implements OnStart {
    onStart(): void {
        ClientSignals.SetupMovementAnimations.connect((ownerId: string, character: Model) => {
            let client_MovementAnimations = new Client_MovementAnimations();
            client_MovementAnimations.Init(ownerId, character);
        });
    }
}
