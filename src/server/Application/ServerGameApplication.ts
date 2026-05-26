import { Workspace } from "@rbxts/services";

import { Dependency, OnStart, Service } from "@flamework/core";
import { AccessoryQualityFixHandler } from "server/Implementation/Handlers/AccessoryQualityFixHandler";
import { StepRunner } from "./StepRunner";
import { Blocking_Dummy } from "server/Implementation/Handlers/Blocking_Dummy";
import { Dummy } from "server/Implementation/Handlers/Dummy";
import { Attack_Dummy } from "server/Implementation/Handlers/Attack_Dummy";

let NPCs = Workspace.WaitForChild("Map")!.WaitForChild("NPCs");

@Service()
export class ServerGameApplication implements OnStart {
    onStart(): void {
        new AccessoryQualityFixHandler();
        Dependency<StepRunner>();

        new Blocking_Dummy(NPCs.WaitForChild("Blocking_Dummy")! as Model);
        new Dummy(NPCs.WaitForChild("Dummy")! as Model);
        // new Attack_Dummy(NPCs.WaitForChild("Attack_Dummy")! as Model);
    }
}
