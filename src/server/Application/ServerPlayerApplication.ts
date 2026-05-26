import { Players, Workspace } from "@rbxts/services";
import { Dependency, OnStart, Service } from "@flamework/core";

import { DataHandler } from "server/Implementation/Handlers/DataHandler";
import { ServerAtomReplication } from "./ServerAtomReplication";

import { Server_CharacterHandler } from "server/Implementation/Handlers/Server_CharacterHandler";
import { StatusEffectsReplication } from "./StatusEffectsReplication";
import { Server_SetupAbilities } from "server/Implementation/Handlers/Server_SetupAbilities";
import { LoadAllEntitiesHandler } from "server/Implementation/Handlers/LoadAllEntitiesHandler";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";

import { ServerRegistry } from "server/DI/Generated/ServerRegistry";
import { CompositionRootServer } from "server/DI/CompositionRootServer";
import { InitSolvers } from "server/Implementation/Entities/Solvers";

let sharedScope = CompositionRootShared.createScope();
let serverScope = CompositionRootServer.createScope();

@Service()
export class ServerPlayerApplication implements OnStart {
    private readonly dataHandlers = new Map<Player, DataHandler>();
    public api = {
        abilitiesAPI: sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI),
        statusEffectsAPI: serverScope.resolve(ServerRegistry.Singletons.API.StatusEffectsAPI),
        entitiesStorageAPI: sharedScope.resolve(SharedRegistry.Singletons.API.EntitiesStorageAPI),
    };

    public onStart(): void {
        const statusReplication = Dependency<StatusEffectsReplication>();

        Players.PlayerAdded.Connect((player) => {
            const userId = tostring(player.UserId);

            this.api.statusEffectsAPI.service.OnChanged = (actorId, statuses) => {
                statusReplication.Sync(actorId, statuses);
            };

            InitSolvers(userId);
            new LoadAllEntitiesHandler(player);

            this.api.abilitiesAPI.initActor(userId);
            this.api.statusEffectsAPI.InitActor(userId);
            this.api.statusEffectsAPI.CreateStatus(
                "Loading",
                { duration: math.huge, priority: math.huge },
                true,
                userId,
            );

            player.CharacterAdded.Connect((character: Model) => {
                new Server_CharacterHandler(character);
                new Server_SetupAbilities(player);
            });

            const dataHandler = new DataHandler(player);

            if (!dataHandler.Load()) {
                return;
            }

            this.dataHandlers.set(player, dataHandler);

            task.spawn(() => {
                const atomReplication = Dependency<ServerAtomReplication>();
                while (!atomReplication.IsPlayerFullyReady(userId)) {
                    task.wait();
                }
            });
        });

        Players.PlayerRemoving.Connect((player) => {
            const dataHandler = this.dataHandlers.get(player);

            if (dataHandler) {
                dataHandler.Release();
                this.dataHandlers.delete(player);
            }
        });
    }

    public GetDataHandler(player: Player): DataHandler | undefined {
        return this.dataHandlers.get(player);
    }

    public GetDataHandlerOrThrow(player: Player): DataHandler {
        const dataHandler = this.GetDataHandler(player);

        if (!dataHandler) {
            error(`DataHandler for ${player.Name} does not exist.`);
        }

        return dataHandler;
    }
}
