export type Project = {
    id: number;
    name: string;
    color: string;
    archived: boolean
};

export type Entry = {
    id: number;
    description: string;
    project: number | null;
    project_name?: string;
    project_color?: string;
    owner_name?: string;
    start: string;
    stop: string | null;
    duration_seconds: number
};

export type Member = {
    id: number;
    user: number;
    username: string;
    email: string;
    role: "owner" | "admin" | "member"
};

export type Workspace = {
    id: number;
    name: string;
    memberships: Member[]
};
