import { CreatePack, PackResult } from "../Entities/Abilities/CreatePack";
import { InitSolvers } from "../Entities/Solvers";
import { Server_CharacterHandler } from "./Server_CharacterHandler";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { ServerRegistry } from "server/DI/Generated/ServerRegistry";
import { CompositionRootServer } from "server/DI/CompositionRootServer";

let sharedScope = CompositionRootShared.createScope();
let serverScope = CompositionRootServer.createScope();

export class Dummy {
    constructor(npc: Model) {
        let abilityAPI = sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI);
        let statusEffectsAPI = serverScope.resolve(ServerRegistry.Singletons.API.StatusEffectsAPI);

        statusEffectsAPI.InitActor("Dummy");

        new Server_CharacterHandler(npc, "Dummy", "Sekiro");

        InitSolvers("Dummy");
        let Pack = CreatePack("Sekiro", "Dummy");
    }
}
