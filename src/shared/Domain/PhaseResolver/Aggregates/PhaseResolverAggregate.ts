import {
    PhaseResolverContext,
    PhaseResolverEmitFn,
    PhaseResolverPhase,
    PhaseResolverProperties,
    PhaseResolverResult,
} from "../Types/PhaseResolverTypes";

const noopEmit: PhaseResolverEmitFn = () => {};

export class PhaseResolverAggregate<TContext extends PhaseResolverContext> {
    public ownerId: string;
    public resolverName: string;

    private phases: PhaseResolverPhase<TContext>[] = [];

    constructor(properties: PhaseResolverProperties<TContext>) {
        this.ownerId = properties.ownerId;
        this.resolverName = properties.resolverName;

        if (properties.phases) {
            for (const phase of properties.phases) {
                this.AddPhase(phase);
            }
        }
    }

    public AddPhase(phase: PhaseResolverPhase<TContext>) {
        const existing = this.phases.findIndex((p) => p.name === phase.name);

        if (existing !== -1) {
            warn(
                `Phase "${phase.name}" already exists in resolver "${this.resolverName}", overwriting.`,
            );
            this.phases[existing] = phase;
        } else {
            this.phases.push(phase);
        }

        this.phases.sort((a, b) => a.priority > b.priority);
    }

    public RemovePhase(phaseName: string) {
        const index = this.phases.findIndex((p) => p.name === phaseName);

        if (index === -1) {
            warn(`Phase "${phaseName}" not found in resolver "${this.resolverName}".`);
            return;
        }

        this.phases.remove(index);
    }

    public HasPhase(phaseName: string): boolean {
        return this.phases.some((p) => p.name === phaseName);
    }

    public GetPhase(phaseName: string): PhaseResolverPhase<TContext> | undefined {
        return this.phases.find((p) => p.name === phaseName);
    }

    public GetPhases(): PhaseResolverPhase<TContext>[] {
        return [...this.phases];
    }

    public Resolve(ctx: TContext, emit?: PhaseResolverEmitFn): PhaseResolverResult<TContext> {
        const resolvedEmit = emit ?? noopEmit;

        for (const phase of this.phases) {
            const passed = phase.onCheck(ctx);

            if (passed) {
                phase.onSuccess(ctx, resolvedEmit);

                return {
                    resolved: true,
                    phaseName: phase.name,
                    context: ctx,
                };
            } else {
                phase.onRejected?.(ctx);
            }
        }

        return {
            resolved: false,
            phaseName: undefined,
            context: ctx,
        };
    }

    public Destroy() {
        this.phases = [];
    }
}
