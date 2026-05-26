export interface PhaseResolverContext {
    miscData: Map<string, unknown>;
}

export type PhaseResolverEmitFn = (effect: {
    effectType: string;
    queuePriority: number;
    payload?: unknown;
}) => void;

export interface PhaseResolverPhase<TContext extends PhaseResolverContext> {
    name: string;
    priority: number;

    onCheck: (ctx: TContext) => boolean;
    onSuccess: (ctx: TContext, emit: PhaseResolverEmitFn) => void;
    onRejected?: (ctx: TContext) => void;

    [key: string]: unknown;
}

export interface PhaseResolverProperties<TContext extends PhaseResolverContext> {
    ownerId: string;
    resolverName: string;
    phases?: PhaseResolverPhase<TContext>[];
}

export interface PhaseResolverResult<TContext extends PhaseResolverContext> {
    resolved: boolean;
    phaseName: string | undefined;
    context: TContext;
}
