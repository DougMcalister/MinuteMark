"use client";

import { useEffect, useState } from "react";
import type { Entry, Project } from "@/lib/types";

export const formatDuration = ( seconds:number ) => {
    const h = Math.floor(seconds/3600),
    m = Math.floor(seconds%3600/60),
    s = seconds % 60;

    const hour = String(h).padStart(2,"0")
    const min = String(m).padStart(2,"0")
    const sec = String(s).padStart(2,"0")

    return (
        `${hour}:${min}:${sec}`
    )
};

export function Timer ({
    running,
    projects,
    onStart,
    onStop 
} : {
    running? : Entry;
    projects : Project[];
    onStart : ( d:string, p:number | null ) => void;
    onStop : () => void
}) {
    const [ description, setDescription ] = useState<string>(""),
    [ project, setProject ] = useState<string>(""),
    [ now, setNow] = useState(Date.now());
    useEffect ( () => {
        const id = setInterval( () => setNow(Date.now()), 1000);
        return () => clearInterval(id)}
        ,[]
    );
    const elapsed = running ? Math.max(
        0,
        Math.floor(
            (now-new Date(running.start).getTime())/1000
        )
    ) : 0;
    return (
        <div 
            className="
                bg-white
                rounded-2xl
                shadow-soft
                p-3 flex
                flex-col
                md:flex-row
                gap-3
                items-stretch
                md:items-center
            "
        >
            <input 
                aria-label="What are you working on?" 
                value={running?.description ?? description} 
                disabled={!!running} 
                onChange={
                    e=>setDescription(e.target.value)
                } 
                placeholder="What are you working on?" 
                className="
                    flex-1 
                    px-3 py-3
                    outline-none
                    text-lg
                    font-medium
                "
            />
            <select 
                aria-label="Project" 
                value={running?.project ?? project} 
                disabled={!!running} 
                onChange={
                    e=>setProject(e.target.value)
                } 
                className="
                    text-sm 
                    px-3 py-3 
                    rounded-xl bg-paper 
                    text-slate-600
                    "
                >
                <option value="">
                    No project
                </option>
                {projects.filter( p => !p.archived ).map( p => (
                    <option value={p.id} key={p.id}>
                        {p.name}
                    </option>
                ))}
            </select>
            <span 
                aria-label="Elapsed time"
                className="
                    font-mono
                    text-xl 
                    px-3 
                    text-center
                "
            >
                {formatDuration(elapsed)}
            </span>
            <button 
                onClick={
                    () => running ? onStop() 
                    : onStart(
                        description, project 
                        ? Number(project) : null
                    )
                } className={
                    `rounded-xl 
                    px-7 py-3 
                    font-semibold 
                    text-white 
                    ${running?"bg-coral" : "bg-violet"}`
                } > {running?"Stop":"Start"}
            </button>
        </div>
    )
}
