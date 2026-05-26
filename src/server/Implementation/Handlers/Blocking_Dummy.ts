import { CreatePack, PackResult } from "../Entities/Abilities/CreatePack";
import { InitSolvers } from "../Entities/Solvers";
import { Server_CharacterHandler } from "./Server_CharacterHandler";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { ServerRegistry } from "server/DI/Generated/ServerRegistry";
import { CompositionRootServer } from "server/DI/CompositionRootServer";

let sharedScope = CompositionRootShared.createScope();
let serverScope = CompositionRootServer.createScope();

export class Blocking_Dummy {
    constructor(npc: Model) {
        let abilityAPI = sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI);
        let statusEffectsAPI = serverScope.resolve(ServerRegistry.Singletons.API.StatusEffectsAPI);

        statusEffectsAPI.InitActor("Blocking_Dummy");

        new Server_CharacterHandler(npc, "Blocking_Dummy", "Sekiro");

        InitSolvers("Blocking_Dummy");
        let Pack = CreatePack("Sekiro", "Blocking_Dummy");
        let Block = Pack["Block"];
        abilityAPI.Execute(Block.ability!, "Start", true);
    }
}
