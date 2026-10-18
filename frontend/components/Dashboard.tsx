"use client";
import { useEffect, useMemo, useState } from "react";
import {
    ChartBarIcon,
    ClockIcon,
    FolderIcon,
    UserGroupIcon,
    TrashIcon,
    ArrowRightStartOnRectangleIcon
} from "@heroicons/react/24/outline";
import { api } from "@/lib/api";
import type { Entry, Project, Workspace } from "@/lib/types";
import { Timer, formatDuration } from "./Timer";

const day = ( date:string ) => new Intl.DateTimeFormat(
    "en", {
        weekday: "short",
        day: "numeric",
        month: "short"
    }
).format(new Date(date));

export function Dashboard () {
    const [ entries, setEntries ] = useState<Entry[]>([]),
    [ projects, setProjects ] = useState<Project[]>([]),
    [ workspaces, setWorkspaces ] = useState<Workspace[]>([]),
    [ tab, setTab ] = useState("Timer"),
    [ loading, setLoading ] = useState(true),
    [ error, setError ] = useState(""),
    [ adding, setAdding ] = useState<boolean>(false);

    async function load () {
        setLoading(true);
        try{
            const ws=await api.workspaces();
            if ( !localStorage.getItem("chrona_workspace") && ws[0]) {
                localStorage.setItem (
                    "chrona_workspace", String( ws[0].id )
                );setWorkspaces(ws);
            };
            const [ p,e ] = await Promise.all([api.projects(),api.entries()]);
            setProjects(p);
            setEntries(e);
        } catch ( err ) {
            setError( err instanceof Error?err.message: "Could not load workspace" )
        } finally {
            setLoading(false)
        }
    };

    useEffect( () => {
        load()
    }, []);

    const running = entries.find(e => !e.stop);
    const stopped = entries.filter(e => e.stop);
    const total = useMemo( 
        () => stopped.reduce( 
            (sum,e) => sum+e.duration_seconds,0
        ), [stopped] 
    );
    const grouped = Object.entries(
        Object.groupBy(
            stopped, e => day(e.start)
        )
    );

    async function start ( d:string, p:number|null ) {
        const created = await api.start(d,p);
        setEntries( v => [
            created,...v.map(
                e => e.stop ? e : {
                    ...e,stop:created.start
                }
            )
        ])
    };

    async function stop () {
        if ( !running ) return;
        const changed=await api.stop( running.id );
        setEntries( v => v.map( 
            e => e.id === changed.id ? changed:e 
        ))
    };

    async function remove ( id:number ) {
        await api.remove(id);
        setEntries(v=>v.filter(e=>e.id!==id));
    };

    function logout () {
        localStorage.removeItem("chrona_token");
        localStorage.removeItem("chrona_workspace");
        location.reload()
    };

    if ( loading ) return (
        <div
            className="min-h-screen grid place-items-center text-violet"
        >
            Loading your workspace…
        </div>
    );

    const handleEntryChange = () => {
        
    }
    
    return (
    <div className="min-h-screen md:flex">
        <aside
            className="
                md:w-64
                bg-ink
                text-white
                p-5
                md:min-h-screen
                flex
                md:flex-col
                gap-6
            "
        >
            <div className="text-xl font-bold px-2">
                ◒ MinuteMark
            </div>

            <nav className="flex md:flex-col gap-1 flex-1">
                {[
                    ["Timer", ClockIcon],
                    ["Reports", ChartBarIcon],
                    ["Projects", FolderIcon],
                    ["Team", UserGroupIcon],
                ].map(([name, Icon]) => (
                    <button
                        key={name as string}
                        onClick={() => setTab(name as string)}
                        className={`
                            flex
                            gap-3
                            items-center
                            px-3
                            py-2.5
                            rounded-xl
                            text-sm
                            ${
                                tab === name
                                    ? "bg-white/12 text-white"
                                    : "text-white/55 hover:text-white"
                            }
                        `}
                    >
                        <Icon className="w-5" />
                        {name as string}
                    </button>
                ))}
            </nav>

            <button
                onClick={logout}
                className="
                    hidden
                    md:flex
                    gap-3
                    items-center
                    text-white/50
                    px-3
                    text-sm
                "
            >
                <ArrowRightStartOnRectangleIcon className="w-5" />
                Sign out
            </button>
        </aside>

        <main className="flex-1 p-5 md:p-10 max-w-6xl mx-auto w-full">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <p
                        className="
                            text-xs
                            font-bold
                            tracking-[.2em]
                            text-violet
                            uppercase
                        "
                    >
                        {workspaces[0]?.name || "Team workspace"}
                    </p>

                    <h1 className="text-3xl md:text-4xl font-semibold mt-2">
                        {tab}
                    </h1>
                </div>

                <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                        This week
                    </p>

                    <p className="font-mono text-xl">
                        {formatDuration(total)}
                    </p>
                </div>
            </header>

            {error && (
                <p className="bg-red-50 text-red-700 p-3 rounded-xl mb-5">
                    {error}
                </p>
            )}

            {tab === "Timer" && (
                <>
                    <Timer
                        running={running}
                        projects={projects}
                        onStart={start}
                        onStop={stop}
                    />

                    <section className="mt-10">
                        {/* Management buuttons here to add new project or workspaces */}
                        <div
                            className="flex"
                        >
                            <button type="button">
                                Create Workspace
                            </button>
                            <button type="button">
                                Add Project
                            </button>
                            <button 
                                type="button"
                                onClick={() => setAdding(!adding)}
                            >
                                Add Entry
                            </button>
                            {adding === true &&(
                                <div>
                                    <label>
                                        <input 
                                            type="date"
                                            name="start-date"
                                            value={}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="mt-10">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold text-xl">
                                Recent entries
                            </h2>

                            <span className="text-sm text-slate-400">
                                {stopped.length} entries
                            </span>
                        </div>

                        {grouped.length === 0 ? (
                            <Empty text="Your tracked time will appear here." />
                        ) : (
                            grouped.map(([label, items]) => (
                                <div
                                    key={label}
                                    className="mb-6"
                                >
                                    <div
                                        className="
                                            flex
                                            justify-between
                                            text-xs
                                            font-bold
                                            uppercase
                                            tracking-wider
                                            text-slate-400
                                            mb-2
                                            px-2
                                        "
                                    >
                                        <span>{label}</span>

                                        <span>
                                            {formatDuration(
                                                items!.reduce(
                                                    (sum, entry) =>
                                                        sum +
                                                        entry.duration_seconds,
                                                    0
                                                )
                                            )}
                                        </span>
                                    </div>

                                    <div
                                        className="
                                            bg-white
                                            rounded-2xl
                                            shadow-soft
                                            divide-y
                                            divide-slate-100
                                        "
                                    >
                                        {items!.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="
                                                    p-4
                                                    flex
                                                    items-center
                                                    gap-4
                                                "
                                            >
                                                <span
                                                    className="
                                                        w-2.5
                                                        h-2.5
                                                        rounded-full
                                                    "
                                                    style={{
                                                        background:
                                                            entry.project_color ||
                                                            "#94a3b8",
                                                    }}
                                                />

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">
                                                        {entry.description ||
                                                            "Untitled"}
                                                    </p>

                                                    <p className="text-sm text-slate-400">
                                                        {entry.project_name ||
                                                            "No project"}
                                                    </p>
                                                </div>

                                                <span className="font-mono text-sm">
                                                    {formatDuration(
                                                        entry.duration_seconds
                                                    )}
                                                </span>

                                                <button
                                                    aria-label="Delete entry"
                                                    onClick={() =>
                                                        remove(entry.id)
                                                    }
                                                    className="
                                                        text-slate-300
                                                        hover:text-coral
                                                    "
                                                >
                                                    <TrashIcon className="w-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </section>
                </>
            )}

            {tab === "Reports" && (
                <section className="grid md:grid-cols-3 gap-5">
                    <Stat
                        label="Tracked this week"
                        value={formatDuration(total)}
                    />

                    <Stat
                        label="Completed entries"
                        value={String(stopped.length)}
                    />

                    <Stat
                        label="Active projects"
                        value={String(
                            projects.filter((project) => !project.archived)
                                .length
                        )}
                    />

                    <div
                        className="
                            md:col-span-3
                            bg-white
                            p-8
                            rounded-2xl
                            shadow-soft
                        "
                    >
                        <h2 className="font-semibold text-xl">
                            Project split
                        </h2>

                        <div className="mt-6 space-y-4">
                            {projects.map((project) => {
                                const seconds = stopped
                                    .filter(
                                        (entry) =>
                                            entry.project === project.id
                                    )
                                    .reduce(
                                        (sum, entry) =>
                                            sum + entry.duration_seconds,
                                        0
                                    );

                                return (
                                    <div key={project.id}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span>{project.name}</span>

                                            <span className="font-mono">
                                                {formatDuration(seconds)}
                                            </span>
                                        </div>

                                        <div className="h-2 bg-paper rounded-full">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${
                                                        total
                                                            ? (seconds /
                                                                  total) *
                                                              100
                                                            : 0
                                                    }%`,
                                                    background: project.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {tab === "Projects" && (
                <div className="bg-white rounded-2xl shadow-soft p-6">
                    <h2 className="font-semibold text-xl mb-5">
                        Projects
                    </h2>

                    {projects.length ? (
                        projects.map((project) => (
                            <div
                                key={project.id}
                                className="
                                    flex
                                    items-center
                                    gap-3
                                    py-3
                                    border-b
                                    last:border-0
                                "
                            >
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                        background: project.color,
                                    }}
                                />

                                <span className="font-medium">
                                    {project.name}
                                </span>
                            </div>
                        ))
                    ) : (
                        <Empty text="Create projects through the API or Django admin in this beta." />
                    )}
                </div>
            )}

            {tab === "Team" && (
                <Team
                    workspace={workspaces[0]}
                    onUpdate={load}
                />
            )}
        </main>
    </div>
);}

function Empty ( {text}: {text:string} ) {
    return <div className="bg-white rounded-2xl p-12 text-center text-slate-400 shadow-soft">{text}</div>};function Stat({label,value}:{label:string;value:string}){return <div className="bg-white p-6 rounded-2xl shadow-soft"><p className="text-sm text-slate-400">{label}</p><p className="text-3xl font-semibold mt-2">{value}</p></div>}
function Team (
    {workspace,onUpdate}: {
        workspace?:Workspace;onUpdate:()=>void
    } 
) {
    const [email,setEmail]=useState(""),
    [message,setMessage]=useState("");
    async function invite () {
        if ( !workspace ) {return};
        try {
            await api.invite(workspace.id,email);
            setMessage("Team member added.");
            setEmail("");
            onUpdate();
        } catch (e) {
            setMessage ( e instanceof Error ? e.message: "Could not add member")
        }
    };
    return (
        <div className="grid md:grid-cols-[1fr_340px] gap-6">
            <section className="bg-white p-6 rounded-2xl shadow-soft">
                <h2 className="font-semibold text-xl mb-4">People</h2>
                { workspace?.memberships.map( m => (
                    <div key={m.id} className="flex justify-between border-b last:border-0 py-4">
                        <div>
                            <p className="font-medium">
                                {m.username}
                            </p>
                            <p className="text-sm text-slate-400">
                                {m.email}
                            </p>
                        </div>
                        <span className="text-xs uppercase tracking-wider text-violet bg-violet/10 self-center px-2 py-1 rounded-full">
                            {m.role}
                        </span>
                    </div>
                ))}
            </section>
            <aside className="bg-white p-6 rounded-2xl shadow-soft h-fit">
                <h2 className="font-semibold">
                    Add a teammate
                </h2>
                <p className="text-sm text-slate-400 my-2">
                    They must create an account first.
                </p>
                <input 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} 
                    type="email"
                    placeholder="teammate@example.com"
                    className="border rounded-xl px-3 py-2.5 w-full mt-3"
                />
                <button
                    onClick={invite}
                    className="bg-violet text-white rounded-xl py-2.5 w-full mt-3 font-medium"
                >
                    Add to workspace
                </button>
                {message && (
                    <p className="text-sm mt-3 text-slate-500">
                        {message}
                    </p>
                )}
            </aside>
        </div>
    );
}
