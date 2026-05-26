import { ReplicatedStorage, ServerScriptService, StarterPlayer } from "@rbxts/services";

function ResolveRoot(rootName: string): Instance | undefined {
    if (rootName === "shared") {
        return ReplicatedStorage.FindFirstChild("TS");
    }

    if (rootName === "server") {
        return ServerScriptService.FindFirstChild("TS");
    }

    if (rootName === "client") {
        const starterPlayerScripts = StarterPlayer.FindFirstChild("StarterPlayerScripts");
        if (!starterPlayerScripts) return undefined;

        return starterPlayerScripts.FindFirstChild("TS");
    }

    return undefined;
}

function ResolveRobloxRoot(rootName: string): Instance | undefined {
    if (rootName === "shared") {
        return ReplicatedStorage;
    }

    if (rootName === "server") {
        return ServerScriptService;
    }

    if (rootName === "client") {
        const starterPlayerScripts = StarterPlayer.FindFirstChild("StarterPlayerScripts");
        if (!starterPlayerScripts) return undefined;

        return starterPlayerScripts;
    }

    return undefined;
}

export function ParseRobloxAliasPath(path: string): Instance | undefined {
    const parts = path.split(".");
    if (parts.size() === 0) return undefined;

    const root = ResolveRobloxRoot(parts[0]);
    if (!root) {
        warn(`Unknown or missing root alias: ${parts[0]}`);
        return undefined;
    }

    let current: Instance = root;

    for (let i = 1; i < parts.size(); i++) {
        const nextChild = current.WaitForChild(parts[i]);
        if (!nextChild) {
            warn(`Path not found: ${path} (missing ${parts[i]})`);
            return undefined;
        }
        current = nextChild;
    }

    return current;
}

export function ParseAliasPath(path: string): Instance | undefined {
    const parts = path.split(".");
    if (parts.size() === 0) return undefined;

    const root = ResolveRoot(parts[0]);
    if (!root) {
        warn(`Unknown or missing root alias: ${parts[0]}`);
        return undefined;
    }

    let current: Instance = root;

    for (let i = 1; i < parts.size(); i++) {
        const nextChild = current.FindFirstChild(parts[i]);
        if (!nextChild) {
            warn(`Path not found: ${path} (missing ${parts[i]})`);
            return undefined;
        }
        current = nextChild;
    }

    return current;
}

export function ParseAliasModulePath(path: string): ModuleScript | undefined {
    const found = ParseAliasPath(path);
    if (found && found.IsA("ModuleScript")) {
        return found;
    }
    return undefined;
}
