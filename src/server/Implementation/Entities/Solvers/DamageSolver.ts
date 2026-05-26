import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { SoundsUtil } from "shared/Utilities/SoundsUtil";

const SharedScope = CompositionRootShared.createScope();

const SolverAPI = SharedScope.resolve(SharedRegistry.Singletons.API.SolverAPI);

export const CreateDamageSolver = (ownerId: string) => {
    let Damage = SolverAPI.CreateSolver({
        solverName: `Damage_Solver_${ownerId}`,
        phases: [
            {
                name: "Flat",
                algorithm: "Flat",
                subAlgorithm: "Add",
                priority: 1,
            },
            {
                name: "Addative",
                algorithm: "Expression_Add",
                subAlgorithm: "Multiply",
                priority: 2,
            },
            {
                name: "ExpressionMultiplier",
                algorithm: "Expression_Mult",
                subAlgorithm: "Multiply",
                priority: 3,
            },
            {
                name: "Crit",
                algorithm: "Expression_Add",
                subAlgorithm: "Multiply",
                priority: 4,
            },
            {
                name: "FinalMultiplier",
                algorithm: "Expression_Add",
                subAlgorithm: "Multiply",
                priority: 5,
            },
        ],
    });
    return Damage;
};
