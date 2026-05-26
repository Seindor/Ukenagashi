import { CreateDamageSolver } from "./DamageSolver";

export const InitSolvers = (ownerId: string) => {
    let damageSolver = CreateDamageSolver(ownerId);

    return { damageSolver };
};
